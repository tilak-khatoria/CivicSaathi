import { useState, useEffect } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { useRouter } from 'next/router';
import WorkerNavbar from '../../components/WorkerNavbar';
import { workerDashboardAPI, workerComplaintsAPI } from '../../utils/workerApi';
import Link from 'next/link';

export default function WorkerDashboard() {
  const { worker, loading } = useWorkerAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !worker) {
      router.push('/worker/login');
    } else if (worker) {
      fetchDashboardData();
    }
  }, [worker, loading]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, complaintsResponse] = await Promise.all([
        workerDashboardAPI.getStats(),
        workerComplaintsAPI.getAssignedComplaints(),
      ]);
      setStats(statsResponse.data);
      const data = complaintsResponse.data.results || complaintsResponse.data;
      setRecentComplaints(Array.isArray(data) ? data.slice(0, 4) : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // If stats API not available, calculate from complaints
      try {
        const complaintsResponse = await workerComplaintsAPI.getAssignedComplaints();
        const data = complaintsResponse.data.results || complaintsResponse.data;
        const complaints = Array.isArray(data) ? data : [];
        
        const calculatedStats = {
          assigned: complaints.length,
          pending: complaints.filter(c => c.status === 'ASSIGNED' || c.status === 'PENDING').length,
          completed: complaints.filter(c => c.status === 'COMPLETED' || c.status === 'RESOLVED').length,
          overdue: complaints.filter(c => {
            if (!c.sla_deadline) return false;
            return new Date(c.sla_deadline) < new Date() && 
                   (c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS');
          }).length,
        };
        setStats(calculatedStats);
        setRecentComplaints(complaints.slice(0, 4));
      } catch (err) {
        console.error('Error calculating stats:', err);
      }
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!worker) return null;

  return (
    <div style={styles.container}>
      <WorkerNavbar />
      
      <main style={styles.main}>
        <div style={styles.content}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Welcome, {worker.first_name || worker.username}!</h1>
              <p style={styles.subtitle}>
                {worker.role || 'Worker'} • {worker.department?.name || 'Municipal Services'}
              </p>
            </div>
          </div>

          {/* Worker Info Card */}
          <div className="card" style={styles.workerCard}>
            <div style={styles.workerInfo}>
              <div style={styles.workerAvatar}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <h3 style={styles.workerName}>
                  {worker.first_name} {worker.last_name}
                </h3>
                <p style={styles.workerRole}>{worker.role || 'Municipal Worker'}</p>
                <p style={styles.workerDept}>Department: {worker.department_name || worker.department || 'Not Assigned'}</p>
                <p style={styles.workerOffice}>Office: {worker.office_name || worker.office || 'Not Assigned'}</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          {stats && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>My Work Statistics</h2>
              <div style={styles.statsGrid}>
                <Link href="/worker/assigned" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-info">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Assigned Complaints</p>
                      <h2 style={styles.statValue}>{stats.assigned || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/worker/pending" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-warning">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Pending</p>
                      <h2 style={styles.statValue}>{stats.pending || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/worker/completed" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-success">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Completed</p>
                      <h2 style={styles.statValue}>{stats.completed || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/worker/overdue" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-danger">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Overdue</p>
                      <h2 style={styles.statValue}>{stats.overdue || 0}</h2>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Recent Assigned Complaints */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recently Assigned Complaints</h2>
              <Link href="/worker/assigned" style={styles.viewAllLink}>
                View All →
              </Link>
            </div>
            
            {recentComplaints.length > 0 ? (
              <div style={styles.complaintsGrid}>
                {recentComplaints.map((complaint) => (
                  <Link href={`/worker/complaint/${complaint.id}`} key={complaint.id}>
                    <div className="card" style={styles.complaintCard}>
                      <div style={styles.complaintHeader}>
                        <h3 style={styles.complaintTitle}>{complaint.title}</h3>
                        <span className={`badge badge-${getStatusColor(complaint.status)}`}>
                          {complaint.status}
                        </span>
                      </div>
                      <p style={styles.complaintDesc}>
                        {complaint.description?.substring(0, 100) || 'No description'}...
                      </p>
                      <div style={styles.complaintFooter}>
                        <span style={styles.complaintLocation}>
                          📍 {complaint.city || 'Unknown'}
                        </span>
                        <span style={styles.complaintDate}>
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </span>
                        {complaint.sla_deadline && (
                          <span style={styles.complaintDeadline}>
                            ⏰ {new Date(complaint.sla_deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card" style={styles.emptyState}>
                <p>No complaints assigned yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function getStatusColor(status) {
  const colors = {
    'SUBMITTED': 'info',
    'PENDING': 'warning',
    'ASSIGNED': 'primary',
    'IN_PROGRESS': 'primary',
    'COMPLETED': 'success',
    'RESOLVED': 'success',
    'REJECTED': 'danger',
    'DECLINED': 'danger',
  };
  return colors[status] || 'info';
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    padding: '2rem 0',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  workerCard: {
    marginBottom: '2rem',
    padding: '1.5rem',
  },
  workerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  workerAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-success)',
  },
  workerName: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
  },
  workerRole: {
    fontSize: '1rem',
    color: 'var(--accent-success)',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  workerDept: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem',
  },
  workerOffice: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  section: {
    marginBottom: '2.5rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
  },
  viewAllLink: {
    color: 'var(--accent-success)',
    fontSize: '0.9375rem',
    fontWeight: '500',
    textDecoration: 'none',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  statIcon: {
    width: '60px',
    height: '60px',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    marginBottom: '0.25rem',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
  },
  complaintsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  complaintCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  complaintHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    gap: '0.5rem',
  },
  complaintTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    flex: 1,
  },
  complaintDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    marginBottom: '1rem',
  },
  complaintFooter: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  complaintLocation: {
    display: 'flex',
    alignItems: 'center',
  },
  complaintDate: {
    display: 'flex',
    alignItems: 'center',
  },
  complaintDeadline: {
    display: 'flex',
    alignItems: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-secondary)',
  },
};
