import 'dotenv/config';
import { loadEnv } from './shared/config/env.js';
import { createDb } from './shared/db/client.js';
import { buildApp } from './app.js';
import { logger } from './shared/logger.js';

const env = loadEnv();
const { db } = createDb(env.DATABASE_URL);
const app = buildApp({ env, db });
app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'api listening'));
