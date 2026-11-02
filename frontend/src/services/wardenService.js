import api from './api';

const wardenService = {
  list: async (params) => (await api.get('/wardens', { params })).data,
  get: async (id) => (await api.get(`/wardens/${id}`)).data,
  create: async (payload) => (await api.post('/wardens', payload)).data,
  update: async (id, payload) => (await api.put(`/wardens/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/wardens/${id}`)).data,
};

export default wardenService;
