import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const http = axios.create({ baseURL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('organishift_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('organishift_token');
      localStorage.removeItem('organishift_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default http;
