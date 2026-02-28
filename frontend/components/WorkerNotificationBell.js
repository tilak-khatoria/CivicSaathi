import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { workerNotificationsAPI } from '../utils/workerApi';

const POLL_INTERVAL = 15000; // 15 seconds

export default function WorkerNotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef(0);
  const audioRef = useRef(null);
  const panelRef = useRef(null);

  // Create audio element once on mount
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.7;
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await workerNotificationsAPI.getNotifications();
      const { notifications: data, unread_count } = res.data;
      setNotifications(data);
      setUnreadCount(unread_count);

      // Play beep if unread count increased (new notification arrived)
      if (unread_count > prevUnreadRef.current && prevUnreadRef.current !== null) {
        try {
          audioRef.current?.play();
        } catch (_) {
          // Browser may block autoplay until user interaction
        }
      }
      prevUnreadRef.current = unread_count;
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click-outside to close panel
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    if (showPanel) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPanel]);

  const handleMarkRead = async (id) => {
    try {
      await workerNotificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await workerNotificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) handleMarkRead(n.id);
    if (n.complaint_id) {
      setShowPanel(false);
      router.push(`/worker/complaint/${n.complaint_id}`);
    }
  };

  const timeAgo = (iso) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={styles.wrapper} ref={panelRef}>
      {/* Bell button */}
      <button
        style={styles.bellButton}
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {showPanel && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button style={styles.markAllBtn} onClick={handleMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.panelBody}>
            {notifications.length === 0 ? (
              <div style={styles.empty}>No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    ...styles.notifItem,
                    backgroundColor: n.is_read ? 'transparent' : 'rgba(16, 185, 129, 0.06)',
                  }}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div style={styles.notifDot}>
                    {!n.is_read && <span style={styles.dot} />}
                  </div>
                  <div style={styles.notifContent}>
                    <div style={styles.notifTitle}>{n.title}</div>
                    <div style={styles.notifMessage}>{n.message}</div>
                    <div style={styles.notifTime}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  bellButton: {
    position: 'relative',
    background: 'transparent',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-lg, 10px)',
    padding: '0.5rem',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: '700',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
  },
  panel: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '380px',
    maxHeight: '480px',
    backgroundColor: 'var(--bg-card, #fff)',
    border: '1px solid var(--border-primary, #e5e7eb)',
    borderRadius: 'var(--radius-lg, 10px)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    zIndex: 2000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.85rem 1rem',
    borderBottom: '1px solid var(--border-primary, #e5e7eb)',
  },
  panelTitle: {
    fontWeight: '700',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#10b981',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  panelBody: {
    overflowY: 'auto',
    maxHeight: '400px',
  },
  empty: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
  },
  notifItem: {
    display: 'flex',
    gap: '0.6rem',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-primary, #f1f1f1)',
    transition: 'background 0.15s',
  },
  notifDot: {
    paddingTop: '6px',
    width: '12px',
    flexShrink: 0,
  },
  dot: {
    display: 'block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    fontWeight: '600',
    fontSize: '0.85rem',
    marginBottom: '2px',
    color: 'var(--text-primary)',
  },
  notifMessage: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  notifTime: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    marginTop: '4px',
    opacity: 0.7,
  },
};
