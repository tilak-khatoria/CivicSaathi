import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminNavbar from '../../../components/AdminNavbar';

export default function OfficeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [office, setOffice] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  useEffect(() => {
    if (id) {
      fetchOfficeDetails();
      fetchOfficeWorkers();
    }
  }, [id]);

  const fetchOfficeDetails = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/offices/`);
      if (res.ok) {
        const data = await res.json();
        const officeData = data.find(o => o.id === parseInt(id));
        if (officeData) {
          setOffice(officeData);
        } else {
          setError('Office not found');
        }
      }
    } catch (err) {
      console.error('Error fetching office:', err);
      setError('Failed to load office details');
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficeWorkers = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/workers/?office=${id}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setWorkers(list.filter(w => w.is_active));
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
    }
  };

  const openEditModal = () => {
    setEditForm({
      name: office.name || '',
      city: office.city || '',
      state: office.state || '',
      address: office.address || '',
      pincode: office.pincode || '',
      phone: office.phone || '',
      email: office.email || '',
      office_hours: office.office_hours || '9:00 AM - 5:00 PM',
      is_active: office.is_active,
    });
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/offices/${id}/update/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setOffice({ ...office, ...data });
        setEditSuccess('Office updated successfully!');
        setTimeout(() => setShowEditModal(false), 1200);
      } else {
        setEditError(data.error || 'Failed to update office');
      }
    } catch (err) {
      setEditError('Network error. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <AdminNavbar />
        <div style={styles.content}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Loading office details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !office) {
    return (
      <div style={styles.pageContainer}>
        <AdminNavbar />
        <div style={styles.content}>
          <div style={styles.errorContainer}>
            <p style={styles.errorText}>{error || 'Office not found'}</p>
            <button onClick={() => router.back()} style={styles.backButton}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <AdminNavbar />
      <div style={styles.content}>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <button onClick={() => router.back()} style={styles.backBtn}>
              ← Back
            </button>
            <h1 style={styles.title}>{office.name}</h1>
            <span style={office.is_active ? styles.activeBadge : styles.inactiveBadge}>
              {office.is_active ? '🟢 Active' : '🔴 Inactive'}
            </span>
            <button onClick={openEditModal} style={styles.editBtn}>
              ✏️ Edit Office
            </button>
          </div>

          {/* Office Information */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Office Information</h2>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Department</span>
                <span style={styles.infoValue}>{office.department_name}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>City</span>
                <span style={styles.infoValue}>{office.city}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>State</span>
                <span style={styles.infoValue}>{office.state}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Office Hours</span>
                <span style={styles.infoValue}>{office.office_hours}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Email</span>
                <span style={styles.infoValue}>{office.email || 'N/A'}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Phone</span>
                <span style={styles.infoValue}>{office.phone || 'N/A'}</span>
              </div>
              {office.address && (
                <div style={{...styles.infoItem, gridColumn: 'span 2'}}>
                  <span style={styles.infoLabel}>Address</span>
                  <span style={styles.infoValue}>{office.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Workers Section */}
          <div style={styles.card}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Assigned Workers</h2>
              <span style={styles.workerCount}>
                👷 {workers.length} worker{workers.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {workers.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>No workers assigned to this office</p>
              </div>
            ) : (
              <div style={styles.workerGrid}>
                {workers.map(worker => (
                  <div key={worker.id} style={styles.workerCard}>
                    <div style={styles.workerHeader}>
                      <h3 style={styles.workerName}>
                        {worker.first_name} {worker.last_name}
                      </h3>
                      <span style={styles.workerRole}>{worker.role}</span>
                    </div>
                    <div style={styles.workerInfo}>
                      <div style={styles.workerRow}>
                        <span style={styles.workerLabel}>📧</span>
                        <span style={styles.workerValue}>{worker.email}</span>
                      </div>
                      <div style={styles.workerRow}>
                        <span style={styles.workerLabel}>📱</span>
                        <span style={styles.workerValue}>{worker.phone || 'N/A'}</span>
                      </div>
                      <div style={styles.workerRow}>
                        <span style={styles.workerLabel}>🏢</span>
                        <span style={styles.workerValue}>{worker.department_name}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => router.push(`/admin/workers/${worker.id}`)}
                      style={styles.viewWorkerBtn}
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Office Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>✏️ Edit Office</h2>
              <button onClick={() => setShowEditModal(false)} style={styles.modalClose}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={styles.modalForm}>
              {editError && <div style={styles.formError}>{editError}</div>}
              {editSuccess && <div style={styles.formSuccess}>{editSuccess}</div>}

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Office Name *</label>
                  <input name="name" value={editForm.name} onChange={handleEditChange} required style={styles.formInput} placeholder="Office name" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>City *</label>
                  <input name="city" value={editForm.city} onChange={handleEditChange} required style={styles.formInput} placeholder="City" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>State *</label>
                  <input name="state" value={editForm.state} onChange={handleEditChange} required style={styles.formInput} placeholder="State" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Pincode</label>
                  <input name="pincode" value={editForm.pincode} onChange={handleEditChange} style={styles.formInput} placeholder="Pincode" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Phone</label>
                  <input name="phone" value={editForm.phone} onChange={handleEditChange} style={styles.formInput} placeholder="Phone number" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Email</label>
                  <input name="email" type="email" value={editForm.email} onChange={handleEditChange} style={styles.formInput} placeholder="Email" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Office Hours</label>
                  <input name="office_hours" value={editForm.office_hours} onChange={handleEditChange} style={styles.formInput} placeholder="e.g. 9:00 AM - 5:00 PM" />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Status</label>
                  <select name="is_active" value={editForm.is_active} onChange={handleEditChange} style={styles.formInput}>
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                  </select>
                </div>
                <div style={{...styles.formGroup, gridColumn: 'span 2'}}>
                  <label style={styles.formLabel}>Address *</label>
                  <textarea name="address" value={editForm.address} onChange={handleEditChange} required rows={3} style={{...styles.formInput, resize: 'vertical'}} placeholder="Full office address" />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowEditModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={editLoading} style={styles.saveBtn}>
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageContainer: { minHeight: '100vh', background: '#0f172a' },
  content: { paddingTop: '80px', minHeight: 'calc(100vh - 80px)' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' },
  spinner: { width: '50px', height: '50px', border: '4px solid #334155', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingText: { marginTop: '20px', color: '#94a3b8', fontSize: '16px' },
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' },
  errorText: { color: '#ef4444', fontSize: '18px', marginBottom: '20px' },
  header: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '30px', flexWrap: 'wrap' },
  backBtn: { padding: '10px 20px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },
  title: { fontSize: '28px', fontWeight: '700', color: '#f1f5f9', margin: 0, flex: 1 },
  activeBadge: { padding: '8px 16px', background: '#10b98120', color: '#10b981', borderRadius: '20px', fontSize: '14px', fontWeight: '600' },
  inactiveBadge: { padding: '8px 16px', background: '#ef444420', color: '#ef4444', borderRadius: '20px', fontSize: '14px', fontWeight: '600' },
  editBtn: { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },
  card: { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '30px', marginBottom: '24px' },
  sectionTitle: { fontSize: '20px', fontWeight: '700', color: '#f1f5f9', marginBottom: '20px', marginTop: 0 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  workerCount: { color: '#94a3b8', fontSize: '14px', fontWeight: '600' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' },
  infoItem: { display: 'flex', flexDirection: 'column', gap: '8px' },
  infoLabel: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' },
  infoValue: { fontSize: '16px', color: '#f1f5f9', fontWeight: '500' },
  emptyState: { textAlign: 'center', padding: '60px 20px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' },
  emptyText: { color: '#94a3b8', fontSize: '16px', margin: 0 },
  workerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  workerCard: { background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px', transition: 'border-color 0.2s' },
  workerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' },
  workerName: { fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: 0 },
  workerRole: { padding: '4px 12px', background: '#3b82f620', color: '#3b82f6', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
  workerInfo: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' },
  workerRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  workerLabel: { fontSize: '14px' },
  workerValue: { fontSize: '14px', color: '#94a3b8' },
  viewWorkerBtn: { width: '100%', padding: '10px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },
  backButton: { padding: '10px 20px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },

  // Edit modal
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' },
  modal: { background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px 16px', borderBottom: '1px solid #334155' },
  modalTitle: { fontSize: '20px', fontWeight: '700', color: '#f1f5f9', margin: 0 },
  modalClose: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px' },
  modalForm: { padding: '24px 28px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  formLabel: { fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formInput: { padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '14px', outline: 'none' },
  formError: { background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
  formSuccess: { background: '#10b98120', border: '1px solid #10b981', color: '#10b981', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px' },
  modalActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #334155', marginTop: '8px' },
  cancelBtn: { padding: '10px 24px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  saveBtn: { padding: '10px 28px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
};
