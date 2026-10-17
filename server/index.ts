import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function start() {
  const config = loadConfig();
  const app = await buildApp({ config });
  await app.listen({ port: config.port, host: '0.0.0.0' });
}

start().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
