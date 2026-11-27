import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { endpoints } from './endpoints.js';

type MockMode = 'replay' | 'stateful' | 'synthetic';
const stores = new Map<string, Array<Record<string, unknown>>>();

const syntheticByModel: Record<string, Record<string, unknown>> = {
  Account: { AccountNumber: 'SYN-ACCOUNT-001', AccountName: 'نمونه غیرواقعی', GuId: '00000000-0000-4000-8000-000000000001' },
  Item: { ItemCode: 'SYN-ITEM-001', ItemDesc: 'کالای غیرواقعی', GuId: '00000000-0000-4000-8000-000000000002' },
  Invoice: { InvNo: 1, InvTyp: 2, InvDate: '14000101', GuId: '00000000-0000-4000-8000-000000000003', Body: [], Expense: [] },
  JobRead: { JobNo: 'SYN-JOB-001', JobName: 'تفصیلی غیرواقعی', GuId: '00000000-0000-4000-8000-000000000004' },
  Stock: { StockNumber: 'SYN-STOCK-001', StockName: 'انبار غیرواقعی', Guid: '00000000-0000-4000-8000-000000000005' },
  ItemRemainModel: { ItemCode: 'SYN-ITEM-001', Quantity1: 0, Quantity2: 0, RemainCost: 0 },
  MStatementClosingBalance: { AccountNumber: 'SYN-ACCOUNT-001', AmountDebit: '0', AmountCredit: '0' }
};

function mode(): MockMode {
  const selected = process.env.SHAYGAN_MOCK_MODE ?? 'synthetic';
  return ['replay', 'stateful', 'synthetic'].includes(selected) ? selected as MockMode : 'synthetic';
}

function applyPaging(items: Array<Record<string, unknown>>, query: Record<string, unknown>) {
  const start = Math.max(0, Number(query.RowStart ?? 0));
  const count = Math.max(0, Number(query.RowCount ?? items.length));
  return items.slice(start, count === 0 ? undefined : start + count);
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: { title: 'Shaygan Local Mock', version: '0.1.0', description: 'Documented-only mock until LAN captures are verified.' },
      servers: [{ url: 'http://127.0.0.1:4310' }]
    }
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => ({ status: 'ok', mode: mode(), fidelity: 'documented-only' }));
  app.get('/openapi.json', async () => app.swagger());
  app.get('/__mock/coverage', async () => ({
    mode: mode(),
    liveVerified: 0,
    implemented: endpoints.length,
    endpoints: endpoints.map((e) => ({ path: `/api/${e.path}`, status: 'documented-only', sourcePage: e.page }))
  }));
  app.post('/__mock/reset', async () => { stores.clear(); return { reset: true }; });

  for (const endpoint of endpoints) {
    app.post(`/api/${endpoint.path}`, {
      schema: {
        tags: [endpoint.path.split('/')[0]],
        summary: `${endpoint.kind === 'read' ? 'Read' : 'Write'} ${endpoint.model} (documented-only, PDF p.${endpoint.page})`,
        ...(endpoint.kind === 'read' ? { querystring: {
          type: 'object', properties: { RowStart: { type: 'integer', minimum: 0 }, RowCount: { type: 'integer', minimum: 0 } }
        } } : {}),
        body: { type: 'object', additionalProperties: true },
        response: {
          200: { type: 'object', additionalProperties: true },
          400: { type: 'object', additionalProperties: true }
        }
      }
    }, async (request, reply) => {
      reply.header('x-shaygan-mock-fidelity', 'documented-only');
      const selectedMode = mode();
      if (endpoint.kind === 'read') {
        const base = stores.get(endpoint.model) ?? [syntheticByModel[endpoint.model] ?? { Synthetic: true, Model: endpoint.model }];
        return { Result: applyPaging(base, request.query as Record<string, unknown>), ErrorMessage: null, CurrentVersion: 'synthetic-1' };
      }

      const body = request.body as { Put?: { PutObject?: Array<Record<string, unknown>> } };
      const items = body?.Put?.PutObject;
      if (!Array.isArray(items)) {
        reply.code(400);
        return { ErrorMessage: 'Put.PutObject must be an array.', Result: [] };
      }
      const results = items.map((item) => {
        const guid = String(item.GuId ?? randomUUID());
        if (selectedMode === 'stateful') {
          const list = stores.get(endpoint.model) ?? [];
          const updateKind = Number(item.UpdateKind ?? 0);
          const index = list.findIndex((entry) => entry.GuId === guid);
          if (updateKind === 2 && index >= 0) list.splice(index, 1);
          else if (index >= 0) list[index] = { ...list[index], ...item, GuId: guid };
          else list.push({ ...item, GuId: guid });
          stores.set(endpoint.model, list);
        }
        return { ErrorMessage: null, GuId: guid, Number: String(item.Number ?? item.AccountNumber ?? item.ItemCode ?? '') };
      });
      return { ErrorMessage: null, Result: results, TokenString: selectedMode === 'stateful' ? 'stateful-local' : 'synthetic-local' };
    });
  }
  return app;
}
