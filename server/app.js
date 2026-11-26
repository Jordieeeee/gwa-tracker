import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApiRouter } from './routes/api.routes.js';
import { errorHandler, notFoundApi } from './middleware/errors.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../client/dist');

export function createApp(repo, options = {}) {
  const app = express();

  // Render puts a proxy in front of the app. Without this, every visitor shares
  // the proxy's IP and the rate limiter would block everyone at once.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(express.json({ limit: '10kb', strict: true }));

  app.use('/api', createApiRouter(repo, options));
  app.use('/api', notFoundApi);

  // Serve the built React app (one service, one URL, no CORS needed).
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
    // Client-side routes (/records, /records/12) all load index.html.
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
