import { useState, useEffect } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { useRouter } from 'next/router';
import WorkerNavbar from '../../components/WorkerNavbar';
import { workerComplaintsAPI } from '../../utils/workerApi';
import Link from 'next/link';

export default function AssignedComplaints() {
  const { worker, loading } = useWorkerAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !worker) {
      router.push('/worker/login');
    } else if (worker) {
      fetchComplaints();
    }
  }, [worker, loading]);

  const fetchComplaints = async () => {
    try {
      const response = await workerComplaintsAPI.getAssignedComplaints();
      const data = response.data.results || response.data;
      setComplaints(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
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
          <div style={styles.header}>
            <h1 style={styles.title}>Assigned Complaints</h1>
            <p style={styles.subtitle}>All complaints assigned to you</p>
          </div>

          {complaints.length > 0 ? (
            <div style={styles.complaintsGrid}>
              {complaints.map((complaint) => (
                <Link href={`/worker/complaint/${complaint.id}`} key={complaint.id}>
                  <div className="card" style={styles.complaintCard}>
                    <div style={styles.complaintHeader}>
                      <h3 style={styles.complaintTitle}>{complaint.title}</h3>
                      <span className={`badge badge-${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </span>
                    </div>
                    <p style={styles.complaintDesc}>
                      {complaint.description?.substring(0, 150) || 'No description'}...
                    </p>
                    <div style={styles.complaintFooter}>
                      <span style={styles.complaintInfo}>📍 {complaint.city}</span>
                      <span style={styles.complaintInfo}>
                        📅 {new Date(complaint.created_at).toLocaleDateString()}
                      </span>
                      {complaint.sla_deadline && (
                        <span style={styles.complaintInfo}>
                          ⏰ Due: {new Date(complaint.sla_deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card" style={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
              <h3 style={styles.emptyTitle}>No Assigned Complaints</h3>
              <p style={styles.emptyText}>You don't have any complaints assigned to you yet.</p>
            </div>
          )}
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
    marginBottom: '2rem',
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
  complaintsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
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
    flexWrap: 'wrap',
    gap: '1rem',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  complaintInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: 'var(--text-secondary)',
  },
};
