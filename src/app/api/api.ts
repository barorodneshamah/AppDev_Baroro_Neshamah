// src/app/api/api.ts
// All authenticated requests receive the token explicitly from Redux state.
// No AsyncStorage — token lives exclusively in the Redux reducer.
import { API_BASE_URL } from '../../config/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

interface ApiResponse {
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  body?: any;

  constructor(message: string, status: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export const isAuthError = (error: any): boolean => {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  return typeof error.message === 'string' && /expired|jwt|unauthorized|invalid token/i.test(error.message);
};

export interface ContactMessagePayload {
  fullName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface ContactReplyPayload {
  contactMessage: string;
  repliedBy: string;
  replyMessage: string;
}

export interface ReservationPayload {
  serviceType: string;
  guest?: string;
  room?: string;
  tour?: string;
  package?: string;
  checkInDate?: string;
  checkOutDate?: string;
  tourDate?: string;
  tourParticipants?: number;
  foodItems?: any[];
  numberOfGuests?: number;
  specialRequests?: string;
  contactPhone?: string;
}

export interface PaymentPayload {
  reservation: string;
  amount: string;
  paymentMethod: string;
  referenceNumber?: string;
  guestNotes?: string;
  proofOfPayment?: string;
}

// ─── Header builder ───────────────────────────────────────────────────────────

const buildHeaders = (token?: string | null): Record<string, string> => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-App-Source': 'mobile',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// ─── Private helpers ──────────────────────────────────────────────────────────

const apiGet = async (path: string, token?: string | null): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildHeaders(token),
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(extractError(data, response.status), response.status, data);
  return data;
};

const extractError = (data: any, status: number): string => {
  if (data?.['hydra:description']) return data['hydra:description'];
  if (data?.detail) return data.detail;
  if (data?.violations?.length) {
    return data.violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join('\n');
  }
  return data?.message || data?.error || `Request failed: ${status}`;
};

const apiPost = async (path: string, body: object, token?: string | null): Promise<ApiResponse> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(extractError(data, response.status), response.status, data);
  return data;
};

// ─── General authenticated fetch (PUT / PATCH / DELETE) ───────────────────────

export const apiFetch = async <T = any>(
  path: string,
  token?: string | null,
  options: RequestInit = {}
): Promise<T> => {
  const headers: Record<string, string> = {
    ...buildHeaders(token),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new ApiError(extractError(data, response.status), response.status, data);
  return data as T;
};

// ─── Auth (public — no token required) ───────────────────────────────────────

export async function authLogin({ username, password }: LoginCredentials): Promise<ApiResponse> {
  const url = `${API_BASE_URL}/api/login`;
  console.log('authLogin →', url);
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ username, password }),
  });
  const data: ApiResponse = await response.json();
  console.log('authLogin response:', response.status, data);
  if (response.ok) return data;
  throw new Error(data.error || data.message || 'Login failed');
}

export async function authRegister({ username, email, password }: RegisterCredentials): Promise<ApiResponse> {
  const url = `${API_BASE_URL}/api/register`;
  console.log('authRegister →', url);
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ username, email, password }),
  });
  const data: ApiResponse = await response.json();
  console.log('authRegister response:', response.status, data);
  if (response.ok) return data;
  throw new Error(data.error || data.message || 'Registration failed');
}

// ─── Tours ────────────────────────────────────────────────────────────────────

export const getTours    = (token?: string | null) => apiGet('/api/services/tours', token);
export const getTour     = (id: number, token?: string | null) => apiGet(`/api/tours/${id}`, token);

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const getRooms    = (token?: string | null) => apiGet('/api/services/rooms', token);
export const getRoom     = (id: number, token?: string | null) => apiGet(`/api/rooms/${id}`, token);

// ─── Foods ────────────────────────────────────────────────────────────────────

export const getFoods    = (token?: string | null) => apiGet('/api/services/food', token);
export const getFood     = (id: number, token?: string | null) => apiGet(`/api/foods/${id}`, token);

