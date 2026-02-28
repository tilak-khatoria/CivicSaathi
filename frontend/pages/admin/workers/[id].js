import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../../components/AdminNavbar';

export default function WorkerDetail() {
  const { adminUser, loading, isRootAdmin, isDepartmentAdmin } = useAdminAuth();
  const router = useRouter();
  const { id } = router.query;
  const [worker, setWorker] = useState(null);
  const [workerStats, setWorkerStats] = useState(null);
  const [workerComplaints, setWorkerComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [departments, setDepartments] = useState([]);
  const [offices, setOffices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser && id) {
      fetchWorkerDetail();
      fetchWorkerStatistics();
      fetchWorkerComplaints();
      fetchDepartments();
    }
  }, [adminUser, loading, id]);

  useEffect(() => {
    if (editForm.department_id) {
      fetchOffices(editForm.department_id);
    }
  }, [editForm.department_id]);

  const fetchWorkerDetail = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/workers/${id}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setWorker(data);
      setEditForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        department_id: data.department || '',
        office_id: data.office || '',
        role: data.role || '',
        city: data.city || '',
        state: data.state || '',
        is_active: data.is_active
      });
    } catch (error) {
      console.error('Error fetching worker:', error);
      setError('Failed to load worker details');
    } finally {
      setLoadingData(false);
    }
  };
  const fetchWorkerStatistics = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/workers/${id}/statistics/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkerStats(data);
      }
    } catch (error) {
      console.error('Error fetching worker statistics:', error);
    }
  };

  const fetchWorkerComplaints = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/workers/${id}/complaints/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkerComplaints(data);
      }
    } catch (error) {
      console.error('Error fetching worker complaints:', error);
    }
  };
  
  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/departments/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchOffices = async (departmentId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/offices/?department_id=${departmentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOffices(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:8000/api/workers/${id}/update/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Worker updated successfully!');
        setWorker(data);
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to update worker');
      }
    } catch (error) {
      console.error('Error updating worker:', error);
      setError('Failed to update worker: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = () => {
    if (isRootAdmin) return true;
    if (isDepartmentAdmin && worker && adminUser.departmentId === worker.department) return true;
    return false;
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error && !worker) {
    return (
      <>
        <Head><title>Worker Not Found - Admin</title></Head>
        <div style={styles.container}>
          <AdminNavbar />
          <main style={styles.main}>
            <div style={styles.content}>
              <Link href="/admin/workers" style={styles.backLink}>
                ← Back to Workers
              </Link>
              <div style={styles.errorCard}>
                <h2 style={styles.errorTitle}>Worker Not Found</h2>
                <p style={styles.errorText}>{error || 'The worker you are looking for does not exist.'}</p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  const fullName = `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || worker.username;

  return (
    <>
      <Head><title>{fullName} - Worker Details</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <Link href="/admin/workers" style={styles.backLink}>
              ← Back to Workers
            </Link>

            {successMessage && (
              <div style={styles.successAlert}>
                ✅ {successMessage}
              </div>
            )}

            {error && (
              <div style={styles.errorAlert}>
                ⚠️ {error}
              </div>
            )}

            <div style={styles.headerSection}>
              <div style={styles.avatarLarge}>
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div style={styles.headerInfo}>
                <h1 style={styles.name}>{fullName}</h1>
                <p style={styles.role}>{worker.role}</p>
                <div style={styles.statusBadge}>
                  {worker.is_active ? '🟢 Active' : '🔴 Inactive'}
                </div>
              </div>
              {canEdit() && !isEditing && (
                <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                  ✏️ Edit Details
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} style={styles.editForm}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>First Name *</label>
                    <input
                      type="text"
                      name="first_name"
                      value={editForm.first_name}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Last Name *</label>
                    <input
                      type="text"
                      name="last_name"
                      value={editForm.last_name}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleInputChange}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleInputChange}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Department *</label>
                    {isRootAdmin ? (
                      <select
                        name="department_id"
                        value={editForm.department_id}
                        onChange={handleInputChange}
                        style={styles.select}
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={worker.department_name}
                        style={{ ...styles.input, backgroundColor: '#0a1221', cursor: 'not-allowed', opacity: 0.6 }}
                        readOnly
                      />
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Office</label>
                    <select
                      name="office_id"
                      value={editForm.office_id}
                      onChange={handleInputChange}
                      style={styles.select}
                    >
                      <option value="">No Office</option>
                      {offices.map(office => (
                        <option key={office.id} value={office.id}>
                          {office.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Role *</label>
                    <input
                      type="text"
                      name="role"
                      value={editForm.role}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>City *</label>
                    <input
                      type="text"
                      name="city"
                      value={editForm.city}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>State *</label>
                    <input
                      type="text"
                      name="state"
                      value={editForm.state}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={editForm.is_active}
                        onChange={handleInputChange}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>Active Worker</span>
                    </label>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setError('');
                      setEditForm({
                        first_name: worker.first_name || '',
                        last_name: worker.last_name || '',
                        email: worker.email || '',
                        phone: worker.phone || '',
                        department_id: worker.department || '',
                        office_id: worker.office || '',
                        role: worker.role || '',
                        city: worker.city || '',
                        state: worker.state || '',
                        is_active: worker.is_active
                      });
                    }}
                    style={styles.cancelButton}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      ...styles.saveButton,
                      opacity: submitting ? 0.6 : 1,
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={styles.grid}>
                {/* Personal Information */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Personal Information</h2>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Username</span>
                      <span style={styles.value}>{worker.username}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Email</span>
                      <span style={styles.value}>{worker.email || 'N/A'}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Phone</span>
                      <span style={styles.value}>{worker.phone || 'N/A'}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Worker ID</span>
                      <span style={styles.value}>#{worker.id}</span>
                    </div>
                  </div>
                </div>

                {/* Work Information */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Work Information</h2>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Department</span>
                      <span style={styles.value}>{worker.department_name}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Office</span>
                      <span style={styles.value}>{worker.office_name || 'Not assigned'}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Role</span>
                      <span style={styles.value}>{worker.role}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Joining Date</span>
                      <span style={styles.value}>
                        {worker.joining_date ? new Date(worker.joining_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Location</h2>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>City</span>
                      <span style={styles.value}>{worker.city}</span>
                    </div>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>State</span>
                      <span style={styles.value}>{worker.state}</span>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                {workerStats && (
                  <>
                    <div style={styles.card}>
                      <h2 style={styles.cardTitle}>Active Tasks</h2>
                      <div style={styles.statNumber}>{workerStats.active_assignments}</div>
                      <div style={styles.statLabel}>Currently In Progress</div>
                    </div>

                    <div style={styles.card}>
                      <h2 style={styles.cardTitle}>Completed Tasks</h2>
                      <div style={{...styles.statNumber, color: '#10b981'}}>{workerStats.completed_assignments}</div>
                      <div style={styles.statLabel}>Successfully Completed</div>
                    </div>

                    <div style={styles.card}>
                      <h2 style={styles.cardTitle}>Total Assignments</h2>
                      <div style={{...styles.statNumber, color: '#3b82f6'}}>{workerStats.total_assignments}</div>
                      <div style={styles.statLabel}>All Time</div>
                    </div>

                    <div style={styles.card}>
                      <h2 style={styles.cardTitle}>Completion Rate</h2>
                      <div style={{...styles.statNumber, color: '#8b5cf6'}}>
                        {workerStats.total_assignments > 0 
                          ? Math.round((workerStats.completed_assignments / workerStats.total_assignments) * 100)
                          : 0}%
                      </div>
                      <div style={styles.statLabel}>Success Rate</div>
                    </div>
                  </>
                )}

                {/* Account Status */}
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Account Status</h2>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>Status</span>
                      <span style={{...styles.value, color: worker.is_active ? '#10b981' : '#ef4444'}}>
                        {worker.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task Lists Section */}
            {worker && workerComplaints.length > 0 && (
              <div>
                  {/* Active Tasks */}
                  <div style={styles.tableCard}>
                    <h2 style={styles.tableTitle}>Active Tasks</h2>
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Title</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Priority</th>
                            <th style={styles.th}>Department</th>
                            <th style={styles.th}>Created</th>
                            <th style={styles.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workerComplaints
                            .filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status))
                            .map(complaint => (
                              <tr key={complaint.id} style={styles.tr}>
                                <td style={styles.td}>#{complaint.id}</td>
                                <td style={styles.td}>{complaint.title}</td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.statusBadgeSmall,
                                    background: complaint.status === 'IN_PROGRESS' ? '#1e40af' : '#854d0e',
                                    color: complaint.status === 'IN_PROGRESS' ? '#93c5fd' : '#fde047'
                                  }}>
                                    {complaint.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.priorityBadge,
                                    background: complaint.priority === 'HIGH' ? '#7f1d1d' : complaint.priority === 'MEDIUM' ? '#78350f' : '#064e3b',
                                    color: complaint.priority === 'HIGH' ? '#fca5a5' : complaint.priority === 'MEDIUM' ? '#fde047' : '#6ee7b7'
                                  }}>
                                    {complaint.priority}
                                  </span>
                                </td>
                                <td style={styles.td}>{complaint.department_name || 'N/A'}</td>
                                <td style={styles.td}>{new Date(complaint.created_at).toLocaleDateString()}</td>
                                <td style={styles.td}>
                                  <button
                                    onClick={() => router.push(`/admin/complaints/${complaint.id}`)}
                                    style={styles.viewButton}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {workerComplaints.filter(c => ['ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length === 0 && (
                        <div style={styles.emptyState}>No active tasks</div>
                      )}
                    </div>
                  </div>

                  {/* Completed Tasks */}
                  <div style={styles.tableCard}>
                    <h2 style={styles.tableTitle}>Completed Tasks</h2>
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Title</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Priority</th>
                            <th style={styles.th}>Department</th>
                            <th style={styles.th}>Created</th>
                            <th style={styles.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workerComplaints
                            .filter(c => c.status === 'COMPLETED')
                            .map(complaint => (
                              <tr key={complaint.id} style={styles.tr}>
                                <td style={styles.td}>#{complaint.id}</td>
                                <td style={styles.td}>{complaint.title}</td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.statusBadgeSmall,
                                    background: '#064e3b',
                                    color: '#6ee7b7'
                                  }}>
                                    COMPLETED
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.priorityBadge,
                                    background: complaint.priority === 'HIGH' ? '#7f1d1d' : complaint.priority === 'MEDIUM' ? '#78350f' : '#064e3b',
                                    color: complaint.priority === 'HIGH' ? '#fca5a5' : complaint.priority === 'MEDIUM' ? '#fde047' : '#6ee7b7'
                                  }}>
                                    {complaint.priority}
                                  </span>
                                </td>
                                <td style={styles.td}>{complaint.department_name || 'N/A'}</td>
                                <td style={styles.td}>{new Date(complaint.created_at).toLocaleDateString()}</td>
                                <td style={styles.td}>
                                  <button
                                    onClick={() => router.push(`/admin/complaints/${complaint.id}`)}
                                    style={styles.viewButton}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {workerComplaints.filter(c => c.status === 'COMPLETED').length === 0 && (
                        <div style={styles.emptyState}>No completed tasks</div>
                      )}
                    </div>
                  </div>

                  {/* Rejected/Declined Tasks */}
                  <div style={styles.tableCard}>
                    <h2 style={styles.tableTitle}>Rejected/Declined Tasks</h2>
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Title</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Priority</th>
                            <th style={styles.th}>Department</th>
                            <th style={styles.th}>Created</th>
                            <th style={styles.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workerComplaints
                            .filter(c => ['REJECTED', 'DECLINED'].includes(c.status))
                            .map(complaint => (
                              <tr key={complaint.id} style={styles.tr}>
                                <td style={styles.td}>#{complaint.id}</td>
                                <td style={styles.td}>{complaint.title}</td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.statusBadgeSmall,
                                    background: '#7f1d1d',
                                    color: '#fca5a5'
                                  }}>
                                    {complaint.status}
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.priorityBadge,
                                    background: complaint.priority === 'HIGH' ? '#7f1d1d' : complaint.priority === 'MEDIUM' ? '#78350f' : '#064e3b',
                                    color: complaint.priority === 'HIGH' ? '#fca5a5' : complaint.priority === 'MEDIUM' ? '#fde047' : '#6ee7b7'
                                  }}>
                                    {complaint.priority}
                                  </span>
                                </td>
                                <td style={styles.td}>{complaint.department_name || 'N/A'}</td>
                                <td style={styles.td}>{new Date(complaint.created_at).toLocaleDateString()}</td>
                                <td style={styles.td}>
                                  <button
                                    onClick={() => router.push(`/admin/complaints/${complaint.id}`)}
                                    style={styles.viewButton}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                      {workerComplaints.filter(c => ['REJECTED', 'DECLINED'].includes(c.status)).length === 0 && (
                        <div style={styles.emptyState}>No rejected/declined tasks</div>
                      )}
                    </div>
                  </div>

                  {/* All Tasks */}
                  <div style={styles.tableCard}>
                    <h2 style={styles.tableTitle}>All Tasks</h2>
                    <div style={styles.tableWrapper}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>ID</th>
                            <th style={styles.th}>Title</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Priority</th>
                            <th style={styles.th}>Department</th>
                            <th style={styles.th}>Created</th>
                            <th style={styles.th}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workerComplaints.map(complaint => (
                            <tr key={complaint.id} style={styles.tr}>
                              <td style={styles.td}>#{complaint.id}</td>
                              <td style={styles.td}>{complaint.title}</td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.statusBadgeSmall,
                                  background: 
                                    complaint.status === 'COMPLETED' ? '#064e3b' :
                                    complaint.status === 'IN_PROGRESS' ? '#1e40af' :
                                    complaint.status === 'ASSIGNED' ? '#854d0e' :
                                    ['REJECTED', 'DECLINED'].includes(complaint.status) ? '#7f1d1d' : '#334155',
                                  color: 
                                    complaint.status === 'COMPLETED' ? '#6ee7b7' :
                                    complaint.status === 'IN_PROGRESS' ? '#93c5fd' :
                                    complaint.status === 'ASSIGNED' ? '#fde047' :
                                    ['REJECTED', 'DECLINED'].includes(complaint.status) ? '#fca5a5' : '#94a3b8'
                                }}>
                                  {complaint.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.priorityBadge,
                                  background: complaint.priority === 'HIGH' ? '#7f1d1d' : complaint.priority === 'MEDIUM' ? '#78350f' : '#064e3b',
                                  color: complaint.priority === 'HIGH' ? '#fca5a5' : complaint.priority === 'MEDIUM' ? '#fde047' : '#6ee7b7'
                                }}>
                                  {complaint.priority}
                                </span>
                              </td>
                              <td style={styles.td}>{complaint.department_name || 'N/A'}</td>
                              <td style={styles.td}>{new Date(complaint.created_at).toLocaleDateString()}</td>
                              <td style={styles.td}>
                                <button
                                  onClick={() => router.push(`/admin/complaints/${complaint.id}`)}
                                  style={styles.viewButton}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0f172a' },
  main: { paddingTop: '70px' },
  content: { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' },
  loadingContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  backLink: { display: 'inline-block', color: '#60a5fa', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' },
  headerSection: { display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '32px', background: '#1e293b', padding: '32px', borderRadius: '12px', border: '1px solid #334155', position: 'relative' },
  avatarLarge: { width: '96px', height: '96px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: '600', flexShrink: 0 },
  headerInfo: { flex: 1 },
  name: { fontSize: '32px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 8px 0' },
  role: { fontSize: '16px', color: '#94a3b8', margin: '0 0 12px 0' },
  statusBadge: { display: 'inline-block', padding: '6px 12px', background: '#064e3b', color: '#6ee7b7', borderRadius: '6px', fontSize: '14px', fontWeight: '600' },
  editButton: { position: 'absolute', top: '24px', right: '24px', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' },
  cardTitle: { fontSize: '18px', fontWeight: '600', color: '#f1f5f9', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #334155' },
  infoGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' },
  value: { fontSize: '15px', color: '#f1f5f9', fontWeight: '500' },
  errorCard: { background: '#1e293b', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', border: '1px solid #334155' },
  errorTitle: { fontSize: '24px', fontWeight: '600', color: '#f1f5f9', marginBottom: '12px' },
  errorText: { fontSize: '16px', color: '#94a3b8' },
  editForm: { background: '#1e293b', borderRadius: '12px', padding: '32px', border: '1px solid #334155', marginBottom: '32px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  input: { padding: '10px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#0f172a', color: '#f1f5f9' },
  select: { padding: '10px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#0f172a', color: '#f1f5f9', cursor: 'pointer' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingTop: '8px' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  checkboxText: { fontSize: '14px', color: '#f1f5f9', fontWeight: '500' },
  buttonGroup: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelButton: { padding: '10px 24px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  saveButton: { padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  successAlert: { padding: '12px 16px', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #065f46' },
  errorAlert: { padding: '12px 16px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #991b1b' },
  statNumber: { fontSize: '48px', fontWeight: '700', color: '#f59e0b', textAlign: 'center', marginTop: '12px' },
  statLabel: { fontSize: '14px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' },
  tableCard: { background: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', marginTop: '24px' },
  tableTitle: { fontSize: '20px', fontWeight: '600', color: '#f1f5f9', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #334155' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #334155' },
  tr: { borderBottom: '1px solid #334155' },
  td: { padding: '16px', fontSize: '14px', color: '#f1f5f9' },
  statusBadgeSmall: { display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' },
  priorityBadge: { display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' },
  viewButton: { padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  emptyState: { padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }
};
