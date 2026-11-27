import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { endpoints } from '../src/endpoints.js';

const root = path.resolve('.');
const schema = (name: string, value: Record<string, unknown>) => ({
  [name]: { type: 'object', additionalProperties: true, ...value }
});

const configSchema = {
  type: 'object',
  required: ['Server', 'DBUserName', 'DBPassword', 'DataBaseName'],
  properties: {
    Server: { type: 'string', description: 'SQL Server instance; secret-adjacent and redacted in captures.' },
    DBUserName: { type: 'string', writeOnly: true },
    DBPassword: { type: 'string', writeOnly: true, format: 'password' },
    DataBaseName: { type: 'string', example: 'CY000401' },
    AllowRowSecurity: { type: 'boolean' },
    Level: { type: 'integer' },
    AuthUser: { type: ['string', 'null'], writeOnly: true },
    AuthPassword: { type: ['string', 'null'], writeOnly: true, format: 'password' },
    StartVersion: { type: ['string', 'null'] },
    EndVersion: { type: ['string', 'null'] },
    Language: { type: ['string', 'null'], description: 'Seen in examples; behavior unverified.' }
  }
};

const paths = Object.fromEntries(endpoints.map((endpoint) => {
  const read = endpoint.kind === 'read';
  return [`/api/${endpoint.path}`, {
    post: {
      tags: [endpoint.path.split('/')[0]],
      operationId: endpoint.path.replace(/[\/]+/g, '_').replace(/_$/, ''),
      summary: `${read ? 'دریافت' : 'ارسال'} ${endpoint.model}`,
      description: `documented-only; source PDF page ${endpoint.page}.${endpoint.note ? ` ${endpoint.note}` : ''}`,
      'x-contract-status': 'documented-only',
      'x-source-page': endpoint.page,
      parameters: read ? [
        { name: 'RowStart', in: 'query', required: false, schema: { type: 'integer', minimum: 0, default: 0 } },
        { name: 'RowCount', in: 'query', required: false, schema: { type: 'integer', minimum: 0, maximum: endpoint.maxRows }, description: endpoint.maxRows ? `Documented maximum for this report: ${endpoint.maxRows}.` : 'Maximum not stated in reviewed pages.' }
      ] : [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: read ? '#/components/schemas/ReadRequest' : '#/components/schemas/PutRequest' } } }
      },
      responses: {
        '200': {
          description: 'Documented application response. Live HTTP status behavior is unverified.',
          content: { 'application/json': { schema: { $ref: read ? '#/components/schemas/ReadResponse' : '#/components/schemas/PutResponse' } } }
        },
        default: { description: 'Transport or application error; exact shape unverified.' }
      }
    }
  }];
}));

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Shaygan Accounting Web Service',
    version: 'document-revision-27',
    description: 'Contract transcribed from the 101-page Shaygan document. No endpoint in this file is marked live-verified yet.'
  },
  servers: [{ url: '{baseUrl}', variables: { baseUrl: { default: 'http://127.0.0.1:4310' } } }],
  paths,
  components: {
    schemas: {
      Config: configSchema,
      Range: { type: 'object', properties: { From: {}, To: {} }, additionalProperties: false },
      ReadRequest: {
        type: 'object', required: ['Config', 'Domain'],
        properties: { Config: { $ref: '#/components/schemas/Config' }, Domain: { type: 'object', additionalProperties: { $ref: '#/components/schemas/Range' } } }
      },
      PutRequest: {
        type: 'object', required: ['Put'],
        properties: { Put: { type: 'object', required: ['Config', 'PutObject'], properties: { Config: { $ref: '#/components/schemas/Config' }, PutObject: { type: 'array', items: { type: 'object', required: ['UpdateKind'], properties: { GuId: { type: ['string', 'null'], format: 'uuid' }, UpdateKind: { type: 'integer', enum: [0, 1, 2, 3, 4] } }, additionalProperties: true } } } } }
      },
      ReadResponse: {
        type: 'object', properties: { CurrentVersion: { type: ['string', 'null'] }, ErrorMessage: { type: ['string', 'null'] }, Result: { type: 'array', items: { type: 'object', additionalProperties: true } } }, additionalProperties: false
      },
      PutResponse: {
        type: 'object', properties: { ErrorMessage: { type: ['string', 'null'] }, TokenString: { type: ['string', 'null'] }, Result: { type: 'array', items: { $ref: '#/components/schemas/PutResult' } } }, additionalProperties: false
      },
      PutResult: { type: 'object', properties: { ErrorMessage: { type: ['string', 'null'] }, GuId: { type: ['string', 'null'] }, Number: { type: ['string', 'null'] } } },
      ...schema('Account', { properties: { AccountNumber: { type: ['string', 'null'] }, AccountName: { type: ['string', 'null'] }, GuId: { type: ['string', 'null'] } } }),
      ...schema('Item', { properties: { ItemCode: { type: ['string', 'null'] }, ItemDesc: { type: ['string', 'null'] }, Itembarcode: { type: ['string', 'null'] }, GuId: { type: ['string', 'null'] } } }),
      ...schema('Invoice', { properties: { Body: { type: 'array', items: { type: 'object' } }, Expense: { type: 'array', items: { type: 'object' } }, InvTyp: { type: ['integer', 'null'] }, InvNo: { type: ['integer', 'null'] }, InvDate: { type: ['string', 'null'], pattern: '^\\d{8}$' } } })
    }
  }
};