// ─── Packages ─────────────────────────────────────────────────────────────────

export const getPackages = (token?: string | null) => apiGet('/api/services/packages', token);
export const getPackage  = (id: number, token?: string | null) => apiGet(`/api/packages/${id}`, token);

// ─── Spa ──────────────────────────────────────────────────────────────────────

export const getSpaServices = (token?: string | null) => apiGet('/api/spas', token);
export const getSpaService  = (id: number, token?: string | null) => apiGet(`/api/spas/${id}`, token);
export const createSpa      = (payload: object, token?: string | null) => apiPost('/api/services/spas', payload, token);
export const updateSpa      = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/spas/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteSpa      = (id: number, token?: string | null) =>
  apiFetch(`/api/spas/${id}`, token, { method: 'DELETE' });

// ─── Current user ─────────────────────────────────────────────────────────────

export const getMe             = (token?: string | null) => apiGet('/api/me', token);
export const getUserByUsername = (username: string, token?: string | null) =>
  apiGet(`/api/users?username=${encodeURIComponent(username)}`, token);

// ─── Reservations ─────────────────────────────────────────────────────────────

// Customer endpoint — own reservations only
export const getReservations  = (token?: string | null) => apiGet('/api/reservations', token);
export const getReservation   = (id: number, token?: string | null) => apiGet(`/api/reservations/${id}`, token);

// Admin / staff endpoint — all reservations
export const getAdminReservations = (token?: string | null) => apiGet('/api/reservations', token);
export const createReservation = (payload: ReservationPayload, token?: string | null) =>
  apiPost('/api/reservations', payload, token);

// ─── Payments ─────────────────────────────────────────────────────────────────

// Customer endpoint — own payments only
export const getPayments  = (token?: string | null) => apiGet('/api/payments', token);
export const getPayment   = (id: number, token?: string | null) => apiGet(`/api/payments/${id}`, token);

// Admin / staff endpoint — all payments
export const getAdminPayments = (token?: string | null) => apiGet('/api/payments', token);
export const submitPayment = (payload: PaymentPayload, token?: string | null) =>
  apiPost('/api/payments', payload, token);

// ─── Contact Messages ─────────────────────────────────────────────────────────

export const getContactMessages   = (token?: string | null) => apiGet('/api/contact_messages', token);
export const getContactMessage    = (id: number, token?: string | null) => apiGet(`/api/contact_messages/${id}`, token);
export const submitContactMessage = (payload: ContactMessagePayload, token?: string | null) =>
  apiPost('/api/contact_messages', payload, token);

// ─── Contact Replies ──────────────────────────────────────────────────────────

export const getContactReplies = (token?: string | null) => apiGet('/api/contact_replies', token);
export const submitContactReply = (payload: ContactReplyPayload, token?: string | null) =>
  apiPost('/api/contact_replies', payload, token);

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const getItemReviews = (serviceType: string, serviceId: number, token?: string | null) =>
  apiGet(`/api/wall/reviews?serviceTag=${serviceType}&serviceId=${serviceId}`, token);

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const getActivityLogs = (token?: string | null) => apiGet('/api/activity_logs', token);
export const getActivityLog  = (id: number, token?: string | null) => apiGet(`/api/activity_logs/${id}`, token);

// ─── Users ────────────────────────────────────────────────────────────────────

export const getUsers    = (token?: string | null) => apiGet('/api/users', token);
export const getUser     = (id: number, token?: string | null) => apiGet(`/api/users/${id}`, token);
export const createUser  = (payload: object, token?: string | null) => apiPost('/api/admin/users', payload, token);
export const updateUser  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/admin/users/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteUser  = (id: number, token?: string | null) =>
  apiFetch(`/api/admin/users/${id}`, token, { method: 'DELETE' });

// ─── Room CRUD ────────────────────────────────────────────────────────────────

export const createRoom  = (payload: object, token?: string | null) => apiPost('/api/services/rooms', payload, token);
export const updateRoom  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/rooms/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteRoom  = (id: number, token?: string | null) =>
  apiFetch(`/api/rooms/${id}`, token, { method: 'DELETE' });

