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

// Response interceptor: unwrap envelope, handle errors, redirect on 401.
// Intentionally drops the envelope's `message` on success — every caller
// writes its own toast copy (often more specific than the generic server
// message, e.g. `Event "${event.title}" deleted`), so there's nothing to wire up.
api.interceptors.response.use(
  (response) => {
    return response.data.data;
  },
  (error) => {
    if (error.response?.data?.error) {
      const err = error.response.data.error;
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
