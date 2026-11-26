import { createApp } from './app.js';
import { createPool } from './db/pool.js';
import { createRecordsRepo } from './repositories/records.repo.js';

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL. Copy .env.example to .env (local) or set it in Render.');
  process.exit(1);
}

const pool = createPool();
const app = createApp(createRecordsRepo(pool));
const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`GWA Tracker listening on http://localhost:${port}`);
});

// Render sends SIGTERM on redeploy: finish requests, then close DB connections.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  });
}
