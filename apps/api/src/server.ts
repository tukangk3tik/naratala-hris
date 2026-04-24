import 'dotenv/config';
import { buildApp } from './app.js';
import { loadEnv } from './shared/config/env.js';
import { logger } from './shared/logger.js';

const env = loadEnv();
const app = buildApp({ webOrigin: env.WEB_ORIGIN });
app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'api listening'));
