import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
              <rect width="50" height="50" rx="12" fill="url(#gradient)" />
              <path d="M25 15L35 25L25 35L15 25L25 15Z" fill="white" />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="50" y2="50">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={styles.title}>Civic Saathi</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an account?{' '}
            <Link href="/register" style={styles.link}>
              Sign up
            </Link>
          </p>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        <button
          type="button"
          onClick={() => router.push('/worker/login')}
          className="btn"
          style={styles.workerLoginBtn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Worker Login Portal</span>
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin/login')}
          className="btn"
          style={styles.adminLoginBtn}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span>Admin Login Portal</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
  },
  loginBox: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '450px',
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid var(--border-primary)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-danger)',
    color: 'var(--accent-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
  },
  submitBtn: {
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.875rem',
    fontSize: '1rem',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  link: {
    color: 'var(--accent-primary)',
    fontWeight: '500',
    textDecoration: 'none',
  },
  divider: {
    position: 'relative',
    margin: '2rem 0 1.5rem',
    textAlign: 'center',
  },
  dividerText: {
    backgroundColor: 'var(--bg-card)',
    padding: '0 1rem',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    position: 'relative',
    zIndex: 1,
  },
  workerLoginBtn: {
    width: '100%',
    padding: '1rem',
    marginBottom: '0.75rem',
    backgroundColor: 'var(--bg-tertiary)',
    border: '2px solid var(--border-secondary)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--accent-success)',
      transform: 'translateY(-2px)',
    },
  },
  adminLoginBtn: {
    width: '100%',
    padding: '1rem',
    backgroundColor: 'var(--bg-tertiary)',
    border: '2px solid var(--border-secondary)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--accent-primary)',
      transform: 'translateY(-2px)',
    },
  },
};