const postman = {
  info: { name: 'Shaygan Accounting - documented only', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://127.0.0.1:4310' }],
  item: endpoints.map((endpoint) => ({
    name: endpoint.path,
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      url: { raw: `{{baseUrl}}/api/${endpoint.path}${endpoint.kind === 'read' ? '?RowStart=0&RowCount=2' : ''}`, host: ['{{baseUrl}}'], path: ['api', ...endpoint.path.split('/')].filter(Boolean), query: endpoint.kind === 'read' ? [{ key: 'RowStart', value: '0' }, { key: 'RowCount', value: '2' }] : [] },
      body: { mode: 'raw', raw: endpoint.kind === 'read' ? '{\n  "Config": {{config}},\n  "Domain": {}\n}' : '{\n  "Put": {\n    "Config": {{config}},\n    "PutObject": []\n  }\n}' },
      description: `${endpoint.kind === 'write' ? 'DO NOT RUN AGAINST PRODUCTION. ' : ''}Documented-only, PDF page ${endpoint.page}.`
    }
  }))
};

const environment = {
  name: 'Shaygan - fill locally',
  values: [
    { key: 'baseUrl', value: 'http://127.0.0.1:4310', enabled: true },
    { key: 'config', value: '{"Server":"","DBUserName":"","DBPassword":"","DataBaseName":"","AllowRowSecurity":false,"Level":0,"AuthUser":"","AuthPassword":"","StartVersion":null,"EndVersion":null}', enabled: true, type: 'secret' }
  ],
  _postman_variable_scope: 'environment'
};

await Promise.all(['openapi', 'postman'].map((dir) => mkdir(path.join(root, dir), { recursive: true })));
// JSON is a strict subset of YAML 1.2. Keeping the committed spec as formatted
// JSON avoids a generator-time dependency while remaining a valid .yaml file.
await writeFile(path.join(root, 'openapi', 'shaygan.openapi.yaml'), JSON.stringify(openapi, null, 2), 'utf8');
await writeFile(path.join(root, 'postman', 'Shaygan.postman_collection.json'), JSON.stringify(postman, null, 2), 'utf8');
await writeFile(path.join(root, 'postman', 'Shaygan.postman_environment.json'), JSON.stringify(environment, null, 2), 'utf8');
console.log(`Generated OpenAPI and Postman artifacts for ${endpoints.length} endpoints.`);
