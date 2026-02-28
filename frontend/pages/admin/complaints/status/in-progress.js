import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../../../components/AdminNavbar';
import { adminComplaintAPI } from '../../../../utils/adminApi';

export default function InProgressComplaints() {
  const { adminUser, loading, isRootAdmin, isDepartmentAdmin } = useAdminAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser) {
      fetchComplaints();
    }
  }, [adminUser, loading]);

  const fetchComplaints = async () => {
    try {
      const response = await adminComplaintAPI.getAllComplaints();
      const data = response?.data?.results || response?.data || [];
      let allComplaints = Array.isArray(data) ? data : [];
      
      // Filter for in-progress statuses
      const inProgressStatuses = ['ASSIGNED', 'IN_PROGRESS'];
      allComplaints = allComplaints.filter(c => inProgressStatuses.includes(c.status));
      
      // Apply role-based filtering if not root admin
      if (!isRootAdmin && isDepartmentAdmin && adminUser) {
        allComplaints = allComplaints.filter(c => {
          const deptMatch = c.department === adminUser.departmentId || 
                           c.department === adminUser.departmentName;
          if (adminUser.cityContext) {
            return deptMatch && c.city === adminUser.cityContext;
          }
          return deptMatch;
        });
      }
      
      // Sort by most recent first
      allComplaints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setComplaints(allComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading in-progress complaints...</p>
      </div>
    );
  }

  if (!adminUser) return null;

  return (
    <>
      <Head>
        <title>In Progress Complaints - Admin - CivicSaathi</title>
      </Head>

      <div style={styles.container}>
        <AdminNavbar />
        
        <main style={styles.main}>
          <div style={styles.content}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>⚙️ In Progress Complaints</h1>
                <p style={styles.subtitle}>
                  {complaints.length} complaint{complaints.length !== 1 ? 's' : ''} currently being worked on
                </p>
              </div>
              <Link href="/admin/dashboard">
                <button style={styles.backButton}>
                  ← Back to Dashboard
                </button>
              </Link>
            </div>

            {complaints.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>⚙️</div>
                <h3 style={styles.emptyTitle}>No In-Progress Complaints</h3>
                <p style={styles.emptyText}>There are no complaints currently being worked on.</p>
              </div>
            ) : (
              <div style={styles.complaintsGrid}>
                {complaints.map((complaint) => (
                  <Link 
                    key={complaint.id} 
                    href={`/admin/complaints/${complaint.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={styles.complaintCard}>
                      <div style={styles.cardHeader}>
                        <div style={styles.cardTop}>
                          <span style={{...styles.statusBadge, ...styles.statusInProgress}}>
                            {complaint.status}
                          </span>
                          <span style={styles.complaintId}>#{complaint.id}</span>
                        </div>
                        {complaint.category && (
                          <span style={styles.categoryBadge}>{complaint.category}</span>
                        )}
                      </div>

                      <h3 style={styles.cardTitle}>{complaint.title}</h3>
                      
                      <p style={styles.cardDescription}>
                        {complaint.description?.length > 120 
                          ? complaint.description.substring(0, 120) + '...' 
                          : complaint.description}
                      </p>

                      <div style={styles.cardDetails}>
                        <div style={styles.detailItem}>
                          <span style={styles.detailIcon}>📍</span>
                          <span style={styles.detailText}>
                            {complaint.location || 'No location'}
                          </span>
                        </div>
                        
                        {complaint.department && (
                          <div style={styles.detailItem}>
                            <span style={styles.detailIcon}>🏢</span>
                            <span style={styles.detailText}>{complaint.department}</span>
                          </div>
                        )}

                        {complaint.office && (
                          <div style={styles.detailItem}>
                            <span style={styles.detailIcon}>🏛️</span>
                            <span style={styles.detailText}>{complaint.office}</span>
                          </div>
                        )}

                        {complaint.worker && (
                          <div style={styles.detailItem}>
                            <span style={styles.detailIcon}>👷</span>
                            <span style={styles.detailText}>{complaint.worker}</span>
                          </div>
                        )}

                        <div style={styles.detailItem}>
                          <span style={styles.detailIcon}>📅</span>
                          <span style={styles.detailText}>
                            {new Date(complaint.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {complaint.citizen_email && (
                        <div style={styles.citizenInfo}>
                          <span style={styles.citizenLabel}>Citizen:</span>
                          <span style={styles.citizenEmail}>{complaint.citizen_email}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
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
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(139, 92, 246, 0.1)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
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
  backButton: {
    padding: '10px 20px',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'var(--bg-hover)'
    }
  },
  complaintsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  complaintCard: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    border: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: 'var(--shadow-lg)',
      borderColor: '#8b5cf6'
    }
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '10px'
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statusInProgress: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    color: '#8b5cf6'
  },
  complaintId: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '500'
  },
  categoryBadge: {
    padding: '4px 10px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 12px 0',
    lineHeight: '1.4'
  },
  cardDescription: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '16px'
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-primary)'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  detailIcon: {
    fontSize: '14px'
  },
  detailText: {
    fontSize: '13px',
    color: 'var(--text-secondary)'
  },
  citizenInfo: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px'
  },
  citizenLabel: {
    fontWeight: '600',
    color: 'var(--text-secondary)'
  },
  citizenEmail: {
    color: 'var(--text-primary)'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '10px'
  },
  emptyText: {
    fontSize: '16px',
    color: 'var(--text-secondary)'
  }
};
