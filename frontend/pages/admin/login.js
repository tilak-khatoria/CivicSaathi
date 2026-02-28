import { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminLogin() {
  const { loginAdmin } = useAdminAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    cityContext: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCityInput, setShowCityInput] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = loginAdmin(
        formData.userId, 
        formData.password,
        formData.cityContext || null
      );

      if (!result.success) {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login - CivicSaathi</title>
      </Head>
      
      <div style={styles.container}>
        <div style={styles.loginCard}>
          {/* Logo and Header */}
          <div style={styles.header}>
            <div style={styles.logoContainer}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 style={styles.title}>CivicSaathi Admin</h1>
            <p style={styles.subtitle}>Administrator Login Portal</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.errorAlert}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Admin User ID</label>
              <input
                type="text"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                placeholder="Enter your admin user ID"
                required
                style={styles.input}
                autoComplete="username"
              />
              <small style={styles.hint}>
                Example: ulb_admin, swm_admin, core_civic_admin
              </small>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                style={styles.input}
                autoComplete="current-password"
              />
            </div>

            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                id="cityContext"
                checked={showCityInput}
                onChange={(e) => setShowCityInput(e.target.checked)}
                style={styles.checkbox}
              />
              <label htmlFor="cityContext" style={styles.checkboxLabel}>
                Login with specific city context (Department Admins only)
              </label>
            </div>

            {showCityInput && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>City Context</label>
                <input
                  type="text"
                  name="cityContext"
                  value={formData.cityContext}
                  onChange={handleChange}
                  placeholder="Enter city name (e.g., Mumbai, Delhi)"
                  style={styles.input}
                />
                <small style={styles.hint}>
                  Optional: Specify city for multi-city department operations
                </small>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {})
              }}
            >
              {loading ? (
                <>
                  <div className="spinner-small" style={styles.spinner}></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Login as Administrator
                </>
              )}
            </button>
          </form>

          {/* Role Information */}
          <div style={styles.roleInfo}>
            <h3 style={styles.roleInfoTitle}>Admin Hierarchy</h3>
            <ul style={styles.roleList}>
              <li style={styles.roleItem}>
                <strong>Root Admin (ULB):</strong> Complete system access
              </li>
              <li style={styles.roleItem}>
                <strong>Sub-Admins:</strong> Cluster-level management (4 clusters)
              </li>
              <li style={styles.roleItem}>
                <strong>Department Admins:</strong> Department-specific operations (14 departments)
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              CivicSaathi Administration System
            </p>
            <p style={styles.footerSubtext}>
              Secure access for authorized personnel only
            </p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              style={styles.backToUserLogin}
            >
              ← Back to User Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid var(--border-primary)',
    maxWidth: '480px',
    width: '100%',
    overflow: 'hidden'
  },
  header: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: 'white',
    padding: '40px 30px',
    textAlign: 'center'
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    opacity: 0.95,
    margin: 0
  },
  form: {
    padding: '30px',
    background: 'var(--bg-card)'
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-danger)',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid var(--border-secondary)',
    borderRadius: 'var(--radius-md)',
    fontSize: '15px',
    transition: 'all 0.2s',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)'
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '6px'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  checkboxLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    cursor: 'pointer'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
  },
  submitButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed'
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  roleInfo: {
    padding: '20px 30px',
    background: 'var(--bg-tertiary)',
    borderTop: '1px solid var(--border-primary)'
  },
  roleInfoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '12px'
  },
  roleList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  roleItem: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    paddingLeft: '20px',
    position: 'relative'
  },
  footer: {
    padding: '20px 30px',
    textAlign: 'center',
    borderTop: '1px solid var(--border-primary)',
    background: 'var(--bg-card)'
  },
  footerText: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    margin: '0 0 4px 0',
    fontWeight: '500'
  },
  footerSubtext: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: '0 0 12px 0'
  },
  backToUserLogin: {
    marginTop: '12px',
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid var(--border-secondary)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
