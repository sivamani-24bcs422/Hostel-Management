export const formatCurrency = (value, options = {}) => {
  const number = Number(value) || 0;
  if (options.compact) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(number);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(number);
};

export const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

export const formatDate = (value, fallback = '—') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value, fallback = '—') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (value, fallback = '—') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (value) => {
  if (!value) return '';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
};

export const titleCase = (value = '') =>
  String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'HH';

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';

export const statusTone = (status) => {
  const map = {
    active: 'success',
    paid: 'success',
    present: 'success',
    resolved: 'success',
    checked_out: 'neutral',
    success: 'success',
    available: 'success',
    partial: 'warning',
    pending: 'warning',
    in_progress: 'info',
    late: 'warning',
    checked_in: 'info',
    open: 'danger',
    overdue: 'danger',
    absent: 'danger',
    rejected: 'danger',
    full: 'danger',
    maintenance: 'warning',
    vacated: 'neutral',
    inactive: 'neutral',
    graduated: 'info',
    low: 'neutral',
    medium: 'warning',
    high: 'danger',
    normal: 'neutral',
    urgent: 'danger',
    boys: 'info',
    girls: 'pink',
    'co-ed': '-purple',
    admin: 'purple',
    warden: 'info',
    student: 'neutral',
    leave: 'info',
    cash: 'neutral',
    upi: 'info',
    card: 'purple',
    netbanking: 'info',
    bank_transfer: 'warning',
    all: 'purple',
    students: 'info',
    wardens: 'warning',
    hostel: 'pink',
    single: 'neutral',
    double: 'info',
    triple: 'purple',
    quad: 'warning',
    hostel_rent: 'purple',
    mess: 'warning',
    security_deposit: 'info',
    fine: 'danger',
    other: 'neutral',
    wifi: 'info',
    food: 'warning',
    security: 'danger',
    cleanliness: 'success',
    maintenance_category: 'warning',
  };
  return map[status] || 'neutral';
};

export const todayISO = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};

export const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const emptyToNull = (value) => (value === '' || value === undefined ? null : value);

export const platform = typeof navigator !== 'undefined' ? navigator.platform : '';
