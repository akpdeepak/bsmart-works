// bSmart Works — single API client (CLAUDE.md §3: all HTTP goes through this wrapper).
// The one place in the app allowed to call fetch(). Reads the auth token from the persisted
// session, injects the Authorization header, and prefixes the API base URL.

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

function authToken() {
  try {
    return JSON.parse(localStorage.getItem('bSmartSession') || 'null')?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(extra = {}, { json = true } = {}) {
  const token = authToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// Low-level request. Returns the raw Response (so callers can use res.ok / res.json()
// exactly as they did with fetch). `path` may be an absolute URL or an API-relative path.
export function apiRaw(path, opts = {}) {
  const { method = 'GET', body, headers, formData } = opts;
  const payload = formData ?? body;
  const isForm = payload instanceof FormData;
  const fetchOpts = { method, headers: authHeaders(headers, { json: !isForm }) };
  if (payload !== undefined && payload !== null) {
    fetchOpts.body = isForm || typeof payload === 'string' ? payload : JSON.stringify(payload);
  }
  const url = path.startsWith('http') ? path : `${API}${path}`;
  return fetch(url, fetchOpts);
}

export const api = {
  base: API,

  // Returns the raw Response — drop-in for fetch().
  raw: apiRaw,

  // Throw-on-error + parsed JSON.
  // Maps the standard API error shape { code, message, field? } (CLAUDE.md §3) to an Error
  // whose message is the human-readable string. Falls back to err.error for legacy callers.
  async send(path, opts = {}) {
    const res = await apiRaw(path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      const message = err.message || err.error || `Request failed: ${res.status}`;
      const apiError = new Error(message);
      apiError.code = err.code ?? null;
      apiError.field = err.field ?? null;
      apiError.status = res.status;
      throw apiError;
    }
    return res.json();
  },
};
