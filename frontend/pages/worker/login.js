import { useState, useEffect } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function WorkerLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, worker } = useWorkerAuth();
  const router = useRouter();

  useEffect(() => {
    if (worker) {
      router.push('/worker/dashboard');
    }
  }, [worker]);

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
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 style={styles.title}>Civic Saathi</h1>
          <p style={styles.subtitle}>Worker Login Portal</p>
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
            className="btn"
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
          <Link href="/login" style={styles.link}>
            ← Back to User Login
          </Link>
        </div>
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
    background: 'linear-gradient(135deg, #0f1e0f 0%, #1a2e1a 50%, #16213e 100%)',
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
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
  },
  link: {
    color: 'var(--accent-success)',
    fontWeight: '500',
    textDecoration: 'none',
    fontSize: '0.875rem',
  },
};
