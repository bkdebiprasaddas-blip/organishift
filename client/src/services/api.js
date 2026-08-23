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

// Response interceptor: unwrap envelope and handle errors
api.interceptors.response.use(
  (response) => {
    return response.data.data;
  },
  (error) => {
    if (error.response && error.response.data) {
      return Promise.reject(error.response.data.error || { message: 'An unknown error occurred' });
    }
    return Promise.reject({ message: 'Network Error: Could not connect to server' });
  }
);

export default api;
