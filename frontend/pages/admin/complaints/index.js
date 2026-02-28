import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminNavbar from '../../../components/AdminNavbar';
import { adminComplaintAPI } from '../../../utils/adminApi';
import Link from 'next/link';

export default function AdminComplaints() {
  const { adminUser, loading, isRootAdmin, isSubAdmin, isDepartmentAdmin, getAccessibleDepartments } = useAdminAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    city: 'all',
    search: ''
  });

  // Pre-apply department filter from URL query param (e.g. coming from departments page)
  useEffect(() => {
    if (!router.isReady) return;
    const { department } = router.query;
    if (department) {
      setFilters(prev => ({ ...prev, department: decodeURIComponent(department) }));
    }
  }, [router.isReady, router.query.department]);

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser) {
      fetchComplaints();
    }
  }, [adminUser, loading]);

  useEffect(() => {
    applyFilters();
  }, [complaints, filters]);

  const fetchComplaints = async () => {
    try {
      // Fetch all complaints from the regular API
      const response = await adminComplaintAPI.getAllComplaints();
      console.log('Raw response:', response);
      const data = response?.data?.results || response?.data || [];
      let allComplaints = Array.isArray(data) ? data : [];
      
      console.log('Fetched complaints:', allComplaints.length);
      console.log('Admin user:', adminUser);
      console.log('Is Root Admin:', isRootAdmin);
      console.log('Is Sub Admin:', isSubAdmin);
      console.log('Is Dept Admin:', isDepartmentAdmin);
      
      // Filter based on admin role - BUT ONLY FOR NON-ROOT ADMINS
      if (isRootAdmin) {
        // Root admin sees ALL complaints - no filtering
        console.log('Root admin - showing all complaints');
      } else if (isDepartmentAdmin) {
        // Department admin sees only their department's complaints
        console.log('Filtering for department admin:', adminUser.departmentId, adminUser.departmentName);
        const beforeFilter = allComplaints.length;
        allComplaints = allComplaints.filter(c => {
          const deptMatch = c.department === adminUser.departmentId || 
                           c.department === adminUser.departmentName ||
                           c.department?.toLowerCase().includes(adminUser.departmentId?.toLowerCase()) ||
                           c.department?.toLowerCase().includes(adminUser.departmentName?.toLowerCase());
          // If city context is set, also filter by city
          if (adminUser.cityContext) {
            return deptMatch && c.city === adminUser.cityContext;
          }
          return deptMatch;
        });
        console.log(`Filtered complaints for dept admin: ${beforeFilter} -> ${allComplaints.length}`);
      } else if (isSubAdmin) {
        // Sub-admin sees complaints from their cluster departments
        const clusterDepts = adminUser.departments || [];
        console.log('Filtering for sub-admin, cluster depts:', clusterDepts);
        const beforeFilter = allComplaints.length;
        allComplaints = allComplaints.filter(c => 
          clusterDepts.includes(c.department) || 
          clusterDepts.some(dept => 
            c.department === dept ||
            c.department?.toLowerCase().includes(dept?.toLowerCase())
          )
        );
        console.log(`Filtered complaints for sub-admin: ${beforeFilter} -> ${allComplaints.length}`);
      }
      
      setComplaints(allComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      console.error('Error details:', error.response?.data);
      setComplaints([]);
    } finally {
      setLoadingData(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...complaints];

    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(c => c.department_name === filters.department);
    }

    if (filters.city !== 'all') {
      filtered = filtered.filter(c => c.city === filters.city);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search) ||
        c.complaint_id?.toLowerCase().includes(search) ||
        c.id?.toString().includes(search)
      );
    }

    setFilteredComplaints(filtered);
  };

  const getStatusColor = (status) => {
    const colors = {
      'SUBMITTED': '#3b82f6',
      'FILTERING': '#8b5cf6',
      'PENDING': '#f59e0b',
      'ASSIGNED': '#8b5cf6',
      'IN_PROGRESS': '#8b5cf6',
      'COMPLETED': '#10b981',
      'RESOLVED': '#10b981',
      'DECLINED': '#6b7280',
      'REJECTED': '#ef4444',
      'SORTING': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusBadge = (status) => {
    const styles = {
      'SUBMITTED': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
      'FILTERING': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
      'PENDING': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
      'ASSIGNED': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
      'IN_PROGRESS': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
      'COMPLETED': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
      'RESOLVED': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
      'DECLINED': { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' },
      'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
      'SORTING': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' }
    };
    const style = styles[status] || { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: 'rgba(107, 114, 128, 0.3)' };
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`
      }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <p>Loading complaints...</p>
      </div>
    );
  }

  if (!adminUser) return null;

  const accessibleDepartments = getAccessibleDepartments();
  const cities = [...new Set(complaints.map(c => c.city))];

  return (
    <>
      <Head>
        <title>Manage Complaints - Admin</title>
      </Head>

      <div style={styles.container}>
        <AdminNavbar />
        
        <main style={styles.main}>
          <div style={styles.content}>
            {/* Header */}
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>Complaint Management</h1>
                <p style={styles.subtitle}>
                  Showing {filteredComplaints.length} of {complaints.length} complaints
                </p>
              </div>
              <button onClick={fetchComplaints} style={styles.refreshButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh
              </button>
            </div>

            {/* Filters */}
            <div style={styles.filtersCard}>
              <div style={styles.filtersGrid}>
                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    style={styles.filterSelect}
                  >
                    <option value="all">All Statuses</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="FILTERING">Under Filter Check</option>
                    <option value="PENDING">Pending Assignment</option>
                    <option value="ASSIGNED">Assigned to Worker</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="DECLINED">Declined</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                {(isRootAdmin || isSubAdmin) && (
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters({...filters, department: e.target.value})}
                      style={styles.filterSelect}
                    >
                      <option value="all">All Departments</option>
                      {[...new Set(complaints.map(c => c.department_name).filter(Boolean))].sort().map(deptName => (
                        <option key={deptName} value={deptName}>{deptName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>City</label>
                  <select
                    value={filters.city}
                    onChange={(e) => setFilters({...filters, city: e.target.value})}
                    style={styles.filterSelect}
                  >
                    <option value="all">All Cities</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.filterLabel}>Search</label>
                  <input
                    type="text"
                    placeholder="Search by ID, title..."
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    style={styles.filterInput}
                  />
                </div>
              </div>
            </div>

            {/* Complaints List */}
            {filteredComplaints.length === 0 ? (
              <div style={styles.emptyState}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <h3 style={styles.emptyTitle}>No complaints found</h3>
                <p style={styles.emptyText}>
                  {complaints.length === 0 
                    ? 'There are no complaints to display.' 
                    : 'Try adjusting your filters.'}
                </p>
              </div>
            ) : (
              <div style={styles.complaintsGrid}>
                {filteredComplaints.map(complaint => (
                  <ComplaintCard 
                    key={complaint.id} 
                    complaint={complaint}
                    getStatusBadge={getStatusBadge}
                    onClick={() => router.push(`/admin/complaints/${complaint.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function SlaUrgencyBadge({ slaTimer }) {
  if (!slaTimer || ['completed', 'declined'].includes(slaTimer.status)) return null;
  const map = {
    overdue:  { label: 'Overdue',   bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',  border: 'rgba(239,68,68,0.4)'  },
    critical: { label: 'Critical',  bg: 'rgba(239,68,68,0.1)',    color: '#f87171',  border: 'rgba(239,68,68,0.3)'  },
    warning:  { label: 'Warning',   bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  border: 'rgba(245,158,11,0.35)' },
  };
  const style = map[slaTimer.status];
  if (!style) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
      backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}`,
      letterSpacing: '0.3px',
    }}>
      ⚠ SLA {style.label}
    </span>
  );
}

function ComplaintCard({ complaint, getStatusBadge, onClick }) {
  return (
    <div style={styles.complaintCard} onClick={onClick}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={styles.cardTitle}>{complaint.title || 'Untitled Complaint'}</h3>
          <p style={styles.cardId}>ID: {complaint.complaint_id || complaint.id}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
          {getStatusBadge(complaint.status)}
          <SlaUrgencyBadge slaTimer={complaint.sla_timer} />
        </div>
      </div>

      <div style={styles.cardBody}>
        <p style={styles.cardDescription}>
          {complaint.description?.substring(0, 120) || 'No description'}
          {complaint.description?.length > 120 && '...'}
        </p>

        <div style={styles.cardMeta}>
          <div style={styles.metaItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {complaint.city}, {complaint.state}
          </div>
          <div style={styles.metaItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {new Date(complaint.created_at).toLocaleDateString()}
          </div>
        </div>

        <div style={styles.cardFooter}>
          <span style={styles.department}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {complaint.department_name || complaint.department || 'No Department'}
          </span>
          {complaint.category_name && (
            <span style={styles.category}>{complaint.category_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)'
  },
  main: {
    paddingTop: '70px'
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '30px 20px'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    transition: 'all 0.2s'
  },
  filtersCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    marginBottom: '30px',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border-primary)'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)'
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid var(--border-secondary)',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    cursor: 'pointer'
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid var(--border-secondary)',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)'
  },
  complaintsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  complaintCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    boxShadow: 'var(--shadow-md)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '1px solid var(--border-primary)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 4px 0'
  },
  cardId: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: 0
  },
  cardBody: {
    marginBottom: '12px'
  },
  cardDescription: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '12px'
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  cardFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  department: {
    padding: '4px 10px',
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },
  category: {
    padding: '4px 10px',
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid rgba(16, 185, 129, 0.3)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '16px 0 8px 0'
  },
  emptyText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0
  }
};
