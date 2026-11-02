import api, { downloadBlob } from './api';

const reportService = {
  overview: async (params) => (await api.get('/reports/overview', { params })).data,
  download: async (type, params = {}) => {
    const blob = (await api.get(`/reports/export/${type}`, { params, responseType: 'blob' })).data;
    downloadBlob(blob, `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`);
  },
};

export default reportService;
