import api from './api';

export const authService = {
  login: async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    return data.user;
  },
  getMe: async () => {
    try {
      return await api.get('/auth/me');
    } catch (error) {
      localStorage.removeItem('token');
      throw error;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
  }
};
