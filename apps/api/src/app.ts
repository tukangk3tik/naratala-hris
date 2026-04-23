import express, { type Express } from 'express';

export function buildApp(): Express {
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  return app;
}
