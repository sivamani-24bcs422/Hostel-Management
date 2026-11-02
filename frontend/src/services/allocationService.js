import api from './api';

const allocationService = {
  list: async (params) => (await api.get('/allocations', { params })).data,
  mine: async () => (await api.get('/allocations/my')).data,
  create: async (payload) => (await api.post('/allocations', payload)).data,
  vacate: async (id, reason) => (await api.put(`/allocations/${id}/vacate`, { reason })).data,
};

export default allocationService;
