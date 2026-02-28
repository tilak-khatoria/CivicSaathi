import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useState } from 'react';
import WorkerNotificationBell from './WorkerNotificationBell';

export default function WorkerNavbar() {
  const { worker, logout } = useWorkerAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const navLinks = [
    { href: '/worker/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/worker/assigned', label: 'Assigned', icon: '📋' },
    { href: '/worker/pending', label: 'Pending', icon: '⏳' },
    { href: '/worker/completed', label: 'Completed', icon: '✅' },
    { href: '/worker/overdue', label: 'Overdue', icon: '⚠️' },
  ];

  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        <Link href="/worker/dashboard" style={styles.brand}>
          <div style={styles.logo}>
            <svg width="36" height="36" viewBox="0 0 50 50" fill="none">
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
          <span style={styles.brandText}>Civic Saathi Worker</span>
        </Link>

        <div style={styles.nav}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                ...styles.navLink,
                ...(router.pathname === link.href ? styles.navLinkActive : {}),
              }}
            >
              <span style={styles.navIcon}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        {worker && (
          <div style={styles.userSection}>
            <WorkerNotificationBell />
            <div
              style={styles.userButton}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div style={styles.avatar}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span style={styles.userName}>{worker.first_name || worker.username || 'Worker'}</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transition: 'transform 0.2s', transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {showDropdown && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <p style={styles.dropdownName}>{worker.first_name} {worker.last_name}</p>
                  <p style={styles.dropdownRole}>{worker.role || 'Worker'}</p>
                </div>
                <button onClick={handleLogout} style={styles.logoutButton}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    backgroundColor: 'var(--bg-card)',
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
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    fontWeight: '700',
    fontSize: '1.25rem',
  },
  logo: {
    width: '36px',
    height: '36px',
  },
  brandText: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  nav: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  navLink: {
    padding: '0.625rem 1rem',
    borderRadius: 'var(--radius-lg)',
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  navLinkActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--accent-success)',
  },
  navIcon: {
    fontSize: '1rem',
  },
  userSection: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-secondary)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-success)',
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 0.5rem)',
    right: 0,
    minWidth: '200px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    zIndex: 1001,
  },
  dropdownHeader: {
    padding: '1rem',
    borderBottom: '1px solid var(--border-primary)',
  },
  dropdownName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  dropdownRole: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  logoutButton: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--accent-danger)',
    fontSize: '0.875rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