// ─── Tour CRUD ────────────────────────────────────────────────────────────────

export const createTour  = (payload: object, token?: string | null) => apiPost('/api/services/tours', payload, token);
export const updateTour  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/tours/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteTour  = (id: number, token?: string | null) =>
  apiFetch(`/api/tours/${id}`, token, { method: 'DELETE' });

// ─── Food CRUD ────────────────────────────────────────────────────────────────

export const createFood  = (payload: object, token?: string | null) => apiPost('/api/services/food', payload, token);
export const updateFood  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/foods/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteFood  = (id: number, token?: string | null) =>
  apiFetch(`/api/foods/${id}`, token, { method: 'DELETE' });

// ─── Package CRUD ─────────────────────────────────────────────────────────────

export const createPackage = (payload: object, token?: string | null) => apiPost('/api/services/packages', payload, token);
export const updatePackage = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/services/packages/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deletePackage = (id: number, token?: string | null) =>
  apiFetch(`/api/services/packages/${id}`, token, { method: 'DELETE' });

// ─── Reservation actions ──────────────────────────────────────────────────────

export const approveReservation  = (id: number, token?: string | null) =>
  apiPost(`/api/reservations/${id}/approve`, {}, token);
export const rejectReservation   = (id: number, notes: string, token?: string | null) =>
  apiPost(`/api/reservations/${id}/reject`, { notes }, token);
export const completeReservation = (id: number, token?: string | null) =>
  apiPost(`/api/reservations/${id}/complete`, {}, token);
export const markReservationPaid = (id: number, token?: string | null) =>
  apiPost(`/api/reservations/${id}/mark-paid`, {}, token);

// ─── Payment actions ──────────────────────────────────────────────────────────

export const approvePayment = (id: number, token?: string | null) =>
  apiPost(`/api/payments/${id}/approve`, {}, token);
export const rejectPayment  = (id: number, reason: string, token?: string | null) =>
  apiPost(`/api/payments/${id}/reject`, { reason }, token);
export const refundPayment  = (id: number, token?: string | null) =>
  apiPost(`/api/payments/${id}/refund`, {}, token);

// ─── Message actions ──────────────────────────────────────────────────────────

export const updateMessageStatus = (id: number, status: string, token?: string | null) =>
  apiPost(`/api/messages/${id}/status`, { status }, token);
export const deleteMessage       = (id: number, token?: string | null) =>
  apiPost(`/api/messages/${id}/delete`, {}, token);
export const replyToMessage      = (id: number, message: string, token?: string | null) =>
  apiPost(`/api/messages/${id}/reply`, { message }, token);

// ─── Profile ──────────────────────────────────────────────────────────────────

export const updateProfile  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/users/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(payload),
  });
export const changePassword = (payload: { newPassword: string; confirmPassword: string }, token?: string | null) =>
  apiPost('/api/change-password', payload, token);

// ─── Mercure ──────────────────────────────────────────────────────────────────

export const getMercureToken = (token?: string | null) =>
  apiGet('/api/mercure/token', token);

// ─── Admin / Staff Notifications ─────────────────────────────────────────────

export const getAdminPendingNotifications = (since?: number, token?: string | null) =>
  apiGet(`/api/admin/notifications/pending${since ? `?since=${since}` : ''}`, token);

// ─── Share Wall ───────────────────────────────────────────────────────────────

export interface WallApiPost {
  id: string;
  authorId: number;
  authorName: string;
  authorRole: string;
  caption: string;
  imageUri?: string;
  serviceTag?: string;
  reservationId?: number;
  serviceId?: number;
  isPinned: boolean;
  likedBy: number[];
  comments: WallApiComment[];
  createdAt: string;
}

export interface WallApiComment {
  id: string;
  authorId: number;
  authorName: string;
  text: string;
  createdAt: string;
}

