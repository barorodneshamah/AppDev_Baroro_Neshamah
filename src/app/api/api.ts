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
  if (!response.ok) throw new Error(data.message || data.error || `Request failed: ${response.status}`);
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
  if (!response.ok) throw new Error(extractError(data, response.status));
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
  if (!response.ok) throw new Error(data.message || data.error || `Request failed: ${response.status}`);
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
  apiGet(`/api/reviews?serviceType=${serviceType}&serviceId=${serviceId}`, token);

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const getActivityLogs = (token?: string | null) => apiGet('/api/activity_logs', token);
export const getActivityLog  = (id: number, token?: string | null) => apiGet(`/api/activity_logs/${id}`, token);

// ─── Users ────────────────────────────────────────────────────────────────────

export const getUsers    = (token?: string | null) => apiGet('/api/users', token);
export const getUser     = (id: number, token?: string | null) => apiGet(`/api/users/${id}`, token);
export const createUser  = (payload: object, token?: string | null) => apiPost('/api/users', payload, token);
export const updateUser  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/users/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteUser  = (id: number, token?: string | null) =>
  apiFetch(`/api/users/${id}`, token, { method: 'DELETE' });

// ─── Room CRUD ────────────────────────────────────────────────────────────────

export const createRoom  = (payload: object, token?: string | null) => apiPost('/api/rooms', payload, token);
export const updateRoom  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/rooms/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteRoom  = (id: number, token?: string | null) =>
  apiFetch(`/api/rooms/${id}`, token, { method: 'DELETE' });

// ─── Tour CRUD ────────────────────────────────────────────────────────────────

export const createTour  = (payload: object, token?: string | null) => apiPost('/api/tours', payload, token);
export const updateTour  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/tours/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteTour  = (id: number, token?: string | null) =>
  apiFetch(`/api/tours/${id}`, token, { method: 'DELETE' });

// ─── Food CRUD ────────────────────────────────────────────────────────────────

export const createFood  = (payload: object, token?: string | null) => apiPost('/api/foods', payload, token);
export const updateFood  = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/foods/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteFood  = (id: number, token?: string | null) =>
  apiFetch(`/api/foods/${id}`, token, { method: 'DELETE' });

// ─── Package CRUD ─────────────────────────────────────────────────────────────

export const createPackage = (payload: object, token?: string | null) => apiPost('/api/packages', payload, token);
export const updatePackage = (id: number, payload: object, token?: string | null) =>
  apiFetch(`/api/packages/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const deletePackage = (id: number, token?: string | null) =>
  apiFetch(`/api/packages/${id}`, token, { method: 'DELETE' });

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
  apiFetch(`/api/users/${id}`, token, { method: 'PUT', body: JSON.stringify(payload) });
export const changePassword = (payload: { currentPassword: string; newPassword: string }, token?: string | null) =>
  apiPost('/api/change-password', payload, token);

// ─── Mercure ──────────────────────────────────────────────────────────────────

export const getMercureToken = (token?: string | null) =>
  apiGet('/api/mercure/token', token);
