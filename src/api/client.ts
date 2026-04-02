import { API_BASE_URL } from './config';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const REQUEST_TIMEOUT_MS = 10000;
const RETRY_COUNT = 1;
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

type RequestOptions = {
  method?: Method;
  body?: object;
  /** По умолчанию 10 с; для тяжёлых запросов (поиск мест) задайте больше */
  timeoutMs?: number;
  /** Отмена при смене области карты и т.п. */
  signal?: AbortSignal;
};

async function request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const url = `${API_BASE_URL}/api/v1${endpoint}`;
  let lastError: unknown = null;
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const externalSignal = options?.signal;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }
      externalSignal.addEventListener('abort', onExternalAbort);
    }
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof (data as { error?: string }).error === 'string' ? (data as { error: string }).error : `Ошибка ${res.status}`;
        throw new Error(msg);
      }
      return res.json();
    } catch (e) {
      clearTimeout(timeout);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
      lastError = e;
      if (attempt >= RETRY_COUNT) break;
    }
  }
  throw (lastError instanceof Error ? lastError : new Error('Сетевая ошибка'));
}

export const api = {
  register: (body: { email: string; name: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string; is_admin: boolean } }>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string; is_admin: boolean } }>('/auth/login', { method: 'POST', body }),
  me: () => request<{ id: string; name: string; email: string; is_admin: boolean }>('/auth/me'),
  grantAdmin: (body: { friend_id?: string; friend_email?: string }) => request('/auth/grant-admin', { method: 'POST', body }),
  getUser: (id: string) => request<{ id: string; name: string; email: string; is_admin?: boolean; avatar?: string; pets?: { id: string }[] }>(`/users/${id}`),
  createUser: (body: { email: string; name: string; avatar?: string }) =>
    request<{ id: string; name: string; email: string }>('/users', { method: 'POST', body }),
  getPet: (id: string) => request(`/pets/${id}`),
  getPetByQR: (qr: string) => request(`/pets/qr/${qr}`),
  createPet: (body: object) => request('/pets', { method: 'POST', body }),
  updatePet: (id: string, body: object) => request(`/pets/${id}`, { method: 'PUT', body }),
  getWalks: (petId: string) => request(`/pets/${petId}/walks`),
  createWalk: (body: object) => request('/walks', { method: 'POST', body }),
  deleteWalk: (walkId: string) => request<{ deleted: string }>(`/walks/${walkId}`, { method: 'DELETE' }),
  getPlaces: (category?: string) =>
    request(category ? `/places?category=${category}` : '/places'),
  searchDogFriendlyPlaces: (
    lat: number,
    lng: number,
    radiusKm = 3,
    limit = 30,
    save = false,
    categories: Array<'vet' | 'pet_shop' | 'groomer' | 'park'> = ['vet', 'pet_shop', 'groomer', 'park'],
    fetchOpts?: { signal?: AbortSignal; timeoutMs?: number }
  ) =>
    request<{
      count: number;
      saved: boolean;
      online?: boolean;
      cached?: boolean;
      source?: 'openstreetmap' | 'yandex';
      places: {
        id: string;
        name: string;
        address: string;
        category: 'vet' | 'pet_shop' | 'groomer' | 'park' | 'cafe';
        latitude: number;
        longitude: number;
        rating?: number;
      }[];
    }>(`/places/search?lat=${lat}&lng=${lng}&radius_km=${radiusKm}&limit=${limit}&save=${save}&categories=${encodeURIComponent(categories.join(','))}`, {
      timeoutMs: fetchOpts?.timeoutMs ?? 75_000,
      signal: fetchOpts?.signal,
    }),
  getFeed: (sort: 'interesting' | 'newest' | 'likes' | 'comments' = 'interesting') => request(`/feed?sort=${sort}`),
  createFeedPost: (body: { pet_id?: string; text: string; media_url?: string }) =>
    request('/feed', { method: 'POST', body }),
  toggleFeedLike: (postId: string) => request(`/feed/${postId}/like`, { method: 'POST', body: {} }),
  addFeedComment: (postId: string, text: string) => request(`/feed/${postId}/comments`, { method: 'POST', body: { text } }),
  deleteFeedPost: (postId: string) => request(`/feed/${postId}`, { method: 'DELETE' }),
  getFriends: (userId: string) => request<{ id: string; name: string; email: string }[]>(`/users/${userId}/friends`),
  addFriend: (body: { friend_id?: string; friend_email?: string }) => request('/friends', { method: 'POST', body }),
  removeFriend: (friendId: string) => request(`/friends/${friendId}`, { method: 'DELETE' }),
  getArticles: (category?: string, status?: 'pending' | 'published' | 'rejected' | 'all') => {
    const params: string[] = [];
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    return request(params.length ? `/articles?${params.join('&')}` : '/articles');
  },
  submitArticle: (body: { title: string; content: string; category: string }) => request('/articles/submit', { method: 'POST', body }),
  moderateArticle: (id: string, action: 'approve' | 'reject') => request(`/articles/${id}/moderate`, { method: 'PUT', body: { action } }),
  deleteArticle: (id: string) => request(`/articles/${id}`, { method: 'DELETE' }),
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
