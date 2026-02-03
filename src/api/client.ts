import { API_BASE_URL } from './config';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(endpoint: string, options?: { method?: Method; body?: object }): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getPet: (id: string) => request(`/pets/${id}`),
  getPetByQR: (qr: string) => request(`/pets/qr/${qr}`),
  createPet: (body: object) => request('/pets', { method: 'POST', body }),
  getWalks: (petId: string) => request(`/pets/${petId}/walks`),
  createWalk: (body: object) => request('/walks', { method: 'POST', body }),
  getPlaces: (category?: string) =>
    request(category ? `/places?category=${category}` : '/places'),
  getFeed: () => request('/feed'),
  getArticles: (category?: string) =>
    request(category ? `/articles?category=${category}` : '/articles'),
};
