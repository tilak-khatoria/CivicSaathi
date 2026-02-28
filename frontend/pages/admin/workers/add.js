import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../../components/AdminNavbar';
import { adminWorkerAPI, adminDepartmentAPI, adminOfficeAPI } from '../../../utils/adminApi';

export default function AddWorker() {
  const { adminUser, loading, isRootAdmin, isDepartmentAdmin } = useAdminAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department_id: '',
    office_id: '',
    role: '',
    city: '',
    state: 'Rajasthan',
    address: ''
  });
  const [departments, setDepartments] = useState([]);
  const [offices, setOffices] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser) {
      fetchDepartments();
      
      // If department admin, auto-set department and fetch offices
      if (isDepartmentAdmin && adminUser.departmentId) {
        setFormData(prev => ({ ...prev, department_id: adminUser.departmentId.toString() }));
        fetchOffices(adminUser.departmentId);
      }
    }
  }, [adminUser, loading]);

  useEffect(() => {
    // Fetch offices when department changes
    if (formData.department_id) {
      console.log('Department changed to:', formData.department_id);
      fetchOffices(formData.department_id);
    } else {
      console.log('No department selected, clearing offices');
      setOffices([]);
    }
  }, [formData.department_id]);

  const fetchDepartments = async () => {
    try {
      console.log('Fetching departments from:', `http://localhost:8000/api/departments/`);
      
      const response = await fetch('http://localhost:8000/api/departments/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Departments response:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Number of departments:', data.length);
      
      setDepartments(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to load departments: ' + error.message);
      setDepartments([]);
    } finally {
      setLoadingDepts(false);
    }
  };

  const fetchOffices = async (departmentId) => {
    try {
      console.log('Fetching offices for department:', departmentId);
      
      const response = await fetch(`http://localhost:8000/api/offices/?department_id=${departmentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Offices response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Offices response data:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Number of offices:', Array.isArray(data) ? data.length : 'not an array');
      
      const officesArray = Array.isArray(data) ? data : (data.results || []);
      console.log('Setting offices to:', officesArray);
      setOffices(officesArray);
    } catch (error) {
      console.error('Error fetching offices:', error);
      setError('Failed to load offices: ' + error.message);
      setOffices([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For phone field, only allow digits and limit to 10
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: digitsOnly.slice(0, 10) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.username || !formData.password || !formData.first_name || 
          !formData.last_name || !formData.department_id || !formData.role || !formData.city) {
        throw new Error('Please fill in all required fields');
      }
      
      // Validate phone number if provided
      if (formData.phone) {
        if (formData.phone.length !== 10) {
          throw new Error('Phone number must be exactly 10 digits');
        }
        if (!/^[6-9]/.test(formData.phone)) {
          throw new Error('Phone number must start with 6, 7, 8, or 9');
        }
      }

      // Create worker
      await adminWorkerAPI.create(formData);
      
      setSuccess('Worker created successfully!');
      
      // Reset form
      setTimeout(() => {
        router.push('/admin/workers');
      }, 1500);
    } catch (error) {
      console.error('Error creating worker:', error);
      setError(error.response?.data?.error || error.message || 'Failed to create worker');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingDepts) {
    return <div style={styles.loadingContainer}><div className="spinner"></div></div>;
  }

  return (
    <>
      <Head><title>Add Worker - Admin</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <div style={styles.breadcrumb}>
              <Link href="/admin/workers" style={styles.breadcrumbLink}>Workers</Link>
              <span style={styles.breadcrumbSeparator}>/</span>
              <span style={styles.breadcrumbCurrent}>Add New Worker</span>
            </div>

            <div style={styles.header}>
              <h1 style={styles.title}>Add New Worker</h1>
              <p style={styles.subtitle}>Create a new worker account</p>
            </div>

            <div className="card" style={styles.formCard}>
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

              <form onSubmit={handleSubmit} style={styles.form}>
                {/* Login Credentials Section */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Login Credentials</h3>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Username *</label>
                      <input
                        type="text"
                        name="username"
                        className="input"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="worker_username"
                        required
                      />
                      <p style={styles.hint}>This will be used for worker login</p>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Password *</label>
                      <input
                        type="password"
                        name="password"
                        className="input"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                        required
                      />
                      <p style={styles.hint}>Minimum 6 characters</p>
                    </div>
                  </div>
                </div>

                {/* Personal Information Section */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Personal Information</h3>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>First Name *</label>
                      <input
                        type="text"
                        name="first_name"
                        className="input"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="First name"
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Last Name *</label>
                      <input
                        type="text"
                        name="last_name"
                        className="input"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Last name"
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email</label>
                      <input
                        type="email"
                        name="email"
                        className="input"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="worker@example.com"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        className="input"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        pattern="[6-9][0-9]{9}"
                        title="Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9"
                        maxLength="10"
                      />
                      <p style={styles.hint}>Must be 10 digits starting with 6, 7, 8, or 9</p>
                    </div>
                  </div>
                </div>

                {/* Work Information Section */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>Work Information</h3>
                  <div style={styles.formGrid}>
                    {/* Department - Only show dropdown if ULB admin, otherwise show read-only */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Department *</label>
                      {isRootAdmin ? (
                        <select
                          name="department_id"
                          className="input"
                          value={formData.department_id}
                          onChange={handleChange}
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
                        <>
                          <input
                            type="text"
                            className="input"
                            value={adminUser?.departmentName || 'Your Department'}
                            disabled
                            style={styles.disabledInput}
                          />
                          <p style={styles.hint}>Auto-assigned to your department</p>
                        </>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Office (Optional)</label>
                      <select
                        name="office_id"
                        className="input"
                        value={formData.office_id}
                        onChange={handleChange}
                      >
                        <option value="">Select Office</option>
                        {offices.length === 0 && formData.department_id && (
                          <option value="" disabled>No offices available for this department</option>
                        )}
                        {offices.map(office => (
                          <option key={office.id} value={office.id}>
                            {office.name} - {office.city}
                          </option>
                        ))}
                      </select>
                      <p style={styles.hint}>
                        {formData.department_id 
                          ? `${offices.length} office(s) available` 
                          : 'Select a department first'}
                      </p>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Role/Designation *</label>
                      <input
                        type="text"
                        name="role"
                        className="input"
                        value={formData.role}
                        onChange={handleChange}
                        placeholder="e.g., Electrician, Plumber, Road Worker"
                        required
                      />
                      <p style={styles.hint}>Worker's job role or specialty</p>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>City *</label>
                      <input
                        type="text"
                        name="city"
                        className="input"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="Enter city name"
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>State</label>
                      <input
                        type="text"
                        name="state"
                        className="input"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="State"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Address</label>
                      <textarea
                        name="address"
                        className="input"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Full address"
                        rows="3"
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div style={styles.formActions}>
                  <Link href="/admin/workers">
                    <button type="button" style={styles.cancelBtn}>
                      Cancel
                    </button>
                  </Link>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                    style={styles.submitBtn}
                  >
                    {submitting ? 'Creating Worker...' : 'Create Worker'}
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
    maxWidth: '1200px',
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
    color: 'var(--accent-primary)',
    textDecoration: 'none',
  },
  breadcrumbSeparator: {
    color: 'var(--text-muted)',
  },
  breadcrumbCurrent: {
    color: 'var(--text-secondary)',
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
  formCard: {
    padding: '2rem',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-danger)',
    color: 'var(--accent-danger)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.5rem',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid var(--accent-success)',
    color: 'var(--accent-success)',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  section: {
    paddingBottom: '1.5rem',
    borderBottom: '1px solid var(--border-primary)',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
    color: 'var(--text-primary)',
  },
  hint: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  disabledInput: {
    backgroundColor: 'var(--bg-tertiary)',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    paddingTop: '1rem',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitBtn: {
    padding: '0.75rem 1.5rem',
  },
};
