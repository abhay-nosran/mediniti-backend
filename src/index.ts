import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { testConnection } from './db/connection';
import { runMigrations } from './db/migrations';
import contactRouter from './routes/contact';
import gapAnalysisRouter from './routes/gapAnalysis';

// ─── App setup ────────────────────────────────────────────────────────────────

const app = express();
const PORT = Number(process.env.PORT ?? 5000);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// ─── Security headers ─────────────────────────────────────────────────────────

app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Trust proxy (for correct IP behind Nginx / load balancers) ───────────────

app.set('trust proxy', 1);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/contact', contactRouter);
app.use('/api/gap-analysis', gapAnalysisRouter);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  // Never expose stack traces in production
  res.status(500).json({
    success: false,
    message:
      NODE_ENV === 'production'
        ? 'An unexpected error occurred. Please try again.'
        : err.message,
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    await testConnection();
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT} (${NODE_ENV})`);
      console.log(`[Server] Accepting requests from: ${FRONTEND_URL}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();
