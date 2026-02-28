import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create admin axios instance
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add admin token to requests
adminApi.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (adminToken && adminUser) {
      config.headers['X-Admin-Token'] = adminToken;
      config.headers['X-Admin-User'] = adminUser;
    }
    
    // Also check for regular token for backend API calls
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Admin Complaint API
export const adminComplaintAPI = {
  // Get all complaints (Root Admin) - using regular complaints endpoint
  getAllComplaints: (params) => adminApi.get('/complaints/all/', { params }),
  
  // Get complaints by cluster (Sub-Admin) - using regular complaints endpoint, filter on frontend
  getClusterComplaints: (clusterId, params) => 
    adminApi.get('/complaints/all/', { params }),
  
  // Get complaints by department (Department Admin) - using regular complaints endpoint, filter on frontend
  getDepartmentComplaints: (departmentId, params) => 
    adminApi.get('/complaints/all/', { params }),
  
  // Get single complaint with full details
  getComplaintDetail: (id) => adminApi.get(`/complaints/${id}/`),
  
  // Verify complaint
  verifyComplaint: (id, data) => 
    adminApi.post(`/complaints/${id}/verify/`, data),
  
  // Reject complaint
  rejectComplaint: (id, reason) => 
    adminApi.post(`/complaints/${id}/reject/`, { reason }),
  
  // Assign to worker
  assignToWorker: (id, workerId, notes, slaHours) => 
    adminApi.post(`/complaints/${id}/assign/`, { worker_id: workerId, notes, sla_hours: slaHours }),
  
  // Update status
  updateStatus: (id, status, notes, completionImage = null) => {
    const formData = new FormData();
    formData.append('status', status);
    if (notes) formData.append('note', notes);
    if (completionImage) formData.append('completion_image', completionImage);
    
    return adminApi.post(`/complaints/${id}/update-status/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Reassign complaint to different department
  reassignDepartment: (id, newDepartmentId, reason) => 
    adminApi.post(`/complaints/${id}/reassign/`, { 
      department_id: newDepartmentId, 
      reason 
    }),

  // Assign a specific office to a complaint
  assignOffice: (id, officeId, notes = '') =>
    adminApi.post(`/complaints/${id}/assign-office/`, { office_id: officeId, notes }),

  // Delete complaint (Sub-Admin and Root Admin only)
  deleteComplaint: (id, reason) => 
    adminApi.delete(`/complaints/${id}/delete/`, { data: { reason } }),
  
  // Mark as completed with photo
  markCompleted: (id, completionImage, notes) => {
    const formData = new FormData();
    formData.append('completion_image', completionImage);
    formData.append('note', notes);
    formData.append('status', 'COMPLETED');
    return adminApi.post(`/complaints/${id}/update-status/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Get complaint logs
  getComplaintLogs: (id) => adminApi.get(`/complaints/${id}/logs/`),
  
  // Bulk operations
  bulkAssign: (complaintIds, workerId) => 
    adminApi.post('/admin/complaints/bulk-assign/', { complaint_ids: complaintIds, worker_id: workerId }),
  
  bulkDelete: (complaintIds, reason) => 
    adminApi.post('/admin/complaints/bulk-delete/', { complaint_ids: complaintIds, reason })
};

// Admin Department API
export const adminDepartmentAPI = {
  // Get all departments
  getAll: () => adminApi.get('/admin/departments/'),
  
  // Get department details
  getDetail: (departmentId) => adminApi.get(`/admin/departments/${departmentId}/`),
  
  // Get departments by cluster
  getClusterDepartments: (clusterId) => 
    adminApi.get(`/admin/clusters/${clusterId}/departments/`),
  
  // Get department statistics
  getStats: (departmentId, params) => 
    adminApi.get(`/admin/departments/${departmentId}/stats/`, { params }),
  
  // Get cities for department
  getCities: (departmentId) => 
    adminApi.get(`/admin/departments/${departmentId}/cities/`)
};

// Admin Office API
export const adminOfficeAPI = {
  // Get all offices
  getAll: (params) => adminApi.get('/offices/', { params }),
  
  // Get offices by department
  getByDepartment: (departmentId, params) => 
    adminApi.get('/offices/', { params: { ...params, department_id: departmentId } }),
  
  // Get offices by city
  getByCity: (city, params) => 
    adminApi.get('/offices/', { params: { ...params, city } }),
  
  // Create office
  create: (data) => adminApi.post('/offices/', data),
  
  // Update office
  update: (officeId, data) => adminApi.put(`/offices/${officeId}/`, data),
  
  // Delete office
  delete: (officeId) => adminApi.delete(`/offices/${officeId}/`)
};

// Admin Worker API
export const adminWorkerAPI = {
  // Get all workers
  getAll: (params) => adminApi.get('/workers/', { params }),
  
  // Get workers by department
  getByDepartment: (departmentId, params) => 
    adminApi.get('/workers/', { params: { ...params, department: departmentId } }),
  
  // Get workers by office
  getByOffice: (officeId, params) => 
    adminApi.get('/workers/', { params: { ...params, office: officeId } }),
  
  // Get worker details
  getDetail: (workerId) => adminApi.get(`/workers/${workerId}/`),
  
  // Create worker
  create: (data) => adminApi.post('/workers/create/', data),
  
  // Update worker
  update: (workerId, data) => adminApi.put(`/workers/${workerId}/`, data),
  
  // Delete worker
  delete: (workerId) => adminApi.delete(`/workers/${workerId}/`),
  
  // Delete all workers
  deleteAll: () => adminApi.post('/workers/delete-all/'),
  
  // Get worker assignments
  getAssignments: (workerId, params) => 
    adminApi.get(`/workers/${workerId}/assignments/`, { params }),
  
  // Get worker attendance
  getAttendance: (workerId, params) => 
    adminApi.get(`/workers/${workerId}/attendance/`, { params })
};

// Admin Attendance API
export const adminAttendanceAPI = {
  // Get attendance register - new API for register-style view
  getRegister: (date, city, departmentId) => 
    adminApi.get('/attendance/register/', {
      params: { date, city, department_id: departmentId }
    }),
  
  // Bulk mark workers as present
  bulkMarkPresent: (workerIds, date) => 
    adminApi.post('/attendance/bulk-mark/', {
      worker_ids: workerIds,
      date: date,
      check_in_time: new Date().toTimeString().split(' ')[0]
    }),
  
  // Get attendance records (old API)
  getRecords: (params) => adminApi.get('/attendance/', { params }),
  
  // Get attendance by department
  getByDepartment: (departmentId, params) => 
    adminApi.get(`/admin/departments/${departmentId}/attendance/`, { params }),
  
  // Get attendance by city
  getByCity: (city, date, departmentId) => 
    adminApi.get('/admin/attendance/city/', { 
      params: { city, date, department: departmentId } 
    }),
  
  // Verify city password for attendance
  verifyCityPassword: (city, departmentId, password) => 
    adminApi.post('/admin/attendance/verify-city/', { 
      city, 
      department: departmentId, 
      password 
    }),
  
  // Mark attendance (with city password)
  markAttendance: (data, cityPassword) => 
    adminApi.post('/attendance/mark/', { ...data, city_password: cityPassword }),
  
  // Bulk mark attendance
  bulkMark: (records, cityPassword) => 
    adminApi.post('/admin/attendance/bulk-mark/', { records, city_password: cityPassword }),
  
  // Get attendance summary
  getSummary: (departmentId, params) => 
    adminApi.get(`/admin/departments/${departmentId}/attendance-summary/`, { params })
};

// Admin Dashboard API
export const adminDashboardAPI = {
  // Get overall statistics (Root Admin) - using regular dashboard endpoint
  getOverallStats: () => adminApi.get('/dashboard/stats/'),
  
  // Get cluster statistics (Sub-Admin)
  getClusterStats: (clusterId) => 
    adminApi.get(`/admin/clusters/${clusterId}/stats/`),
  
  // Get department statistics (Department Admin)
  getDepartmentStats: (departmentId, city = null) => 
    adminApi.get(`/admin/departments/${departmentId}/stats/`, { 
      params: city ? { city } : {} 
    }),
  
  // Get performance metrics
  getPerformanceMetrics: (params) => 
    adminApi.get('/admin/dashboard/performance/', { params }),
  
  // Get recent activities
  getRecentActivities: (params) => 
    adminApi.get('/admin/dashboard/activities/', { params })
};

// Admin City Management API
export const adminCityAPI = {
  // Get all cities
  getAll: () => adminApi.get('/admin/cities/'),
  
  // Get cities by department
  getByDepartment: (departmentId) => 
    adminApi.get(`/admin/departments/${departmentId}/cities/`),
  
  // Set/update city password for attendance
  setCityPassword: (city, departmentId, password) => 
    adminApi.post('/admin/cities/set-password/', { 
      city, 
      department: departmentId, 
      password 
    }),
  
  // Get city details
  getCityDetail: (city, departmentId) => 
    adminApi.get('/admin/cities/detail/', { 
      params: { city, department: departmentId } 
    })
};

// SLA Management API
export const slaAPI = {
  // Get all SLA configurations (per category)
  getConfigs: () => adminApi.get('/sla/configs/'),

  // Update a single SLA config
  updateConfig: (id, data) => adminApi.patch(`/sla/configs/${id}/`, data),

  // Get SLA compliance report
  getReport: () => adminApi.get('/sla/report/'),

  // Trigger auto-escalation (dry_run=true for preview)
  triggerEscalation: (dryRun = false) =>
    adminApi.post('/sla/trigger-escalation/', { dry_run: dryRun }),
};

export default adminApi;
