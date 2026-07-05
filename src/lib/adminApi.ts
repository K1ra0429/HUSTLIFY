// Thin client for the `admin-api` edge function that powers /admin.
// Session token is kept in localStorage so the panel survives page reloads.

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;
const TOKEN_KEY = 'admin_session_token';

export const adminAuth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => !!localStorage.getItem(TOKEN_KEY),
};

class AdminApiError extends Error {}

async function call<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = adminAuth.getToken();
  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    if (res.status === 401) adminAuth.clearToken();
    throw new AdminApiError(data?.error || `Ошибка запроса (${res.status})`);
  }
  return data as T;
}

export const adminApi = {
  login: async (password: string) => {
    const { token } = await call<{ token: string }>('login', { password });
    adminAuth.setToken(token);
  },
  logout: () => adminAuth.clearToken(),

  cases: {
    list: () => call<{ data: any[] }>('cases.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('cases.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('cases.delete', { id }),
  },
  categories: {
    list: () => call<{ data: any[] }>('categories.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('categories.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('categories.delete', { id }),
  },
  projects: {
    list: () => call<{ data: any[] }>('projects.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('projects.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('projects.delete', { id }),
  },
  products: {
    list: () => call<{ data: any[] }>('products.list').then((r) => r.data),
    upsert: (row: any) => call<{ data: any }>('products.upsert', { row }).then((r) => r.data),
    remove: (id: string) => call('products.delete', { id }),
  },
  reviews: {
    list: () => call<{ data: any[] }>('reviews.list').then((r) => r.data),
    setStatus: (id: string, status: 'approved' | 'rejected' | 'pending') =>
      call('reviews.setStatus', { id, status }),
    update: (id: string, row: any) => call('reviews.update', { id, row }),
    remove: (id: string) => call('reviews.delete', { id }),
  },
  settings: {
    list: () => call<{ data: { key: string; value: string }[] }>('settings.list').then((r) => r.data),
    set: (key: string, value: string) => call('settings.set', { key, value }),
  },
};

export { AdminApiError };
