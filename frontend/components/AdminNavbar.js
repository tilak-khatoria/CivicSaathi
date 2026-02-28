import { useAdminAuth } from '../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function AdminNavbar() {
  const { adminUser, logoutAdmin, isRootAdmin, isSubAdmin, isDepartmentAdmin } = useAdminAuth();
  const router = useRouter();

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {/* Logo and Brand */}
        <Link href="/admin/dashboard">
          <div style={styles.brand}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span style={styles.brandText}>CivicSaathi Admin</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={styles.navLinks}>
          <NavLink href="/admin/dashboard" active={router.pathname === '/admin/dashboard'}>
            Dashboard
          </NavLink>
          
          <NavLink href="/admin/complaints" active={router.pathname.startsWith('/admin/complaints')}>
            All Complaints
          </NavLink>
          
          {(isRootAdmin || isSubAdmin) && (
            <NavLink href="/admin/departments" active={router.pathname.startsWith('/admin/departments')}>
              Departments
            </NavLink>
          )}
          
          <NavLink href="/admin/offices" active={router.pathname.startsWith('/admin/offices')}>
            Offices
          </NavLink>
          
          <NavLink href="/admin/workers" active={router.pathname.startsWith('/admin/workers')}>
            Workers
          </NavLink>
          
          <NavLink href="/admin/attendance" active={router.pathname.startsWith('/admin/attendance')}>
            Attendance
          </NavLink>

          <NavLink href="/admin/sla" active={router.pathname.startsWith('/admin/sla')}>
            SLA
          </NavLink>
        </div>

        {/* User Info and Actions */}
        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {adminUser?.displayName?.charAt(0) || 'A'}
            </div>
            <div style={styles.userDetails}>
              <p style={styles.userName}>{adminUser?.displayName}</p>
              <p style={styles.userRole}>
                {isRootAdmin && '🏛️ Root Admin'}
                {isSubAdmin && '📊 Sub-Admin'}
                {isDepartmentAdmin && '🏢 Dept Admin'}
              </p>
            </div>
          </div>
          
          <button onClick={logoutAdmin} style={styles.logoutButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }) {
  return (
    <Link href={href}>
      <span style={{
        ...styles.navLink,
        ...(active ? styles.navLinkActive : {})
      }}>
        {children}
      </span>
    </Link>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 1000
  },
  container: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '70px',
    gap: '30px'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer'
  },
  brandText: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
    letterSpacing: '-0.5px'
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    justifyContent: 'center'
  },
  navLink: {
    color: 'rgba(255, 255, 255, 0.9)',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'inline-block'
  },
  navLinkActive: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '16px'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  userName: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    margin: 0,
    maxWidth: '150px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  userRole: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '12px',
    margin: 0
  },
  logoutButton: {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  }
};
