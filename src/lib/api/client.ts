import { auth } from '@/lib/firebase/config';
import type { ApiResponse, HealthStatusResult } from '@/types/api';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string = 'API_ERROR', statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Retrieves the active Firebase ID token or demo session token.
 */
export async function getAuthToken(): Promise<string | null> {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      // Fallback
    }
  }

  // Check demo user in localStorage for sandbox mode
  const demoStored = localStorage.getItem('officepilot_demo_user') || localStorage.getItem('worktrip_demo_user');
  if (demoStored) {
    try {
      const parsed = JSON.parse(demoStored);
      return `demo-${parsed.uid || 'demo-traveler-uid-001'}`;
    } catch {
      // Continue
    }
  }

  // Fallback demo sandbox token if unauthenticated so AI and tools work seamlessly
  return 'demo-traveler-uid-001';
}

/**
 * Core typed API fetcher that automatically attaches auth headers and unwraps responses.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('/') ? endpoint : `/api/v1/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let jsonResponse: ApiResponse<T>;
  try {
    jsonResponse = await response.json();
  } catch {
    throw new ApiError(
      `Network response was not JSON (HTTP ${response.status})`,
      'INVALID_RESPONSE',
      response.status
    );
  }

  if (!jsonResponse.success) {
    throw new ApiError(
      jsonResponse.error.message,
      jsonResponse.error.code,
      response.status,
      jsonResponse.error.details
    );
  }

  return jsonResponse.data;
}

/**
 * Typed client endpoints.
 */
export const apiClient = {
  // Health
  getHealth: () => apiFetch<HealthStatusResult>('/api/v1/health'),

  // Profile
  getProfile: () => apiFetch<any>('/api/v1/profile'),
  updateProfile: (profile: any) =>
    apiFetch<any>('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile }),
    }),
  updatePreferences: (preferences: any) =>
    apiFetch<any>('/api/v1/profile', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    }),

  // Schedule & Calendar
  getSchedule: () => apiFetch<any>('/api/v1/schedule'),
  updateSchedule: (data: any) =>
    apiFetch<any>('/api/v1/schedule', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getCalendar: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    return apiFetch<any>(`/api/v1/calendar?${params.toString()}`);
  },
  setDaySchedule: (dayData: any) =>
    apiFetch<any>('/api/v1/calendar', {
      method: 'POST',
      body: JSON.stringify(dayData),
    }),

  // Travel
  getTravelProfile: () => apiFetch<any>('/api/v1/travel'),

  // Trips
  listTrips: (filter: { status?: string; startDate?: string } = {}) => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.startDate) params.set('startDate', filter.startDate);
    return apiFetch<any>(`/api/v1/trips?${params.toString()}`);
  },
  createTrip: (tripData: any) =>
    apiFetch<any>('/api/v1/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    }),
  updateTrip: (tripId: string, tripData: any) =>
    apiFetch<any>(`/api/v1/trips?id=${tripId}`, {
      method: 'PATCH',
      body: JSON.stringify({ id: tripId, ...tripData }),
    }),

  // Expenses
  listExpenses: (filter: { category?: string; tripId?: string; startDate?: string; endDate?: string } = {}) => {
    const params = new URLSearchParams();
    if (filter.category) params.set('category', filter.category);
    if (filter.tripId) params.set('tripId', filter.tripId);
    if (filter.startDate) params.set('startDate', filter.startDate);
    if (filter.endDate) params.set('endDate', filter.endDate);
    return apiFetch<any>(`/api/v1/expenses?${params.toString()}`);
  },
  createExpense: (expenseData: any) =>
    apiFetch<any>('/api/v1/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    }),
  deleteExpense: (expenseId: string) =>
    apiFetch<any>(`/api/v1/expenses?id=${expenseId}`, {
      method: 'DELETE',
    }),

  // Analytics & Optimization
  getAnalytics: () => apiFetch<any>('/api/v1/analytics'),
  runOptimizer: () => apiFetch<any>('/api/v1/optimizer', { method: 'POST' }),

  // Scenarios
  listScenarios: () => apiFetch<any>('/api/v1/scenarios'),
  createScenario: (data: any) =>
    apiFetch<any>('/api/v1/scenarios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // AI Assistant
  getAIHistory: (conversationId: string = 'default') =>
    apiFetch<any>(`/api/v1/ai?conversationId=${conversationId}`),
  sendAIMessage: (content: string, conversationId?: string) =>
    apiFetch<any>('/api/v1/ai', {
      method: 'POST',
      body: JSON.stringify({ content, conversationId }),
    }),
  chatAI: (params: { message: string; mode?: string; history?: any[]; dateRange?: any; autonomySetting?: string; confirmedActionId?: string }) =>
    apiFetch<any>('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  executeAIAction: (actionId: string) =>
    apiFetch<any>('/api/v1/ai/actions/execute', {
      method: 'POST',
      body: JSON.stringify({ actionId }),
    }),
  undoAIAction: (actionId?: string) =>
    apiFetch<any>('/api/v1/ai/actions/undo', {
      method: 'POST',
      body: JSON.stringify({ actionId }),
    }),

  // Notifications
  listNotifications: (filter: { unreadOnly?: boolean; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (filter.unreadOnly) params.set('unreadOnly', 'true');
    if (filter.limit) params.set('limit', filter.limit.toString());
    return apiFetch<any>(`/api/v1/notifications?${params.toString()}`);
  },
  markNotificationRead: (id: string) =>
    apiFetch<any>(`/api/v1/notifications?id=${id}`, {
      method: 'PATCH',
    }),
  markAllNotificationsRead: () =>
    apiFetch<any>('/api/v1/notifications?markAll=true', {
      method: 'PATCH',
    }),
  deleteNotification: (id: string) =>
    apiFetch<any>(`/api/v1/notifications?id=${id}`, {
      method: 'DELETE',
    }),
  clearNotifications: () =>
    apiFetch<any>('/api/v1/notifications?clearAll=true', {
      method: 'DELETE',
    }),
  registerPushToken: (token: string, deviceInfo?: string) =>
    apiFetch<any>('/api/v1/notifications/token', {
      method: 'POST',
      body: JSON.stringify({ token, deviceInfo }),
    }),
  removePushToken: (token: string) =>
    apiFetch<any>('/api/v1/notifications/token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    }),

  // Account & Data Management
  exportUserData: () => apiFetch<any>('/api/v1/profile?action=export'),
  deleteUserAccount: () => apiFetch<any>('/api/v1/profile', { method: 'DELETE' }),

  // Generic HTTP helpers
  get: <T = any>(url: string) => apiFetch<T>(url.startsWith('/') ? url : `/api/v1/${url}`),
  post: <T = any>(url: string, data?: any) =>
    apiFetch<T>(url.startsWith('/') ? url : `/api/v1/${url}`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T = any>(url: string) =>
    apiFetch<T>(url.startsWith('/') ? url : `/api/v1/${url}`, {
      method: 'DELETE',
    }),
};

