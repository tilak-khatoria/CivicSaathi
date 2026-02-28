import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminNavbar from '../../components/AdminNavbar';
import { adminComplaintAPI } from '../../utils/adminApi';

export default function AdminDepartments() {
  const { adminUser, loading, isRootAdmin, isSubAdmin } = useAdminAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser && (isRootAdmin || isSubAdmin)) {
      fetchDepartmentsAndStats();
    }
  }, [adminUser, loading]);

  const fetchDepartmentsAndStats = async () => {
    try {
      // Fetch departments directly from the API
      const deptResponse = await fetch('http://localhost:8000/api/departments/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!deptResponse.ok) {
        throw new Error('Failed to fetch departments');
      }
      
      const deptData = await deptResponse.json();
      const departmentsList = Array.isArray(deptData) ? deptData : (deptData.results || []);
      
      // Fetch all complaints to calculate stats per department
      const complaintResponse = await adminComplaintAPI.getAllComplaints();
      const data = complaintResponse?.data?.results || complaintResponse?.data || [];
      const complaints = Array.isArray(data) ? data : [];
      
      // Create a map with all departments and their stats
      const deptMap = new Map();
      
      // Initialize all departments with zero stats
      departmentsList.forEach(dept => {
        deptMap.set(dept.name, {
          id: dept.id,
          name: dept.name,
          totalComplaints: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          declined: 0
        });
      });
      
      // Update stats from complaints
      complaints.forEach(complaint => {
        const deptName = complaint.department_name;
        if (deptName && deptMap.has(deptName)) {
          const dept = deptMap.get(deptName);
          dept.totalComplaints++;
          
          // Count by status
          if (['SUBMITTED', 'PENDING', 'FILTERING', 'SORTING'].includes(complaint.status)) {
            dept.pending++;
          } else if (['ASSIGNED', 'IN_PROGRESS'].includes(complaint.status)) {
            dept.inProgress++;
          } else if (['COMPLETED', 'RESOLVED'].includes(complaint.status)) {
            dept.completed++;
          } else if (['DECLINED', 'REJECTED'].includes(complaint.status)) {
            dept.declined++;
          }
        }
      });
      
      // Convert map to array and sort by name
      const deptArray = Array.from(deptMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setDepartments(deptArray);
      
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
        <p style={styles.loadingText}>Loading departments...</p>
      </div>
    );
  }

  if (!adminUser || (!isRootAdmin && !isSubAdmin)) {
    return (
      <div style={styles.container}>
        <AdminNavbar />
        <div style={styles.errorContainer}>
          <h2 style={styles.errorTitle}>Access Denied</h2>
          <p style={styles.errorText}>Only Root Admins and Sub-Admins can view all departments</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Departments - Admin</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>Department Overview</h1>
                <p style={styles.subtitle}>Managing {departments.length} departments across the system</p>
              </div>
              <button onClick={fetchDepartmentsAndStats} style={styles.refreshButton}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Refresh
              </button>
            </div>

            <div style={styles.grid}>
              {departments.map((dept, index) => (
                <div key={dept.name} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.iconBadge}>
                      {index < 6 ? '🏢' : index < 9 ? '🔍' : index < 12 ? '💼' : '⭐'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={styles.cardTitle}>{dept.name}</h3>
                      <p style={styles.cardSubtitle}>{dept.totalComplaints} total complaints</p>
                    </div>
                  </div>

                  {/* Spacer pushes stats + button to the bottom */}
                  <div style={{ flex: 1 }} />

                  <div style={styles.statsGrid}>
                    <div style={styles.statBox}>
                      <div style={styles.statValue}>{dept.pending}</div>
                      <div style={styles.statLabel}>Pending</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statValue}>{dept.inProgress}</div>
                      <div style={styles.statLabel}>In Progress</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statValue}>{dept.completed}</div>
                      <div style={styles.statLabel}>Completed</div>
                    </div>
                    <div style={styles.statBox}>
                      <div style={styles.statValue}>{dept.declined}</div>
                      <div style={styles.statLabel}>Declined</div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      // Encode the department name for URL
                      const encodedDept = encodeURIComponent(dept.name);
                      router.push(`/admin/complaints?department=${encodedDept}`);
                    }} 
                    style={styles.viewButton}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                    View All Complaints
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: 'var(--bg-primary)' },
  main: { paddingTop: '70px' },
  content: { maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' },
  loadingContainer: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', backgroundColor: 'var(--bg-primary)' },
  loadingText: { fontSize: '16px', color: 'var(--text-secondary)' },
  errorContainer: { padding: '60px 20px', textAlign: 'center' },
  errorTitle: { fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' },
  errorText: { fontSize: '16px', color: 'var(--text-secondary)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  title: { fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' },
  subtitle: { fontSize: '16px', color: 'var(--text-secondary)', margin: 0 },
  refreshButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', transition: 'all 0.2s' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' },
  card: { background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-primary)', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', minHeight: '240px' },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  iconBadge: { width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', backgroundColor: 'rgba(79, 70, 229, 0.1)', border: '1px solid rgba(79, 70, 229, 0.2)', flexShrink: 0 },
  cardTitle: { fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: '1.4' },
  cardSubtitle: { fontSize: '13px', color: 'var(--text-secondary)', margin: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' },
  statBox: { textAlign: 'center', padding: '10px 4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', minWidth: 0, overflow: 'hidden' },
  statValue: { fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '3px' },
  statLabel: { fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  viewButton: { width: '100%', padding: '12px 16px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
};
