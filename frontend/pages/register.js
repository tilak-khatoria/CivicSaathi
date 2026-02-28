import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    state: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For phone field, only allow digits and limit to 10
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: digitsOnly.slice(0, 10),
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate phone number
    if (!formData.phone) {
      setError('Phone number is required');
      return;
    }
    
    if (formData.phone.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }
    
    if (!/^[6-9]/.test(formData.phone)) {
      setError('Phone number must start with 6, 7, 8, or 9');
      return;
    }

    setLoading(true);
    const result = await register(formData);
    
    if (!result.success) {
      setError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
    }
    
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.registerBox}>
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
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Join Civic Saathi today</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>First Name</label>
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
              <label style={styles.label}>Last Name</label>
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
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              name="username"
              className="input"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
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
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                name="password"
                className="input"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
                required
                minLength="6"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm Password</label>
              <input
                type="password"
                name="confirm_password"
                className="input"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm password"
                required
              />
            </div>
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
              required
              pattern="[6-9][0-9]{9}"
              title="Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9"
              maxLength="10"
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
              Must be 10 digits starting with 6, 7, 8, or 9
            </small>
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>City</label>
              <input
                type="text"
                name="city"
                className="input"
                value={formData.city}
                onChange={handleChange}
                placeholder="Your city"
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
                placeholder="Your state"
                required
              />
            </div>
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
              'Create Account'
            )}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" style={styles.link}>
              Sign in
            </Link>
          </p>
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
    padding: '2rem 1rem',
    background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
  },
  registerBox: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-xl)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '600px',
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
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
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
};
