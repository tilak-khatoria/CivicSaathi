import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { complaintAPI } from '../../utils/api';
import Link from 'next/link';
import SLATimerCard from '../../components/SLATimerCard';

/**
 * Deduplicates activity logs to prevent showing the same status transition
 * twice in rapid succession (e.g. both the Sorting Layer and Assignment Layer
 * creating a "Being Sorted → Assigned" entry within the same pipeline run).
 *
 * Rules:
 *  - Input must already be in chronological order (oldest first).
 *  - Two consecutive entries are considered duplicates when they share the
 *    same `action` string AND their timestamps are within 60 seconds.
 *  - When deduplicating, the entry with the longer `note` is kept (more info).
 */
function deduplicateActivityLogs(logs) {
  if (!logs || logs.length === 0) return logs;
  const result = [];
  for (const log of logs) {
    if (result.length > 0) {
      const prev = result[result.length - 1];
      const timeDiff = Math.abs(new Date(log.timestamp) - new Date(prev.timestamp)) / 1000;
      if (log.action === prev.action && timeDiff <= 60) {
        // Same transition within 60 s — keep whichever has the longer note
        if ((log.note || '').length > (prev.note || '').length) {
          result[result.length - 1] = log;
        }
        continue;
      }
    }
    result.push(log);
  }
  return result;
}

