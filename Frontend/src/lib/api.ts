import { supabase } from './supabase';

const configuredBase = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const BASE = configuredBase && configuredBase !== 'disabled'
  ? process.env.EXPO_OS === 'android'
    ? configuredBase.replace('://localhost', '://10.0.2.2').replace('://127.0.0.1', '://10.0.2.2')
    : configuredBase
  : undefined;
const REQUEST_TIMEOUT_MS = 12_000;

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  if (!BASE) {
    throw new Error('This optional service is not configured.');
  }

  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;

  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}
