import { useState, useEffect } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { useRouter } from 'next/router';
import WorkerNavbar from '../../components/WorkerNavbar';
import { workerComplaintsAPI } from '../../utils/workerApi';
import Link from 'next/link';

export default function CompletedComplaints() {
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
      const response = await workerComplaintsAPI.getCompletedComplaints();
      const data = response.data.results || response.data;
      setComplaints(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      // Fallback: filter from assigned complaints
      try {
        const allResponse = await workerComplaintsAPI.getAssignedComplaints();
        const allData = allResponse.data.results || allResponse.data;
        const completed = (Array.isArray(allData) ? allData : []).filter(
          c => c.status === 'COMPLETED' || c.status === 'RESOLVED'
        );
        setComplaints(completed);
      } catch (err) {
        console.error('Fallback failed:', err);
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
          <div style={styles.header}>
            <h1 style={styles.title}>Completed Complaints</h1>
            <p style={styles.subtitle}>Complaints you've successfully resolved</p>
          </div>

          {complaints.length > 0 ? (
            <div style={styles.complaintsGrid}>
              {complaints.map((complaint) => (
                <Link href={`/worker/complaint/${complaint.id}`} key={complaint.id}>
                  <div className="card" style={styles.complaintCard}>
                    <div style={styles.complaintHeader}>
                      <h3 style={styles.complaintTitle}>{complaint.title}</h3>
                      <span className={`badge badge-success`}>
                        {complaint.status}
                      </span>
                    </div>
                    <p style={styles.complaintDesc}>
                      {complaint.description?.substring(0, 150) || 'No description'}...
                    </p>
                    <div style={styles.complaintFooter}>
                      <span style={styles.complaintInfo}>📍 {complaint.city}</span>
                      <span style={styles.complaintInfo}>
                        📅 Created: {new Date(complaint.created_at).toLocaleDateString()}
                      </span>
                      <span style={styles.complaintInfo}>
                        ✅ Completed: {new Date(complaint.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card" style={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <h3 style={styles.emptyTitle}>No Completed Complaints</h3>
              <p style={styles.emptyText}>You haven't completed any complaints yet. Keep up the good work!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
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
