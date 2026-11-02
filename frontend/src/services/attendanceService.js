import api from './api';

const attendanceService = {
  list: async (params) => (await api.get('/attendance', { params })).data,
  trend: async (params) => (await api.get('/attendance/trend', { params })).data,
  bulkMark: async (payload) => (await api.post('/attendance/bulk', payload)).data,
  remove: async (id) => (await api.delete(`/attendance/${id}`)).data,
};

export default attendanceService;
