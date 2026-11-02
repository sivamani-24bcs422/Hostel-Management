import api from './api';

const feeService = {
  list: async (params) => (await api.get('/fees', { params })).data,
  summary: async (params) => (await api.get('/fees/summary', { params })).data,
  get: async (id) => (await api.get(`/fees/${id}`)).data,
  create: async (payload) => (await api.post('/fees', payload)).data,
  update: async (id, payload) => (await api.put(`/fees/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/fees/${id}`)).data,
  generate: async (payload) => (await api.post('/fees/generate', payload)).data,
};

export default feeService;
