import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requestId } from './shared/middlewares/requestId.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';
import { limiters } from './shared/middlewares/rateLimit.js';
import { NotFoundError } from './shared/errors/index.js';

interface Deps {
  webOrigin?: string;
}

export function buildApp(deps: Deps = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId());
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'frame-ancestors': ["'none'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
    }),
  );

  app.use(
    cors({
      origin: deps.webOrigin ?? '*',
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  app.use(limiters.global());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use((_req, _res, next) => next(new NotFoundError('route not found')));
  app.use(errorHandler());

  return app;
}
