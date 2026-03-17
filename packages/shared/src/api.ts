import type { ApiOk, ApiErr } from './types';

/** Wrap a successful response */
export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data, ts: Date.now() };
}

/** Wrap an error response */
export function err(error: string): ApiErr {
  return { ok: false, error, ts: Date.now() };
}