export const getWallPosts = (limit = 30, offset = 0, token?: string | null) =>
  apiGet(`/api/wall/posts?limit=${limit}&offset=${offset}`, token);

export const getFeaturedWallPosts = (limit = 6) =>
  apiGet(`/api/wall/featured?limit=${limit}`, null);

export const getMyWallPosts = (token: string | null) =>
  apiGet('/api/wall/posts/mine', token);

export const uploadWallImage = async (
  localUri: string,
  token: string | null,
  fileName?: string,
  mimeType?: string,
): Promise<string> => {
  const fallbackName = localUri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(fallbackName);
  const name = fileName ?? (match ? fallbackName : `photo_${Date.now()}.jpg`);
  const type = mimeType ?? (match ? `image/${match[1]}` : 'image/jpeg');

  const body = new FormData();
  body.append('file', { uri: localUri, name, type } as any);

  // Do NOT set Content-Type manually — React Native sets multipart/form-data + boundary automatically.
  const res = await fetch(`${API_BASE_URL}/api/wall/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any).error ?? `Upload failed (${res.status})`;
    console.error('[uploadWallImage] error:', res.status, msg, '| uri:', localUri);
    throw new Error(msg);
  }

  const url: string = (json as any).url;
  if (!url) throw new Error('Server did not return an image URL');
  return url;
};

export const uploadServiceImage = async (
  localUri: string,
  token: string | null,
  serviceType: 'rooms' | 'tours' | 'foods' | 'packages' | 'spas',
  fileName?: string,
  mimeType?: string,
): Promise<string> => {
  const fallbackName = localUri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(fallbackName);
  const name = fileName ?? (match ? fallbackName : `service_${Date.now()}.jpg`);
  const type = mimeType ?? (match ? `image/${match[1]}` : 'image/jpeg');

  const body = new FormData();
  body.append('file', { uri: localUri, name, type } as any);
  body.append('serviceType', serviceType);

  const res = await fetch(`${API_BASE_URL}/api/services/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json as any).error ?? (json as any).message ?? `Upload failed (${res.status})`;
    console.error('[uploadServiceImage] error:', res.status, msg, '| uri:', localUri);
    throw new Error(msg);
  }

  const url: string = (json as any).url;
  if (!url) throw new Error('Server did not return an image URL');
  return url;
};

export const createWallPost = (
  payload: { caption: string; imageUri?: string; serviceTag?: string; reservationId?: number; serviceId?: number },
  token: string | null
) => apiPost('/api/wall/posts', payload, token);

export const toggleWallLike = (postId: string, token: string | null) =>
  apiPost(`/api/wall/posts/${postId}/like`, {}, token);

export const addWallComment = (postId: string, text: string, token: string | null) =>
  apiPost(`/api/wall/posts/${postId}/comments`, { text }, token);

export const deleteWallPost = (postId: string, token: string | null) =>
  apiFetch(`/api/wall/posts/${postId}`, token, { method: 'DELETE' });

export const pinWallPost = (postId: string, token: string | null) =>
  apiPost(`/api/wall/posts/${postId}/pin`, {}, token);

// ─── Reservation Reschedule ───────────────────────────────────────────────────

export interface ReschedulePayload {
  checkInDate?: string;
  checkOutDate?: string;
  tourDate?: string;
  status?: string;
}

export const rescheduleReservation = (id: number, payload: ReschedulePayload, token: string | null) =>
  apiFetch(`/api/reservations/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(payload),
  });

// ─── Reservation Extension ────────────────────────────────────────────────────

export interface ExtensionPayload {
  newCheckoutDate?: string;  // rooms:  YYYY-MM-DD
  newTourDate?: string;      // tours:  YYYY-MM-DD
  newParticipants?: number;  // tours:  optional
  newDate?: string;          // spa:    YYYY-MM-DD
  newCheckInDate?: string;   // package
  newCheckOutDate?: string;  // package
}

export const requestExtension = (id: number, payload: ExtensionPayload, token: string | null) =>
  apiPost(`/api/reservations/${id}/request-extension`, payload, token);
