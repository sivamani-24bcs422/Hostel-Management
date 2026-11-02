import api from './api';

const hostelService = {
  list: async (params) => (await api.get('/hostels', { params })).data,
  get: async (id) => (await api.get(`/hostels/${id}`)).data,
  create: async (payload) => (await api.post('/hostels', payload)).data,
  update: async (id, payload) => (await api.put(`/hostels/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/hostels/${id}`)).data,
};

export default hostelService;
