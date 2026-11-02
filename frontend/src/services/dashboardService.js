import api from './api';

const dashboardService = {
  get: async () => (await api.get('/dashboard')).data,
};

export default dashboardService;
