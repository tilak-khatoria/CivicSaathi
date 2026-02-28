import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../../components/Navbar';
import { complaintAPI } from '../../../utils/api';
import Link from 'next/link';

export default function PendingComplaints() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchComplaints();
    }
  }, [user, loading]);

  const fetchComplaints = async () => {
    try {
      const response = await complaintAPI.getAllComplaints();
      const data = response.data.results || response.data;
      // Filter for pending statuses
      const pendingComplaints = Array.isArray(data) 
        ? data.filter(c => ['SUBMITTED', 'PENDING', 'FILTERING', 'SORTING'].includes(c.status))
        : [];
      setComplaints(pendingComplaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    } finally {
      setLoadingData(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'SUBMITTED': { bg: '#E3F2FD', color: '#1976D2', label: 'Submitted' },
      'FILTERING': { bg: '#FFF3E0', color: '#F57C00', label: 'Under Review' },
      'PENDING': { bg: '#FFF3E0', color: '#F57C00', label: 'Pending' },
      'SORTING': { bg: '#FFF3E0', color: '#F57C00', label: 'Sorting' },
    };

    const style = statusStyles[status] || statusStyles['PENDING'];
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color,
      }}>
        {style.label}
      </span>
    );
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
              <h1 style={styles.title}>⏳ Pending Complaints</h1>
              <p style={styles.subtitle}>
                Complaints awaiting review and assignment ({complaints.length} total)
              </p>
            </div>
            <Link href="/dashboard">
              <button className="btn btn-secondary" style={styles.backBtn}>
                ← Back to Dashboard
              </button>
            </Link>
          </div>

          {/* Complaints List */}
          {complaints.length === 0 ? (
            <div className="card" style={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <h3 style={styles.emptyTitle}>No pending complaints</h3>
              <p style={styles.emptyText}>All complaints have been processed!</p>
            </div>
          ) : (
            <div style={styles.complaintsGrid}>
              {complaints.map((complaint) => (
                <Link href={`/complaints/${complaint.id}`} key={complaint.id}>
                  <div className="card" style={styles.complaintCard}>
                    <div style={styles.complaintHeader}>
                      <h3 style={styles.complaintTitle}>{complaint.title}</h3>
                      {getStatusBadge(complaint.status)}
                    </div>
                    <p style={styles.complaintDesc}>
                      {complaint.description?.substring(0, 120)}...
                    </p>
                    <div style={styles.complaintMeta}>
                      <span style={styles.metaItem}>
                        📍 {complaint.city || 'Unknown'}
                      </span>
                      <span style={styles.metaItem}>
                        📅 {new Date(complaint.created_at).toLocaleDateString()}
                      </span>
                      {complaint.upvotes > 0 && (
                        <span style={styles.metaItem}>
                          👍 {complaint.upvotes}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
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
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  complaintsGrid: {
    display: 'grid',
    gap: '1.5rem',
  },
  complaintCard: {
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
  complaintHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '0.75rem',
  },
  complaintTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    margin: 0,
    flex: 1,
  },
  complaintDesc: {
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '1rem',
  },
  complaintMeta: {
    display: 'flex',
    gap: '1.5rem',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: 'var(--text-secondary)',
  },
};
