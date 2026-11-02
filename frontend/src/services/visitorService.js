import api from './api';

const visitorService = {
  list: async (params) => (await api.get('/visitors', { params })).data,
  create: async (payload) => (await api.post('/visitors', payload)).data,
  update: async (id, payload) => (await api.put(`/visitors/${id}`, payload)).data,
  checkout: async (id) => (await api.put(`/visitors/${id}/checkout`)).data,
  remove: async (id) => (await api.delete(`/visitors/${id}`)).data,
};

export default visitorService;
