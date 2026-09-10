import axios from 'axios';

const getDefaultBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    // Local network testing on WiFi (e.g. mobile testing on 192.168.x.x)
    if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
      return `http://${hostname}:5000`;
    }
  }
  // Live Production Backend on Render
  return 'https://message-server-uaik.onrender.com';
};

let rawUrl = import.meta.env.VITE_API_URL;
if (!rawUrl || rawUrl.includes('message-server-six.vercel.app') || rawUrl.includes('undefined')) {
  rawUrl = getDefaultBaseUrl();
}
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
      const authHeader = error.config?.headers?.Authorization;
      const msg = error.response?.data?.message?.toLowerCase() || '';
      
      // Only wipe session if the request actually provided a token and server rejected it as expired or invalid
      if (authHeader && (msg.includes('expired') || msg.includes('invalid') || msg.includes('user not found'))) {
        console.warn('Session expired or unauthorized - clearing stale token');
        localStorage.removeItem('aurawave_token');
        localStorage.removeItem('aurawave_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('aurawave-unauthorized'));
        }
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
