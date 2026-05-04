import type { ZodSchema } from 'zod';
import { ApiError } from './ApiError.js';
import { tokenStore } from './tokenStore.js';

interface Config {
  onSignOut: () => void;
}
let config: Config = { onSignOut: () => {} };

export function configureClient(next: Partial<Config>): void {
  config = { ...config, ...next };
}

interface FetchOpts<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: ZodSchema<T>;
  signal?: AbortSignal;
}

let refreshPromise: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { accessToken?: string };
      if (typeof json.accessToken !== 'string') return false;
      tokenStore.set(json.accessToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doFetch<T>(path: string, opts: FetchOpts<T>): Promise<Response> {
  const headers: Record<string, string> = {};
  const tok = tokenStore.get();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const init: RequestInit = {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  if (opts.signal) init.signal = opts.signal;
  return fetch(path, init);
}

export async function apiFetch<T = unknown>(path: string, opts: FetchOpts<T> = {}): Promise<T> {
  let res: Response;
  try {
    res = await doFetch(path, opts);
  } catch (e) {
    throw new ApiError('NETWORK', e instanceof Error ? e.message : 'network error');
  }

  if (
    res.status === 401 &&
    !path.includes('/api/auth/refresh') &&
    !path.includes('/api/auth/login')
  ) {
    const ok = await refresh();
    if (!ok) {
      config.onSignOut();
      throw new ApiError('TOKEN_EXPIRED', 'session expired', 401);
    }
    try {
      res = await doFetch(path, opts);
    } catch (e) {
      throw new ApiError('NETWORK', e instanceof Error ? e.message : 'network error');
    }
    if (res.status === 401) {
      config.onSignOut();
      throw new ApiError('TOKEN_EXPIRED', 'session expired', 401);
    }
  }

  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const b = body as {
      code?: string;
      message?: string;
      details?: { fields?: Record<string, string[]> };
    } | null;
    const code = b?.code ?? 'INTERNAL_ERROR';
    const msg = b?.message ?? 'request failed';
    throw new ApiError(code, msg, res.status, b?.details?.fields);
  }

  if (opts.schema) {
    const parsed = opts.schema.safeParse(body);
    if (!parsed.success) throw new ApiError('VALIDATION_FAILED', 'response shape mismatch', res.status);
    return parsed.data;
  }
  return body as T;
}
