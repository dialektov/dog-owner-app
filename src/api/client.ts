import { API_BASE_URL } from './config';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const REQUEST_TIMEOUT_MS = 10000;
const RETRY_COUNT = 1;
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(endpoint: string, options?: { method?: Method; body?: object }): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: options?.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : `Ошибка ${res.status}`;
        throw new Error(msg);
      }
      return res.json();
    } catch (e) {
      clearTimeout(timeout);
      lastError = e;
      if (attempt >= RETRY_COUNT) break;
    }
  }
  throw (lastError instanceof Error ? lastError : new Error('Сетевая ошибка'));
}

export const api = {
  register: (body: { email: string; name: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>('/auth/login', { method: 'POST', body }),
  me: () => request<{ id: string; name: string; email: string }>('/auth/me'),
  getUser: (id: string) => request<{ id: string; name: string; email: string; avatar?: string; pets?: { id: string }[] }>(`/users/${id}`),
  createUser: (body: { email: string; name: string; avatar?: string }) =>
    request<{ id: string; name: string; email: string }>('/users', { method: 'POST', body }),
  getPet: (id: string) => request(`/pets/${id}`),
  getPetByQR: (qr: string) => request(`/pets/qr/${qr}`),
  createPet: (body: object) => request('/pets', { method: 'POST', body }),
  updatePet: (id: string, body: object) => request(`/pets/${id}`, { method: 'PUT', body }),
  getWalks: (petId: string) => request(`/pets/${petId}/walks`),
  createWalk: (body: object) => request('/walks', { method: 'POST', body }),
  getPlaces: (category?: string) =>
    request(category ? `/places?category=${category}` : '/places'),
  searchDogFriendlyPlaces: (lat: number, lng: number, radiusKm = 3, limit = 30, save = false) =>
    request<{
      count: number;
      saved: boolean;
      places: {
        id: string;
        name: string;
        address: string;
        category: 'vet' | 'pet_shop' | 'groomer' | 'park' | 'cafe';
        latitude: number;
        longitude: number;
        rating?: number;
      }[];
    }>(
      `/places/search?lat=${lat}&lng=${lng}&radius_km=${radiusKm}&limit=${limit}&save=${save}`
    ),
  getFeed: () => request('/feed'),
  createFeedPost: (body: { pet_id?: string; text: string; media_url?: string }) =>
    request('/feed', { method: 'POST', body }),
  getFriends: (userId: string) => request<{ id: string; name: string; email: string }[]>(`/users/${userId}/friends`),
  addFriend: (body: { friend_id: string }) => request('/friends', { method: 'POST', body }),
  getArticles: (category?: string) =>
    request(category ? `/articles?category=${category}` : '/articles'),
  getUserLocations: () =>
    request<{ id: string; user_id: string; user_name: string; pet_id: string; latitude: number; longitude: number; status: string; last_updated: string }[]>('/map/users'),
  updateMyLocation: (body: { pet_id?: string; latitude: number; longitude: number; status?: string }) =>
    request('/map/me', { method: 'PUT', body }),
  getLostAlerts: (status: 'active' | 'found' | 'all' = 'active') =>
    request<{
      id: string;
      pet_id: string;
      user_id: string;
      pet_name: string;
      breed: string;
      description: string;
      contact: string;
      latitude: number;
      longitude: number;
      status: string;
      created_at: string;
    }[]>(`/lost?status=${status}`),
  createLostAlert: (body: {
    pet_id: string;
    pet_name: string;
    breed?: string;
    description?: string;
    contact?: string;
    latitude: number;
    longitude: number;
  }) => request('/lost', { method: 'POST', body }),
  markLostAlertFound: (id: string) => request(`/lost/${id}/found`, { method: 'PUT', body: {} }),
};
