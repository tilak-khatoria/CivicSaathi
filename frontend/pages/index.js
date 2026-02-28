import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user]);

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <div style={styles.hero}>
          <div style={styles.logo}>
            <svg width="80" height="80" viewBox="0 0 50 50" fill="none">
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
          
          <h1 style={styles.title}>
            Welcome to <span style={styles.titleGradient}>Civic Saathi</span>
          </h1>
          
          <p style={styles.description}>
            Your partner in civic governance. Report, track, and resolve civic issues in your community with ease.
          </p>

          <div style={styles.buttons}>
            <Link href="/register">
              <button className="btn btn-primary" style={styles.primaryBtn}>
                Get Started
              </button>
            </Link>
            <Link href="/login">
              <button className="btn btn-secondary" style={styles.secondaryBtn}>
                Sign In
              </button>
            </Link>
          </div>
        </div>

        <div style={styles.features}>
          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </div>
            <h3 style={styles.featureTitle}>Easy Reporting</h3>
            <p style={styles.featureText}>
              Submit civic complaints with photos, description, and location in just a few clicks.
            </p>
          </div>

          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-success)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3 style={styles.featureTitle}>Real-time Tracking</h3>
            <p style={styles.featureText}>
              Track your complaint status in real-time from submission to resolution.
            </p>
          </div>

          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning)" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <h3 style={styles.featureTitle}>Community Driven</h3>
            <p style={styles.featureText}>
              Upvote existing complaints to prioritize common issues in your area.
            </p>
          </div>

          <div className="card" style={styles.featureCard}>
            <div style={styles.featureIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-info)" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <h3 style={styles.featureTitle}>Quick Resolution</h3>
            <p style={styles.featureText}>
              AI-powered routing ensures your complaint reaches the right department instantly.
            </p>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.statItem}>
            <h2 style={styles.statNumber}>14+</h2>
            <p style={styles.statLabel}>Departments</p>
          </div>
          <div style={styles.statItem}>
            <h2 style={styles.statNumber}>24/7</h2>
            <p style={styles.statLabel}>Support</p>
          </div>
          <div style={styles.statItem}>
            <h2 style={styles.statNumber}>100%</h2>
            <p style={styles.statLabel}>Transparent</p>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2025 Civic Saathi. Built for Urban Local Bodies (ULBs) in India.
        </p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 1.5rem',
  },
  hero: {
    textAlign: 'center',
    maxWidth: '800px',
    marginBottom: '4rem',
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: '800',
    marginBottom: '1.5rem',
    lineHeight: '1.2',
  },
  titleGradient: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  description: {
    fontSize: '1.25rem',
    color: 'var(--text-secondary)',
    marginBottom: '2.5rem',
    lineHeight: '1.6',
  },
  buttons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    padding: '1rem 2.5rem',
    fontSize: '1.125rem',
  },
  secondaryBtn: {
    padding: '1rem 2.5rem',
    fontSize: '1.125rem',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    maxWidth: '1200px',
    width: '100%',
    marginBottom: '4rem',
  },
  featureCard: {
    textAlign: 'center',
    padding: '2rem',
  },
  featureIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 1.5rem',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  featureText: {
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  stats: {
    display: 'flex',
    gap: '4rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  statItem: {
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '3rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '0.5rem',
  },
  statLabel: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  footer: {
    padding: '2rem',
    textAlign: 'center',
    borderTop: '1px solid var(--border-primary)',
  },
  footerText: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
  },
};
