import { getProxyUrl } from './config';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = await getProxyUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = (body as { detail?: unknown })?.detail;
    const msg =
      typeof detail === 'string'
        ? detail
        : typeof detail === 'object' && detail !== null && 'error' in detail
          ? String((detail as { error: unknown }).error)
          : `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, body, detail });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
