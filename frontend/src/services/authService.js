import api from './api';

const authService = {
  login: async (credentials) => (await api.post('/auth/login', credentials)).data,
  me: async () => (await api.get('/auth/me')).data,
  updateProfile: async (payload) => (await api.put('/auth/profile', payload)).data,
  changePassword: async (payload) => (await api.put('/auth/password', payload)).data,
  logout: async () => (await api.post('/auth/logout')).data,
};

export default authService;
