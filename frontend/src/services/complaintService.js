import api from './api';

const complaintService = {
  list: async (params) => (await api.get('/complaints', { params })).data,
  get: async (id) => (await api.get(`/complaints/${id}`)).data,
  create: async (payload) => (await api.post('/complaints', payload)).data,
  update: async (id, payload) => (await api.put(`/complaints/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/complaints/${id}`)).data,
};

export default complaintService;
