import 'dotenv/config';
import { buildApp } from './app.js';
import { loadEnv } from './shared/config/env.js';

const env = loadEnv();
const app = buildApp();
app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ msg: 'api listening', port: env.PORT }));
});
