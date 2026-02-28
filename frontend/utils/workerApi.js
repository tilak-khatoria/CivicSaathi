import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance for worker
const workerApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
workerApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('worker_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
workerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('worker_token');
      localStorage.removeItem('worker');
      window.location.href = '/worker/login';
    }
    return Promise.reject(error);
  }
);

// Worker Auth API
export const workerAuthAPI = {
  login: (data) => workerApi.post('/worker/login/', data),
  logout: () => workerApi.post('/worker/logout/'),
  getCurrentWorker: () => workerApi.get('/worker/me/'),
};

// Worker Complaints API
export const workerComplaintsAPI = {
  getAssignedComplaints: () => workerApi.get('/worker/assignments/'),
  getPendingComplaints: () => workerApi.get('/worker/complaints/pending/'),
  getCompletedComplaints: () => workerApi.get('/worker/complaints/completed/'),
  getOverdueComplaints: () => workerApi.get('/worker/complaints/overdue/'),
  getComplaintDetail: (id) => workerApi.get(`/worker/complaints/${id}/`),
  updateComplaintStatus: (id, data) => workerApi.post(`/worker/complaints/${id}/update/`, data),
  submitCompletion: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return workerApi.post(`/worker/complaints/${id}/complete/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Worker Dashboard API
export const workerDashboardAPI = {
  getStats: () => workerApi.get('/worker/dashboard/stats/'),
};

// Worker Notifications API (Multi-Channel Alert System)
export const workerNotificationsAPI = {
  getNotifications: (unreadOnly = false) =>
    workerApi.get('/worker/notifications/', { params: unreadOnly ? { unread_only: 'true' } : {} }),
  markRead: (id) => workerApi.post(`/worker/notifications/${id}/read/`),
  markAllRead: () => workerApi.post('/worker/notifications/mark-all-read/'),
};

export default workerApi;
