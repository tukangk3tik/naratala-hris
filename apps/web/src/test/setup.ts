import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server.js';
import { i18nReady } from '../shared/i18n/index.js';

beforeAll(async () => {
  await i18nReady;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
