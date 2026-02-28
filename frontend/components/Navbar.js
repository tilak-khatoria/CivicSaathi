import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    switch (user.user_type) {
      case 'ADMIN':
      case 'SUB_ADMIN':
        return '/admin/dashboard';
      case 'DEPT_ADMIN':
        return '/department/dashboard';
      case 'WORKER':
        return '/worker/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link href="/" style={styles.logo}>
          <svg width="40" height="40" viewBox="0 0 50 50" fill="none">
            <rect width="50" height="50" rx="12" fill="url(#gradient)" />
            <path d="M25 15L35 25L25 35L15 25L25 15Z" fill="white" />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="50" y2="50">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
          <span style={styles.logoText}>Civic Saathi</span>
        </Link>

        <div style={styles.menu}>
          {user ? (
            <>
              <Link href={getDashboardLink()} style={styles.link}>
                Dashboard
              </Link>
              {user.user_type === 'CITIZEN' && (
                <>
                  <Link href="/complaints/all" style={styles.link}>
                    All Complaints
                  </Link>
                  <Link href="/complaints" style={styles.link}>
                    My Complaints
                  </Link>
                  <Link href="/complaints/upvoted" style={styles.link}>
                    Upvoted
                  </Link>
                </>
              )}
              <div style={styles.userMenu}>
                <span style={styles.username}>{user.username}</span>
                <span style={styles.userType}>{user.user_type}</span>
                <button onClick={handleLogout} className="btn btn-secondary" style={styles.logoutBtn}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" style={styles.link}>
                Login
              </Link>
              <Link href="/register">
                <button className="btn btn-primary">Get Started</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-primary)',
    padding: '1rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  menu: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  link: {
    color: 'var(--text-primary)',
    textDecoration: 'none',
    fontSize: '0.9375rem',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  username: {
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  userType: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
  },
};
