import { useState, useEffect } from 'react';
import { useWorkerAuth } from '../../../context/WorkerAuthContext';
import { useRouter } from 'next/router';
import WorkerNavbar from '../../../components/WorkerNavbar';
import { workerComplaintsAPI } from '../../../utils/workerApi';
import SLATimerCard from '../../../components/SLATimerCard';
import Link from 'next/link';

export default function ComplaintDetail() {
  const { worker, loading } = useWorkerAuth();
  const router = useRouter();
  const { id } = router.query;
  const [complaint, setComplaint] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionImage, setCompletionImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !worker) {
      router.push('/worker/login');
    } else if (worker && id) {
      fetchComplaint();
    }
  }, [worker, loading, id]);

  const fetchComplaint = async () => {
    try {
      const response = await workerComplaintsAPI.getComplaintDetail(id);
      setComplaint(response.data);
    } catch (error) {
      console.error('Error fetching complaint:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const formData = {
        completion_note: completionNotes,
        completion_image: completionImage,
      };
      
      await workerComplaintsAPI.submitCompletion(id, formData);
      alert('Complaint marked as completed successfully!');
      router.push('/worker/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit completion');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!worker || !complaint) return null;

  const isOverdue = complaint.sla_deadline && new Date(complaint.sla_deadline) < new Date() && 
                    (complaint.status === 'ASSIGNED' || complaint.status === 'IN_PROGRESS');
  const canComplete = complaint.status === 'ASSIGNED' || complaint.status === 'IN_PROGRESS';

  return (
    <div style={styles.container}>
      <WorkerNavbar />
      
      <main style={styles.main}>
        <div style={styles.content}>
          <div style={styles.breadcrumb}>
            <Link href="/worker/dashboard" style={styles.breadcrumbLink}>Dashboard</Link>
            <span style={styles.breadcrumbSeparator}>/</span>
            <span style={styles.breadcrumbCurrent}>Complaint #{complaint.id}</span>
          </div>

          {/* SLA Timer */}
          <SLATimerCard complaint={complaint} />

          <div className="card" style={styles.detailCard}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>{complaint.title}</h1>
                <div style={styles.meta}>
                  <span className={`badge badge-${getStatusColor(complaint.status)}`}>
                    {complaint.status}
                  </span>
                  {isOverdue && (
                    <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>
                      OVERDUE
                    </span>
                  )}
                </div>
              </div>
              {canComplete && !showSubmitForm && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowSubmitForm(true)}
                  style={styles.completeBtn}
                >
                  ✅ Mark as Complete
                </button>
              )}
            </div>

            {/* Complaint Details */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Description</h3>
              <p style={styles.description}>{complaint.description}</p>
            </div>

            {complaint.image && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Complaint Image</h3>
                <img src={complaint.image} alt="Complaint" style={styles.image} />
              </div>
            )}

            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Location</span>
                <span style={styles.infoValue}>📍 {complaint.city}, {complaint.state}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Department</span>
                <span style={styles.infoValue}>{complaint.department_name || 'N/A'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Office</span>
                <span style={styles.infoValue}>{complaint.office_name || 'Not assigned'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Submitted on</span>
                <span style={styles.infoValue}>{new Date(complaint.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Citizen</span>
                <span style={styles.infoValue}>{complaint.user_username || 'Anonymous'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Upvotes</span>
                <span style={styles.infoValue}>👍 {complaint.upvote_count || 0}</span>
              </div>
              {complaint.sla_deadline && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Deadline</span>
                  <span style={{...styles.infoValue, color: isOverdue ? 'var(--accent-danger)' : 'inherit'}}>
                    ⏰ {new Date(complaint.sla_deadline).toLocaleString()}
                  </span>
                </div>
              )}
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Priority</span>
                <span style={styles.infoValue}>{complaint.priority || 'Normal'}</span>
              </div>
            </div>

            {/* Completion Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Completion</h3>
              {complaint.status === 'COMPLETED' ? (
                <div>
                  {complaint.completion_image && (
                    <img 
                      src={complaint.completion_image} 
                      alt="Completion" 
                      style={{...styles.image, marginBottom: '16px'}} 
                    />
                  )}
                  {complaint.completion_note ? (
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                      <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', margin: 0 }}>
                        <strong>Completion Note:</strong><br />
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

            {/* Submit Completion Form */}
            {showSubmitForm && (
              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>Submit Completion</h3>
                {error && <div style={styles.error}>{error}</div>}
                <form onSubmit={handleSubmitCompletion} style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Completion Notes *</label>
                    <textarea
                      className="input"
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="Describe the work completed..."
                      rows="4"
                      required
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Completion Photo (Optional)</label>
                    <input
                      type="file"
                      className="input"
                      accept="image/*"
                      onChange={(e) => setCompletionImage(e.target.files[0])}
                    />
                    <p style={styles.hint}>Upload a photo showing the completed work</p>
                  </div>

                  <div style={styles.formActions}>
                    <button 
                      type="button"
                      className="btn"
                      onClick={() => setShowSubmitForm(false)}
                      style={styles.cancelBtn}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Completion'}
                    </button>
                  </div>
                </form>
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
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 1.5rem',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  breadcrumbLink: {
    color: 'var(--accent-success)',
    textDecoration: 'none',
  },
  breadcrumbSeparator: {
    color: 'var(--text-muted)',
  },
  breadcrumbCurrent: {
    color: 'var(--text-secondary)',
  },
  detailCard: {
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    marginBottom: '0.75rem',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  completeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  description: {
    lineHeight: '1.6',
    color: 'var(--text-secondary)',
  },
  image: {
    width: '100%',
    maxWidth: '600px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    wordWrap: 'break-word',
    wordBreak: 'break-word',
  },
  formSection: {
    marginTop: '2rem',
    paddingTop: '2rem',
    borderTop: '1px solid var(--border-primary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-danger)',
    color: 'var(--accent-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
  },
};
