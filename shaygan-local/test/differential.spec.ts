import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/mock.js';
import { getLiveSettings } from '../src/config.js';
import { readEndpoints } from '../src/endpoints.js';

const enabled = process.env.RUN_SHAYGAN_DIFFERENTIAL === 'true';
const suite = enabled ? describe : describe.skip;

function structuralDiff(live: unknown, mock: unknown, pointer = '$'): string[] {
  if (live === null || mock === null) return live === mock ? [] : [`${pointer}: null mismatch`];
  if (Array.isArray(live) || Array.isArray(mock)) {
    if (!Array.isArray(live) || !Array.isArray(mock)) return [`${pointer}: array mismatch`];
    if (!live.length || !mock.length) return live.length === mock.length ? [] : [`${pointer}: array length ${live.length} != ${mock.length}`];
    return structuralDiff(live[0], mock[0], `${pointer}[0]`);
  }
  if (typeof live !== typeof mock) return [`${pointer}: ${typeof live} != ${typeof mock}`];
  if (typeof live !== 'object') return [];
  const left = live as Record<string, unknown>;
  const right = mock as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].flatMap((key) => {
    if (!(key in left)) return [`${pointer}.${key}: missing live`];
    if (!(key in right)) return [`${pointer}.${key}: missing mock`];
    return structuralDiff(left[key], right[key], `${pointer}.${key}`);
  });
}

suite('read-only live/mock differential contract', () => {
  let app: FastifyInstance;
  const settings = getLiveSettings();
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async () => { await app.close(); });

  for (const endpoint of readEndpoints) {
    it(endpoint.path, async () => {
      const body = { Config: settings.config, Domain: {} };
      const query = '?RowStart=0&RowCount=1';
      const [liveResponse, mockResponse] = await Promise.all([
        fetch(`${settings.baseUrl}/api/${endpoint.path}${query}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
        app.inject({ method: 'POST', url: `/api/${endpoint.path}${query}`, payload: body })
      ]);
      const live = await liveResponse.json();
      const mock = mockResponse.json();
      expect(structuralDiff(live, mock), `Minimal structural mismatches for ${endpoint.path}`).toEqual([]);
    });
  }
});
