const mutationHeaders = { 'Content-Type': 'application/json', 'X-Requested-With': 'OurWines' };

export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (response.status === 401) window.dispatchEvent(new Event('our-wines:unauthorized'));
    throw new ApiError(body.error ?? 'Die Anfrage ist fehlgeschlagen.', response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', headers: mutationHeaders, body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPut = <T>(path: string, body: unknown) => api<T>(path, { method: 'PUT', headers: mutationHeaders, body: JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) => api<T>(path, { method: 'PATCH', headers: mutationHeaders, body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE', headers: { 'X-Requested-With': 'OurWines' } });

export async function uploadPhoto(wineId: string, photo: File) {
  const form = new FormData();
  form.append('photo', photo);
  return api<{ photoUrl: string }>(`/api/wines/${wineId}/photo`, { method: 'POST', headers: { 'X-Requested-With': 'OurWines' }, body: form });
}
