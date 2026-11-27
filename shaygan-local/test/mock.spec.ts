import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/mock.js';
import { endpoints } from '../src/endpoints.js';

describe('Shaygan local mock contract', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async () => { await app.close(); });

  it('implements every documented endpoint as POST', async () => {
    for (const endpoint of endpoints) {
      const payload = endpoint.kind === 'read' ? { Config: {}, Domain: {} } : { Put: { Config: {}, PutObject: [{ UpdateKind: 0 }] } };
      const response = await app.inject({ method: 'POST', url: `/api/${endpoint.path}?RowStart=0&RowCount=1`, payload });
      expect(response.statusCode, endpoint.path).toBe(200);
      expect(response.headers['x-shaygan-mock-fidelity']).toBe('documented-only');
    }
  });

  it('rejects a malformed write envelope', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/Account/Put', payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it('resets state and exposes honest coverage', async () => {
    expect((await app.inject({ method: 'POST', url: '/__mock/reset' })).json()).toEqual({ reset: true });
    const coverage = (await app.inject({ method: 'GET', url: '/__mock/coverage' })).json();
    expect(coverage.liveVerified).toBe(0);
    expect(coverage.implemented).toBe(endpoints.length);
  });
});
