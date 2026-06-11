'use client';

/**
 * Typed fetch client. Holds the access token in memory and transparently
 * refreshes it (via the httpOnly refresh cookie) on a 401, then retries once.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;

interface ApiOptions extends RequestInit {
  auth?: boolean;
  retry?: boolean;
}

async function refresh(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return false;
  const data = await res.json();
  accessToken = data.accessToken;
  return true;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { auth = true, retry = true, headers, ...rest } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  if (res.status === 401 && auth && retry) {
    const ok = await refresh();
    if (ok) return api<T>(path, { ...opts, retry: false });
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Server-side fetch (no token refresh, used in RSC for public data). */
export async function apiServer<T = unknown>(path: string): Promise<T> {
  const base = process.env.API_INTERNAL_URL ?? API_URL;
  const res = await fetch(`${base}${path}`, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
