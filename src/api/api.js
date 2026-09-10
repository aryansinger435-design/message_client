import axios from 'axios';

const getDefaultBaseUrl = () => {
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return `http://${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
};

const rawUrl = import.meta.env.VITE_API_URL || getDefaultBaseUrl();
export const API_BASE_URL = rawUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aurawave_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized - clearing stale token');
      localStorage.removeItem('aurawave_token');
      localStorage.removeItem('aurawave_user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aurawave-unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const getFullMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default api;
