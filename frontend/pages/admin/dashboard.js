import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../components/AdminNavbar';
import { adminDashboardAPI } from '../../utils/adminApi';

export default function AdminDashboard() {
  const { adminUser, loading, isRootAdmin, isSubAdmin, isDepartmentAdmin } = useAdminAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser) {
      fetchDashboardData();
    }
  }, [adminUser, loading]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all complaints and calculate stats on frontend
      const response = await adminDashboardAPI.getOverallStats().catch((err) => {
        console.log('Dashboard API not available, using fallback:', err.message);
        // Fallback to complaints API if dashboard API fails
        return { data: null };
      });
      
      // If dashboard API works, use it
      if (response?.data?.total_complaints !== undefined) {
        setStats(response.data);
      } else {
        // Otherwise, fetch complaints and calculate stats
        const complaintsAPI = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/complaints/all/`, {
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`
          }
        }).then(res => res.json());
        
        const allComplaints = complaintsAPI?.results || complaintsAPI || [];
        
        // Filter based on admin role
        let filteredComplaints = allComplaints;
        if (isDepartmentAdmin) {
          filteredComplaints = allComplaints.filter(c => {
            const deptMatch = c.department === adminUser.departmentId || 
                             c.department === adminUser.departmentName;
            if (adminUser.cityContext) {
              return deptMatch && c.city === adminUser.cityContext;
            }
            return deptMatch;
          });
        } else if (isSubAdmin) {
          const clusterDepts = adminUser.departments || [];
          filteredComplaints = allComplaints.filter(c => 
            clusterDepts.includes(c.department) || 
            clusterDepts.some(dept => c.department?.includes(dept))
          );
        }
        
        // Calculate stats
        const calculatedStats = {
          total_complaints: filteredComplaints.length,
          pending: filteredComplaints.filter(c => c.status === 'PENDING' || c.status === 'SUBMITTED').length,
          in_progress: filteredComplaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length,
          completed: filteredComplaints.filter(c => c.status === 'COMPLETED').length,
          resolved: filteredComplaints.filter(c => c.status === 'RESOLVED').length,
          rejected: filteredComplaints.filter(c => c.status === 'REJECTED' || c.status === 'DECLINED').length
        };
        
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default stats on error
      setStats({
        total_complaints: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        resolved: 0,
        rejected: 0
      });
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <p style={styles.loadingText}>Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <>
      <Head>
        <title>Admin Dashboard - CivicSaathi</title>
      </Head>

      <div style={styles.container}>
        <AdminNavbar />
        
        <main style={styles.main}>
          <div style={styles.content}>
            {/* Header */}
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>
                  {isRootAdmin && '🏛️ Root Administrator Dashboard'}
                  {isSubAdmin && `📊 ${adminUser.clusterName} - Sub-Admin`}
                  {isDepartmentAdmin && `🏢 ${adminUser.departmentName}`}
                </h1>
                <p style={styles.subtitle}>
                  {isRootAdmin && 'Complete system oversight and control'}
                  {isSubAdmin && `Managing ${adminUser.departments.length} departments`}
                  {isDepartmentAdmin && (
                    adminUser.cityContext 
                      ? `${adminUser.cityContext} Operations` 
                      : 'Multi-city Operations'
                  )}
                </p>
              </div>
              <div style={styles.rolebadge}>
                <span style={styles.roleBadge}>{adminUser.role.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Statistics Grid */}
            <div style={styles.statsGrid}>
              <Link href="/admin/complaints" style={{ textDecoration: 'none' }}>
                <StatCard
                  title="Total Complaints"
                  value={stats?.total_complaints || 0}
                  icon="📋"
                  color="#3b82f6"
                  bgColor="rgba(59, 130, 246, 0.1)"
                />
              </Link>
              <Link href="/admin/complaints/status/pending" style={{ textDecoration: 'none' }}>
                <StatCard
                  title="Pending Review"
                  value={stats?.pending || 0}
                  icon="⏳"
                  color="#f59e0b"
                  bgColor="rgba(245, 158, 11, 0.1)"
                />
              </Link>
              <Link href="/admin/complaints/status/in-progress" style={{ textDecoration: 'none' }}>
                <StatCard
                  title="In Progress"
                  value={stats?.in_progress || 0}
                  icon="⚙️"
                  color="#8b5cf6"
                  bgColor="rgba(139, 92, 246, 0.1)"
                />
              </Link>
              <Link href="/admin/complaints/status/completed" style={{ textDecoration: 'none' }}>
                <StatCard
                  title="Completed/Resolved"
                  value={(stats?.completed || 0) + (stats?.resolved || 0)}
                  icon="✅"
                  color="#10b981"
                  bgColor="rgba(16, 185, 129, 0.1)"
                />
              </Link>
              <Link href="/admin/complaints/status/rejected" style={{ textDecoration: 'none' }}>
                <StatCard
                  title="Rejected"
                  value={stats?.rejected || 0}
                  icon="❌"
                  color="#ef4444"
                  bgColor="rgba(239, 68, 68, 0.1)"
                />
              </Link>
            </div>

            {/* Quick Actions */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Quick Actions</h2>
              <div style={styles.actionsGrid}>
                <ActionButton
                  title="Manage Complaints"
                  description="View and process complaints"
                  icon="📝"
                  onClick={() => router.push('/admin/complaints')}
                />
                
                {(isRootAdmin || isSubAdmin) && (
                  <ActionButton
                    title="Department Overview"
                    description="View all departments"
                    icon="🏢"
                    onClick={() => router.push('/admin/departments')}
                  />
                )}
                
                <ActionButton
                  title="Manage Offices"
                  description="Office locations and info"
                  icon="🏛️"
                  onClick={() => router.push('/admin/offices')}
                />
                
                <ActionButton
                  title="Workers & Staff"
                  description="Manage workforce"
                  icon="👷"
                  onClick={() => router.push('/admin/workers')}
                />
                
                <ActionButton
                  title="Add Worker"
                  description="Create new worker account"
                  icon="➕"
                  onClick={() => router.push('/admin/workers/add')}
                />
                
                <ActionButton
                  title="Add Office"
                  description="Create new office location"
                  icon="🏢"
                  onClick={() => router.push('/admin/offices/add')}
                />
                
                <ActionButton
                  title="Attendance System"
                  description="Track worker attendance"
                  icon="📅"
                  onClick={() => router.push('/admin/attendance')}
                />
                
                {isRootAdmin && (
                  <ActionButton
                    title="System Settings"
                    description="Configure system parameters"
                    icon="⚙️"
                    onClick={() => router.push('/admin/settings')}
                  />
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>System Overview</h2>
              <div style={styles.overviewCard}>
                <div style={styles.overviewItem}>
                  <span style={styles.overviewLabel}>Access Level:</span>
                  <span style={styles.overviewValue}>
                    {isRootAdmin && 'Full System Access'}
                    {isSubAdmin && 'Cluster Management'}
                    {isDepartmentAdmin && 'Department Specific'}
                  </span>
                </div>
                <div style={styles.overviewItem}>
                  <span style={styles.overviewLabel}>Departments:</span>
                  <span style={styles.overviewValue}>
                    {isRootAdmin && 'All 14 Departments'}
                    {isSubAdmin && `${adminUser.departments.length} Departments in Cluster`}
                    {isDepartmentAdmin && adminUser.departmentName}
                  </span>
                </div>
                <div style={styles.overviewItem}>
                  <span style={styles.overviewLabel}>Multi-City Access:</span>
                  <span style={styles.overviewValue}>
                    {(isRootAdmin || isSubAdmin) && 'Yes - All Cities'}
                    {isDepartmentAdmin && (adminUser.allowMultiCityLogin ? 'Yes - Multiple Cities' : 'Single City')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function StatCard({ title, value, icon, color, bgColor }) {
  return (
    <div style={{ ...styles.statCard, borderLeft: `4px solid ${color}` }}>
      <div style={{ ...styles.statIcon, backgroundColor: bgColor }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
      </div>
      <div style={styles.statContent}>
        <p style={styles.statTitle}>{title}</p>
        <h3 style={{ ...styles.statValue, color }}>{value}</h3>
      </div>
    </div>
  );
}

function ActionButton({ title, description, icon, onClick }) {
  return (
    <button 
      style={styles.actionButton}
      onClick={onClick}
    >
      <div style={styles.actionIcon}>{icon}</div>
      <div style={styles.actionContent}>
        <h4 style={styles.actionTitle}>{title}</h4>
        <p style={styles.actionDescription}>{description}</p>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
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
    backgroundColor: 'var(--bg-primary)'
  },
  loadingText: {
    fontSize: '16px',
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
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    margin: 0
  },
  roleBadge: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: 'white',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border-primary)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  statIcon: {
    width: '56px',
    height: '56px',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statContent: {
    flex: 1
  },
  statTitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: '0 0 4px 0'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    margin: 0
  },
  section: {
    marginBottom: '40px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '20px'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  },
  actionButton: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
    color: 'var(--text-primary)'
  },
  actionIcon: {
    fontSize: '32px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-tertiary)',
    borderRadius: '10px'
  },
  actionContent: {
    flex: 1
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 4px 0'
  },
  actionDescription: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0
  },
  overviewCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border-primary)'
  },
  overviewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid var(--border-primary)'
  },
  overviewLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  overviewValue: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    fontWeight: '600'
  }
};
