const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const buildSort = (sortBy, order, fallback = '-createdAt') => {
  if (!sortBy) return fallback;
  return `${order === 'asc' ? '' : '-'}${sortBy}`;
};

const toCsv = (headers, rows) => {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');
};

const sendCsv = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
};

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const dateRangeFilter = (from, to, field = 'createdAt') => {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    if (!String(to).includes('T')) end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
};

module.exports = {
  escapeRegex,
  buildPagination,
  buildSort,
  toCsv,
  sendCsv,
  round2,
  dateRangeFilter,
};
