import { buildApp } from './mock.js';

const app = await buildApp();
const port = Number(process.env.SHAYGAN_MOCK_PORT ?? 4310);
await app.listen({ host: '127.0.0.1', port });
console.log(`Shaygan local mock: http://127.0.0.1:${port}`);
console.log(`Swagger UI: http://127.0.0.1:${port}/docs`);
