import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { complaintAPI } from '../../utils/api';
import Link from 'next/link';

export default function MyComplaints() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchComplaints();
    }
  }, [user, loading]);

  const fetchComplaints = async () => {
    try {
      const response = await complaintAPI.getMyComplaints();
      // Handle paginated response
      const data = response.data.results || response.data;
      setComplaints(Array.isArray(data) ? data : []);
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
      'ASSIGNED': { bg: '#E8F5E9', color: '#388E3C', label: 'Assigned' },
      'IN_PROGRESS': { bg: '#E1F5FE', color: '#0288D1', label: 'In Progress' },
      'RESOLVED': { bg: '#E8F5E9', color: '#2E7D32', label: 'Resolved' },
      'COMPLETED': { bg: '#C8E6C9', color: '#1B5E20', label: 'Completed' },
      'DECLINED': { bg: '#FFEBEE', color: '#C62828', label: 'Declined' },
      'REJECTED': { bg: '#FFEBEE', color: '#C62828', label: 'Rejected' },
    };

    const style = statusStyles[status] || statusStyles['SUBMITTED'];
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

  const filteredComplaints = complaints.filter(complaint => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['COMPLETED', 'RESOLVED', 'REJECTED', 'DECLINED'].includes(complaint.status);
    if (filter === 'completed') return ['COMPLETED', 'RESOLVED'].includes(complaint.status);
    if (filter === 'declined') return ['DECLINED', 'REJECTED'].includes(complaint.status);
    return true;
  });

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
              <h1 style={styles.title}>My Complaints</h1>
              <p style={styles.subtitle}>
                View and track all your submitted complaints
              </p>
            </div>
            <Link href="/complaints/new">
              <button className="btn btn-primary" style={styles.newBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Complaint
              </button>
            </Link>
          </div>

          {/* Filter Tabs */}
          <div style={styles.filterTabs}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterTab,
                ...(filter === 'all' ? styles.filterTabActive : {}),
              }}
            >
              All ({complaints.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              style={{
                ...styles.filterTab,
                ...(filter === 'active' ? styles.filterTabActive : {}),
              }}
            >
              Active ({complaints.filter(c => !['COMPLETED', 'RESOLVED', 'REJECTED'].includes(c.status)).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              style={{
                ...styles.filterTab,
                ...(filter === 'completed' ? styles.filterTabActive : {}),
              }}
            >
              Completed ({complaints.filter(c => ['COMPLETED', 'RESOLVED'].includes(c.status)).length})
            </button>
            <button
              onClick={() => setFilter('declined')}
              style={{
                ...styles.filterTab,
                ...(filter === 'declined' ? styles.filterTabDeclineActive : {}),
              }}
            >
              Declined ({complaints.filter(c => ['DECLINED', 'REJECTED'].includes(c.status)).length})
            </button>
          </div>

          {/* Complaints List */}
          {filteredComplaints.length === 0 ? (
            <div style={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
              </svg>
              <h3 style={styles.emptyTitle}>No complaints found</h3>
              <p style={styles.emptyText}>
                {filter === 'all' 
                  ? "You haven't submitted any complaints yet."
                  : `No ${filter} complaints found.`}
              </p>
              <Link href="/complaints/new">
                <button className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Submit Your First Complaint
                </button>
              </Link>
            </div>
          ) : (
            <div style={styles.complaintsGrid}>
              {filteredComplaints.map((complaint) => (
                <Link key={complaint.id} href={`/complaints/${complaint.id}`} style={{ display: 'flex', textDecoration: 'none' }}>
                  <div className="card" style={styles.complaintCard}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.complaintTitle}>{complaint.title}</h3>
                      <span style={{ flexShrink: 0 }}>{getStatusBadge(complaint.status)}</span>
                    </div>
                    
                    <p style={styles.complaintDesc}>
                      {complaint.description.length > 150
                        ? complaint.description.substring(0, 150) + '...'
                        : complaint.description}
                    </p>

                    <div style={styles.complaintMeta}>
                      <div style={styles.metaItem}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span style={styles.metaText}>{complaint.location}</span>
                      </div>
                      
                      <div style={styles.metaItem}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span style={styles.metaText}>{new Date(complaint.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {complaint.upvote_count > 0 && (
                      <div style={styles.upvotes}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                          <path d="M12 19V6M5 12l7-7 7 7"></path>
                        </svg>
                        <span>{complaint.upvote_count} upvotes</span>
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
    backgroundColor: 'var(--bg-primary)',
  },
  main: {
    padding: '2rem 0',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: 'var(--text-secondary)',
  },
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
  },
  filterTabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid var(--border-color)',
  },
  filterTab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  filterTabActive: {
    color: 'var(--accent-primary)',
    borderBottomColor: 'var(--accent-primary)',
  },
  complaintsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px',
  },
  complaintCard: {
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    minHeight: '240px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
  },
  complaintTitle: {
    fontSize: '1.0625rem',
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    wordBreak: 'break-word',
  },
  complaintDesc: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '1rem',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    flex: 1,
  },
  complaintMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-color)',
    marginTop: 'auto',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    minWidth: 0,
  },
  metaText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  filterTabDeclineActive: {
    color: '#ef4444',
    borderBottomColor: '#ef4444',
  },
  upvotes: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    fontSize: '13px',
    color: '#f59e0b',
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 1.5rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginTop: '1rem',
    marginBottom: '0.5rem',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
};
