import api from './api';

const paymentService = {
  list: async (params) => (await api.get('/payments', { params })).data,
  get: async (id) => (await api.get(`/payments/${id}`)).data,
  record: async (payload) => (await api.post('/payments', payload)).data,
  receipt: async (id) => (await api.get(`/payments/${id}/receipt`, { responseType: 'blob' })).data,
};

export default paymentService;
