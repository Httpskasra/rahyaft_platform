import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { endpoints, readEndpoints, writeEndpoints, type EndpointDefinition } from './endpoints.js';
import { getLiveSettings, validateLiveSettings } from './config.js';
import { hashBody, safeHeaders, sanitize } from './sanitize.js';

type Command = 'probe' | 'capture' | 'verify';
interface CaptureRecord {
  endpoint: string;
  method: 'POST';
  url: string;
  requestId: string;
  request: unknown;
  status: number | null;
  responseHeaders: Record<string, string | null>;
  response: unknown;
  rawBodySha256: string | null;
  durationMs: number;
  capturedAt: string;
  verified: boolean;
  sourcePage: number;
  error?: string;
}

const command = (process.argv[2] ?? 'probe') as Command;
if (!['probe', 'capture', 'verify'].includes(command)) throw new Error(`Unknown command: ${command}`);

const { settings, missing } = validateLiveSettings();
if (missing.length) throw new Error(`Missing required settings: ${missing.join(', ')}`);
if (!/^https?:\/\//i.test(settings.baseUrl)) throw new Error('SHAYGAN_API_BASE_URL must start with http:// or https://');
if (settings.allowWrites) throw new Error('Live write tests are intentionally not implemented. Keep SHAYGAN_ALLOW_WRITE_TESTS=false.');

const requestedRunId = process.env.SHAYGAN_RUN_ID?.trim();
const runId = requestedRunId && /^[A-Za-z0-9_-]+$/.test(requestedRunId)
  ? requestedRunId
  : new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.resolve('captures', 'runs', runId);
await mkdir(runDir, { recursive: true });

function bodyFor(endpoint: EndpointDefinition) {
  return { Config: settings.config, Domain: {} };
}

async function post(endpoint: EndpointDefinition): Promise<CaptureRecord> {
  const query = endpoint.kind === 'read' ? `?RowStart=0&RowCount=${Math.min(settings.rowCount, endpoint.maxRows ?? settings.rowCount)}` : '';
  const url = `${settings.baseUrl}/api/${endpoint.path}${query}`;
  const requestId = randomUUID();
  const body = bodyFor(endpoint);
  const started = performance.now();
  let lastError = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const raw = await response.text();
      let parsed: unknown = raw;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { /* preserve text */ }
      clearTimeout(timer);
      return {
        endpoint: endpoint.path,
        method: 'POST',
        url,
        requestId,
        request: sanitize(body),
        status: response.status,
        responseHeaders: safeHeaders(response.headers),
        response: sanitize(parsed, { redactPersonal: true }),
        rawBodySha256: hashBody(raw),
        durationMs: Math.round(performance.now() - started),
        capturedAt: new Date().toISOString(),
        verified: response.ok,
        sourcePage: endpoint.page
      };
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return {
    endpoint: endpoint.path,
    method: 'POST',
    url,
    requestId,
    request: sanitize(body),
    status: null,
    responseHeaders: {},
    response: null,
    rawBodySha256: null,
    durationMs: Math.round(performance.now() - started),
    capturedAt: new Date().toISOString(),
    verified: false,
    sourcePage: endpoint.page,
    error: lastError
  };
}

async function writeSummary(records: CaptureRecord[]) {
  const summary = {
    runId,
    baseUrl: settings.baseUrl,
    databaseName: settings.config.DataBaseName,
    writeTests: 'SKIPPED',
    totals: { attempted: records.length, verified: records.filter((r) => r.verified).length, failed: records.filter((r) => !r.verified).length },
    records
  };
  await writeFile(path.join(runDir, 'capture.sanitized.json'), JSON.stringify(summary, null, 2), 'utf8');
  const rows = records.map((r) => `| \`${r.endpoint}\` | ${r.status ?? 'NO RESPONSE'} | ${r.verified ? 'yes' : 'no'} | ${r.durationMs} | ${r.error ?? ''} |`);
  await writeFile(path.join(runDir, 'summary.md'), [
    `# Shaygan LAN run ${runId}`,
    '',
    `Base URL: \`${settings.baseUrl}\``,
    '',
    '> Requests and responses are sanitized. Raw response bodies are not saved; only SHA-256 hashes are retained.',
    '',
    '| Endpoint | Status | Verified | ms | Error |',
    '|---|---:|---|---:|---|',
    ...rows,
    '',
    'Live write tests: SKIPPED by design.'
  ].join('\n'), 'utf8');
  await writeFile(path.resolve('captures', 'latest-run.txt'), runDir, 'utf8');
}

async function runProbe() {
  const target = readEndpoints[0];
  const record = await post(target);
  await writeSummary([record]);
  console.log(JSON.stringify({ runDir, endpoint: record.endpoint, status: record.status, verified: record.verified, error: record.error }, null, 2));
  if (!record.verified) process.exitCode = 2;
}

async function runCapture() {
  const records: CaptureRecord[] = [];
  for (const endpoint of readEndpoints) {
    const record = await post(endpoint);
    records.push(record);
    console.log(`${record.verified ? 'OK' : 'FAIL'} ${endpoint.path} (${record.status ?? record.error})`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  await writeSummary(records);
  console.log(`Sanitized capture saved in ${runDir}`);
}

async function runVerify() {
  const latestPath = path.resolve('captures', 'latest-run.txt');
  const latest = (await readFile(latestPath, 'utf8')).trim();
  const data = JSON.parse(await readFile(path.join(latest, 'capture.sanitized.json'), 'utf8')) as { records: CaptureRecord[] };
  const byPath = new Map(data.records.map((r) => [r.endpoint, r]));
  const coverage = endpoints.map((endpoint) => ({
    endpoint: endpoint.path,
    documented: true,
    liveTested: endpoint.kind === 'read' ? Boolean(byPath.get(endpoint.path)?.verified) : false,
    contractCaptured: endpoint.kind === 'read' ? Boolean(byPath.get(endpoint.path)?.verified) : false,
    mockImplemented: true,
    parityConfidence: endpoint.kind === 'read' && byPath.get(endpoint.path)?.verified ? 'captured-not-differentially-compared' : 'documented-only',
    note: endpoint.kind === 'write' ? 'Live write intentionally skipped.' : byPath.get(endpoint.path)?.error
  }));
  await writeFile(path.join(latest, 'verification.json'), JSON.stringify({ generatedAt: new Date().toISOString(), coverage }, null, 2), 'utf8');
  console.log(`Verification saved in ${path.join(latest, 'verification.json')}`);
  console.log(`Read verified: ${coverage.filter((r) => r.liveTested).length}/${readEndpoints.length}; write skipped: ${writeEndpoints.length}`);
}

if (command === 'probe') await runProbe();
if (command === 'capture') await runCapture();
if (command === 'verify') await runVerify();
