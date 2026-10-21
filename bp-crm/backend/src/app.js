import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import api from './routes/index.js';
import { requireCsrfHeader } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'X-Requested-With'] }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', requireCsrfHeader, api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