export default function ComplaintDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [complaint, setComplaint] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && id) {
      fetchComplaintDetails();
    }
  }, [user, loading, id]);

  const fetchComplaintDetails = async () => {
    try {
      const [complaintResponse, logsResponse] = await Promise.all([
        complaintAPI.getComplaint(id),
        complaintAPI.getLogs(id).catch(() => ({ data: [] })),
      ]);
      setComplaint(complaintResponse.data);
      setLogs(logsResponse.data || []);
    } catch (error) {
      console.error('Error fetching complaint details:', error);
      if (error.response?.status === 404) {
        router.push('/complaints');
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleUpvote = async () => {
    if (upvoting) return;
    setUpvoting(true);
    try {
      await complaintAPI.upvote(id);
      await fetchComplaintDetails();
    } catch (error) {
      console.error('Error upvoting:', error);
      alert(error.response?.data?.error || 'Failed to upvote');
    } finally {
      setUpvoting(false);
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
        padding: '6px 16px',
        borderRadius: '16px',
        fontSize: '14px',
        fontWeight: '600',
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

  if (!user || !complaint) return null;

  const handleBackClick = (e) => {
    e.preventDefault();
    router.back();
  };

  return (
    <div style={styles.container}>
      <Navbar />
      
      <main style={styles.main}>
        <div style={styles.content}>
          {/* Back Button */}
          <a href="#" onClick={handleBackClick} style={styles.backLink}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back
          </a>

          {/* Header */}
          <div className="card" style={styles.headerCard}>
            <div style={styles.headerTop}>
              <h1 style={styles.title}>{complaint.title}</h1>
              {getStatusBadge(complaint.status)}
            </div>

            <div style={styles.metaRow}>
              <div style={styles.metaItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Created {new Date(complaint.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })}</span>
              </div>

              <div style={styles.metaItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>{complaint.user_username}</span>
              </div>

              <div style={styles.metaItem}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <span>{complaint.department_name || 'N/A'}</span>
              </div>
            </div>

            {/* Upvote Label (manual upvoting disabled — auto-upvote via duplicate detection) */}
            <div style={{
              ...styles.upvoteBtn,
              ...styles.upvoteBtnDisabled,
              cursor: 'default',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V6M5 12l7-7 7 7"/>
              </svg>
              <span>{complaint.upvote_count} {complaint.upvote_count === 1 ? 'Upvote' : 'Upvotes'}</span>
            </div>
          </div>

          {/* SLA Timer */}
          <SLATimerCard complaint={complaint} />

          <div style={styles.grid}>
            {/* Left Column */}
            <div style={styles.leftColumn}>
              {/* Description */}
              <div className="card" style={styles.section}>
                <h2 style={styles.sectionTitle}>Description</h2>
                <p style={styles.description}>{complaint.description}</p>
              </div>

              {/* Location */}
              <div className="card" style={styles.section}>
                <h2 style={styles.sectionTitle}>Location</h2>
                <div style={styles.locationInfo}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <div>
                    <p style={styles.locationAddress}>{complaint.location}</p>
                    <p style={styles.locationCity}>{complaint.city}, {complaint.state}</p>
                    {complaint.latitude && complaint.longitude && (
                      <p style={styles.locationCoords}>
                        {parseFloat(complaint.latitude).toFixed(6)}, {parseFloat(complaint.longitude).toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Images */}
              {complaint.image && (
                <div className="card" style={styles.section}>
                  <h2 style={styles.sectionTitle}>Image</h2>
                  <img 
                    src={complaint.image.startsWith('http') ? complaint.image : `http://localhost:8000${complaint.image}`} 
                    alt="Complaint" 
                    style={styles.image} 
                  />
                </div>
              )}

              {/* Completion Section */}
              <div className="card" style={styles.section}>
                <h2 style={styles.sectionTitle}>Completion</h2>
                {complaint.status === 'COMPLETED' ? (
                  <div>
                    {complaint.completion_image && (
                      <img 
                        src={complaint.completion_image.startsWith('http') ? complaint.completion_image : `http://localhost:8000${complaint.completion_image}`} 
                        alt="Completion" 
                        style={{...styles.image, marginBottom: '16px'}} 
                      />
                    )}
                    {complaint.completion_note ? (
                      <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                        <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0 }}>
                          <strong>Worker's Note:</strong><br />
                          {complaint.completion_note}
                        </p>
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No completion note provided</p>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Not completed yet</p>
                  </div>
                )}
              </div>

              {/* Declined/Rejected Reason */}
              {['DECLINED', 'REJECTED'].includes(complaint.status) && complaint.filter_reason && (
                <div className="card" style={{...styles.section, ...styles.warningCard}}>
                  <h2 style={styles.sectionTitle}>Reason</h2>
                  <p style={styles.description}>{complaint.filter_reason}</p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div style={styles.rightColumn}>
              {/* Details Card */}
              <div className="card" style={styles.section}>
                <h2 style={styles.sectionTitle}>Details</h2>
                <div style={styles.detailsList}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Department</span>
                    <span style={styles.detailValue}>{complaint.department_name || 'N/A'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Office</span>
                    <span style={styles.detailValue}>{complaint.office_name || 'Not assigned yet'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Priority</span>
                    <span style={styles.detailValue}>
                      {complaint.priority === 1 ? 'Normal' : complaint.priority === 2 ? 'Medium' : 'High'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Status</span>
                    <span style={styles.detailValue}>{complaint.status.replace('_', ' ')}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Submitted on</span>
                    <span style={styles.detailValue}>
                      {new Date(complaint.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', month: 'long', day: 'numeric', 
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Worker Assigned</span>
                    <span style={styles.detailValue}>{complaint.current_worker_name || 'Not assigned yet'}</span>
                  </div>
                  {complaint.completed_at && (
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Completed</span>
                      <span style={styles.detailValue}>
                        {new Date(complaint.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Log */}
              <div className="card" style={styles.section}>
                <h2 style={styles.sectionTitle}>Activity Log</h2>
                <div style={styles.logsList}>
                  {/* Always show the initial submission event */}
                  <div style={styles.logItem}>
                    <div style={styles.logDotFirst}></div>
                    <div style={styles.logContent}>
                      <p style={styles.logAction}>Complaint submitted</p>
                      <p style={styles.logTime}>
                        {new Date(complaint.created_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      {complaint.filter_reason && (
                        <p style={styles.logNotes}>Reason: {complaint.filter_reason}</p>
                      )}
                    </div>
                  </div>
                  {deduplicateActivityLogs([...logs].reverse()).map((log, index) => (
                    <div key={index} style={styles.logItem}>
                      <div style={styles.logDot}></div>
                      <div style={styles.logContent}>
                        <p style={styles.logAction}>{log.action}</p>
                        <p style={styles.logTime}>
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        {log.action_by_username && log.action_by_username !== 'System' && (
                          <p style={styles.logBy}>by {log.action_by_username}</p>
                        )}
                        {log.note && <p style={styles.logNotes}>{log.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '1.5rem',
    transition: 'color 0.2s',
  },
  headerCard: {
    marginBottom: '1.5rem',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    flex: 1,
    lineHeight: '1.3',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginBottom: '1.25rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid var(--border-color)',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  upvoteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    border: '2px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--card-bg)',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  upvoteBtnActive: {
    borderColor: '#f59e0b',
    color: '#f59e0b',
    background: '#fffbeb',
  },
  upvoteBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
    borderColor: 'var(--border-color)',
    color: 'var(--text-secondary)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  description: {
    fontSize: '0.9375rem',
    color: 'var(--text-primary)',
    lineHeight: '1.7',
  },
  locationInfo: {
    display: 'flex',
    gap: '0.75rem',
  },
  locationAddress: {
    fontSize: '0.9375rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
  },
  locationCity: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem',
  },
  locationCoords: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
  },
  image: {
    width: '100%',
    borderRadius: '8px',
    marginTop: '8px',
  },
  completionNote: {
    marginTop: '0.75rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
  },
  warningCard: {
    borderLeft: '4px solid var(--accent-danger)',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
    textAlign: 'right',
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    position: 'relative',
    paddingLeft: '0.5rem',
    borderLeft: '2px solid var(--border-color, rgba(255,255,255,0.1))',
    marginLeft: '0.25rem',
  },
  logItem: {
    display: 'flex',
    gap: '0.75rem',
    position: 'relative',
    paddingBottom: '1.25rem',
  },
  logDotFirst: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-success, #10b981)',
    marginTop: '4px',
    flexShrink: 0,
    marginLeft: '-6px',
    border: '2px solid var(--bg-card, var(--bg-secondary))',
    boxSizing: 'border-box',
  },
  logDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-primary)',
    marginTop: '4px',
    flexShrink: 0,
    marginLeft: '-6px',
    border: '2px solid var(--bg-card, var(--bg-secondary))',
    boxSizing: 'border-box',
  },
  logContent: {
    flex: 1,
    paddingBottom: '0.25rem',
  },
  logAction: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '0.2rem',
    color: 'var(--text-primary)',
  },
  logTime: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '0.1rem',
  },
  logBy: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    marginBottom: '0.25rem',
  },
  logNotes: {
    fontSize: '0.8125rem',
    color: 'var(--text-secondary)',
    marginTop: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-sm)',
  },
  // Timer styles
  timerCard: {
    marginBottom: '1.5rem',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid',
    transition: 'all 0.3s ease',
    backgroundColor: 'var(--bg-secondary)',
  },
  timerCompleted: {
    borderColor: '#10b981',
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
  },
  timerDeclined: {
    borderColor: '#6b7280',
    boxShadow: '0 0 20px rgba(107, 114, 128, 0.15)',
  },
  timerPending: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)',
  },
  timerOverdue: {
    borderColor: '#dc2626',
    boxShadow: '0 0 20px rgba(220, 38, 38, 0.15)',
  },
  timerCritical: {
    borderColor: '#ea580c',
    boxShadow: '0 0 20px rgba(234, 88, 12, 0.15)',
  },
  timerWarning: {
    borderColor: '#eab308',
    boxShadow: '0 0 20px rgba(234, 179, 8, 0.15)',
  },
  timerOk: {
    borderColor: '#10b981',
    boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
  },
  timerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  timerIcon: {
    fontSize: '2rem',
  },
  timerTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    flex: 1,
    margin: 0,
    color: 'var(--text-primary)',
  },
  priorityBadge: {
    padding: '0.375rem 0.875rem',
    borderRadius: '1rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  timerStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },
  timerStat: {
    textAlign: 'center',
    padding: '0.75rem',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '8px',
    border: '1px solid var(--border-primary)',
  },
  timerStatLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  timerStatValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  escalationWarning: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#dc2626',
    textAlign: 'center',
  },
};
