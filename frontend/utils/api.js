import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: () => api.post('/auth/logout/'),
  getCurrentUser: () => api.get('/auth/me/'),
};

// Complaint API
export const complaintAPI = {
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });
    return api.post('/complaints/create/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMyComplaints: () => api.get('/complaints/my/'),
  getUpvotedComplaints: () => api.get('/complaints/upvoted/'),
  getAllComplaints: (params) => api.get('/complaints/all/', { params }),
  getComplaint: (id) => api.get(`/complaints/${id}/`),
  upvote: (id) => api.post(`/complaints/${id}/upvote/`),
  getLogs: (id) => api.get(`/complaints/${id}/logs/`),
  assignToWorker: (id, workerId) => api.post(`/complaints/${id}/assign/`, { worker_id: workerId }),
  updateStatus: (id, data) => api.post(`/complaints/${id}/update-status/`, data),
  reject: (id, reason) => api.post(`/complaints/${id}/reject/`, { reason }),
  delete: (id) => api.delete(`/complaints/${id}/delete/`),
};

// Department API
export const departmentAPI = {
  getComplaints: (params) => api.get('/department/complaints/', { params }),
  getAll: () => api.get('/departments/'),
  getCategories: () => api.get('/categories/'),
};

// Worker API
export const workerAPI = {
  getAssignments: () => api.get('/worker/assignments/'),
};

// Attendance API
export const attendanceAPI = {
  mark: (data) => api.post('/attendance/mark/', data),
  get: (params) => api.get('/attendance/', { params }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
};

export default api;
