import type { ApiResponse } from '@mike-games/shared';

const BASE_URL = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const options: RequestInit = {
    method,
    credentials: 'include',
  };

  if (body !== undefined && body !== null && method !== 'GET') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unbekannter Fehler');
  }

  return data;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),

  async upload(path: string, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload fehlgeschlagen');
    }
    return data;
  },
};
