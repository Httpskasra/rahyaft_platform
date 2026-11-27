import { createHash } from 'node:crypto';

const secretKeys = /password|authorization|cookie|token|dbusername|authuser/i;
const personalKeys = /name|phone|mobile|address|email|price|amount|remain|accountnumber|guid/i;

export function hashBody(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex');
}

export function sanitize(value: unknown, options: { redactPersonal?: boolean } = {}): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitize(item, options));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (secretKeys.test(key)) return [key, '[REDACTED]'];
      if (options.redactPersonal && personalKeys.test(key)) return [key, '[SANITIZED]'];
      return [key, sanitize(item, options)];
    })
  );
}

export function safeHeaders(headers: Headers) {
  const allowed = ['content-type', 'content-length', 'date', 'server', 'x-request-id', 'request-id'];
  return Object.fromEntries(allowed.flatMap((key) => headers.has(key) ? [[key, headers.get(key)]] : []));
}
