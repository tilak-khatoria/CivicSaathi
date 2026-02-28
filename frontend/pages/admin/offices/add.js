import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../../components/AdminNavbar';

export default function AddOffice() {
  const { adminUser, loading, isRootAdmin, isDepartmentAdmin } = useAdminAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    city: '',
    state: 'Rajasthan',
    address: '',
    pincode: '',
    phone: '',
    email: '',
    office_hours: '9:00 AM - 5:00 PM'
  });
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser) {
      fetchDepartments();
      
      // If department admin, auto-set department
      if (isDepartmentAdmin && adminUser.departmentId) {
        setFormData(prev => ({ ...prev, department_id: adminUser.departmentId.toString() }));
      }
    }
  }, [adminUser, loading]);

  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments from:', `http://localhost:8000/api/departments/`);
      
      const response = await fetch('http://localhost:8000/api/departments/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Departments response:', data);
      
      setDepartments(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to load departments: ' + error.message);
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For phone field, only allow digits and limit to 10
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: digitsOnly.slice(0, 10) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name || !formData.department_id || !formData.city || !formData.address) {
      setError('Please fill in all required fields');
      setSubmitting(false);
      return;
    }
    
    // Validate phone number if provided
    if (formData.phone) {
      if (formData.phone.length !== 10) {
        setError('Phone number must be exactly 10 digits');
        setSubmitting(false);
        return;
      }
      if (!/^[6-9]/.test(formData.phone)) {
        setError('Phone number must start with 6, 7, 8, or 9');
        setSubmitting(false);
        return;
      }
    }

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8000/api/offices/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Office created successfully!');
        setTimeout(() => {
          router.push('/admin/offices');
        }, 1500);
      } else {
        setError(data.error || 'Failed to create office');
      }
    } catch (error) {
      console.error('Error creating office:', error);
      setError('Failed to create office: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingDepts) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Head><title>Add Office - Admin</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <div style={styles.header}>
              <div>
                <Link href="/admin/offices" style={styles.backLink}>
                  ← Back to Offices
                </Link>
                <h1 style={styles.title}>Add New Office</h1>
                <p style={styles.subtitle}>Create a new office location</p>
              </div>
            </div>

            <div style={styles.formCard}>
              <form onSubmit={handleSubmit}>
                {error && (
                  <div style={styles.errorAlert}>
                    ⚠️ {error}
                  </div>
                )}

                {success && (
                  <div style={styles.successAlert}>
                    ✅ {success}
                  </div>
                )}

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Office Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="e.g., Central Office - Jaipur"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Department *</label>
                    {isRootAdmin ? (
                      <select
                        name="department_id"
                        value={formData.department_id}
                        onChange={handleInputChange}
                        style={styles.select}
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={departments.find(d => d.id === parseInt(formData.department_id))?.name || 'Loading...'}
                        style={{ ...styles.input, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                        readOnly
                      />
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="e.g., Jaipur"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>State *</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="e.g., Rajasthan"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      style={styles.textarea}
                      placeholder="Complete office address"
                      rows={3}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="e.g., 302001"
                      maxLength={10}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="10-digit mobile number"
                      pattern="[6-9][0-9]{9}"
                      title="Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9"
                      maxLength="10"
                    />
                    <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                      Must be 10 digits starting with 6, 7, 8, or 9
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="office@example.com"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Office Hours</label>
                    <input
                      type="text"
                      name="office_hours"
                      value={formData.office_hours}
                      onChange={handleInputChange}
                      style={styles.input}
                      placeholder="9:00 AM - 5:00 PM"
                    />
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <Link href="/admin/offices" style={styles.cancelButton}>
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    style={{
                      ...styles.submitButton,
                      opacity: submitting ? 0.6 : 1,
                      cursor: submitting ? 'not-allowed' : 'pointer'
                    }}
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Office'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0f172a' },
  main: { paddingTop: '70px' },
  content: { maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' },
  loadingContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  header: { marginBottom: '30px' },
  backLink: { display: 'inline-block', color: '#60a5fa', textDecoration: 'none', marginBottom: '12px', fontSize: '14px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: 0 },
  formCard: { background: '#1e293b', borderRadius: '12px', padding: '32px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid #334155' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: '14px', fontWeight: '600', color: '#f1f5f9', marginBottom: '8px' },
  input: { padding: '10px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#0f172a', color: '#f1f5f9' },
  select: { padding: '10px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#0f172a', color: '#f1f5f9', cursor: 'pointer' },
  textarea: { padding: '10px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', backgroundColor: '#0f172a', color: '#f1f5f9' },
  buttonGroup: { display: 'flex', gap: '12px', justifyContent: 'flex-end' },
  cancelButton: { padding: '10px 24px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' },
  submitButton: { padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  errorAlert: { padding: '12px 16px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #991b1b' },
  successAlert: { padding: '12px 16px', backgroundColor: '#064e3b', color: '#6ee7b7', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #065f46' }
};
