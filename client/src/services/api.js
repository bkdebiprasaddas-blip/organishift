import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Build a human-readable message from the server's error envelope.
 *
 * The server returns per-field validation problems in `error.details`
 * (see middleware/errorMiddleware.js), but the top-level `message` is the
 * generic "Validation failed". Every toast in the app renders `err.message`, so
 * without this a user pasting 1,400 characters into a 1,000-char field was told
 * only that "Validation failed" — with no indication of which field or why.
 */
function toDisplayMessage(err) {
  const details = err.details;
  if (!Array.isArray(details) || details.length === 0) return err.message;

  const parts = details
    .map(d => {
      if (!d) return null;
      const field = d.field ? d.field.split('.').pop() : null;
      const text = d.message || 'Invalid value';
      return field ? `${field}: ${text}` : text;
    })
    .filter(Boolean);

  if (parts.length === 0) return err.message;
  // Keep toasts to one readable line; the full list stays on the error object.
  const head = parts.slice(0, 2).join('; ');
  return parts.length > 2 ? `${head} (+${parts.length - 2} more)` : head;
}

// Response interceptor: unwrap envelope, handle errors, redirect on 401.
// On success the envelope's `message` is intentionally dropped — every caller
// writes its own toast copy (often more specific than the generic server
// message, e.g. `Event "${event.title}" deleted`), so there's nothing to wire up.
api.interceptors.response.use(
  (response) => {
    return response.data.data;
  },
  (error) => {
    if (error.response?.data?.error) {
      const raw = error.response.data.error;
      const err = { ...raw, message: toDisplayMessage(raw) };
      // CL-M2: global 401 handling — clear token + redirect to login.
      // Skip for the login request itself: a bad-credentials 401 there is a
      // normal form error, not an expired session, and should not hard-reload
      // the page (which wipes the error message before it can be read).
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (error.response.status === 401 && !isLoginRequest) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }
    return Promise.reject({ message: 'Network Error: Could not connect to server' });
  }
);

export default api;
