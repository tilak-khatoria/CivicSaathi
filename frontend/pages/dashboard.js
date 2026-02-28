import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { dashboardAPI, complaintAPI } from '../utils/api';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, loading]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, complaintsResponse] = await Promise.all([
        dashboardAPI.getStats(),
        complaintAPI.getAllComplaints(),
      ]);

      const backendStats = statsResponse.data;
      // Total Complaints section: all-users stats from backend
      setStats(backendStats);

      const data = complaintsResponse.data.results || complaintsResponse.data;
      setRecentComplaints(Array.isArray(data) ? data.slice(0, 4) : []);

      // My Complaints section: use backend-provided my_* fields (scoped to logged-in user)
      setMyStats({
        total_complaints: backendStats.my_complaints || 0,
        pending: backendStats.my_pending || 0,
        in_progress: backendStats.my_in_progress || 0,
        completed: backendStats.my_completed || 0,
        declined: backendStats.my_declined || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  if (!user) return null;

  return (
    <div style={styles.container}>
      <Navbar />
      
      <main style={styles.main}>
        <div style={styles.content}>
          {/* Header */}
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Welcome back, {user.first_name || user.username}!</h1>
              <p style={styles.subtitle}>
                Track and manage your civic complaints from {user.city}, {user.state}
              </p>
            </div>
            <Link href="/complaints/new">
              <button className="btn btn-primary" style={styles.newComplaintBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Complaint
              </button>
            </Link>
          </div>

          {/* My Complaints Section */}
          {myStats && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>My Complaints</h2>
              <div style={styles.statsGrid}>
                <Link href="/complaints" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-info">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Total Complaints</p>
                      <h2 style={styles.statValue}>{myStats.total_complaints || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/complaints/status/pending" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-warning">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Pending</p>
                      <h2 style={styles.statValue}>{myStats.pending || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/complaints/status/in-progress" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-primary">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>In Progress</p>
                      <h2 style={styles.statValue}>{myStats.in_progress || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/complaints/status/completed" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-success">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Completed</p>
                      <h2 style={styles.statValue}>{myStats.completed || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/complaints/status/declined" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-danger">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Declined/Rejected</p>
                      <h2 style={styles.statValue}>{myStats.declined || 0}</h2>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Total Complaints Stats */}
          {stats && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Total Complaints</h2>
              <div style={styles.statsGrid}>
                <Link href="/complaints/all" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-info">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Total Complaints</p>
                      <h2 style={styles.statValue}>{stats.total_complaints || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/complaints/status/pending" style={{ textDecoration: 'none' }}>
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

                <Link href="/complaints/status/in-progress" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-primary">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>In Progress</p>
                      <h2 style={styles.statValue}>{stats.in_progress || 0}</h2>
                    </div>
                  </div>
                </Link>

                <Link href="/complaints/status/completed" style={{ textDecoration: 'none' }}>
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

                <Link href="/complaints/status/declined" style={{ textDecoration: 'none' }}>
                  <div className="card" style={{...styles.statCard, cursor: 'pointer'}}>
                    <div style={styles.statIcon} className="badge-danger">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                    </div>
                    <div>
                      <p style={styles.statLabel}>Declined/Rejected</p>
                      <h2 style={styles.statValue}>{stats.declined || 0}</h2>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Quick Actions</h2>
            <div style={styles.actionsGrid}>
              <Link href="/complaints/new" className="card" style={styles.actionCard}>
                <div style={{ ...styles.actionIcon, backgroundColor: 'rgba(79, 70, 229, 0.2)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </div>
                <h3 style={styles.actionTitle}>Submit New Complaint</h3>
                <p style={styles.actionSubtitle}>Report a civic issue in your area</p>
              </Link>

              <Link href="/complaints/all" className="card" style={styles.actionCard}>
                <div style={{ ...styles.actionIcon, backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                </div>
                <h3 style={styles.actionTitle}>View All Complaints</h3>
                <p style={styles.actionSubtitle}>Browse all civic complaints nearby</p>
              </Link>

              <Link href="/complaints" className="card" style={styles.actionCard}>
                <div style={{ ...styles.actionIcon, backgroundColor: 'rgba(245, 158, 11, 0.2)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <h3 style={styles.actionTitle}>My Complaints</h3>
                <p style={styles.actionSubtitle}>Track your submitted complaints</p>
              </Link>
            </div>
          </div>

          {/* Recent Complaints */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recent Complaints</h2>
              <Link href="/complaints/all" style={styles.viewAllLink}>
                View All →
              </Link>
            </div>
            
            {recentComplaints.length > 0 ? (
              <div style={styles.complaintsGrid}>
                {recentComplaints.map((complaint) => (
                  <Link href={`/complaints/${complaint.id}`} key={complaint.id} style={styles.complaintLink}>
                    <div className="card" style={styles.complaintCard}>
                      <div style={styles.complaintHeader}>
                        <h3 style={styles.complaintTitle}>
                          {complaint.title}
                          {!complaint.image && (
                            <span style={styles.demoLabel}>(demo)</span>
                          )}
                        </h3>
                        <span
                          className={`badge badge-${getStatusColor(complaint.status)}`}
                          style={styles.complaintBadge}
                        >
                          {complaint.status}
                        </span>
                      </div>
                      <p style={styles.complaintDesc}>
                        {complaint.description || 'No description available.'}
                      </p>
                      <div style={styles.complaintFooter}>
                        <span style={styles.complaintLocation}>
                          📍 {complaint.city || 'Unknown'}
                        </span>
                        <span style={styles.complaintDate}>
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </span>
                        {complaint.upvote_count > 0 && (
                          <span style={styles.complaintUpvotes}>
                            👍 {complaint.upvote_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card" style={styles.emptyState}>
                <p>No complaints yet. Start by submitting your first complaint!</p>
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
  newComplaintBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2.5rem',
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
    color: 'var(--accent-primary)',
    fontSize: '0.9375rem',
    fontWeight: '500',
    textDecoration: 'none',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  actionCard: {
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'transform 0.2s',
  },
  actionIcon: {
    width: '80px',
    height: '80px',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  actionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  actionSubtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
  },
  complaintsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
    alignItems: 'stretch',
  },
  complaintLink: {
    display: 'flex',
    textDecoration: 'none',
  },
  complaintCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    overflow: 'hidden',
  },
  complaintHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    gap: '0.75rem',
    flexShrink: 0,
  },
  complaintTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    lineHeight: '1.4',
  },
  complaintBadge: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  demoLabel: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '400',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginTop: '0.15rem',
  },
  complaintDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    lineHeight: '1.6',
    marginBottom: '1rem',
    flex: 1,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },
  complaintFooter: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    flexShrink: 0,
    marginTop: 'auto',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))',
  },
  complaintLocation: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    maxWidth: '140px',
  },
  complaintDate: {
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },
  complaintUpvotes: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginLeft: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: 'var(--text-secondary)',
  },
};
