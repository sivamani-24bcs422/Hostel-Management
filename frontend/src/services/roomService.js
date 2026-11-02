import api from './api';

const roomService = {
  list: async (params) => (await api.get('/rooms', { params })).data,
  get: async (id) => (await api.get(`/rooms/${id}`)).data,
  create: async (payload) => (await api.post('/rooms', payload)).data,
  update: async (id, payload) => (await api.put(`/rooms/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/rooms/${id}`)).data,
};

export default roomService;
