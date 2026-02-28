import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../components/AdminNavbar';

export default function SystemSettings() {
  const { adminUser, loading, isRootAdmin } = useAdminAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser && !isRootAdmin) {
      router.push('/admin/dashboard');
    }
  }, [adminUser, loading, isRootAdmin]);

  const handleSave = async (section) => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: `${section} settings saved successfully!` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!adminUser || !isRootAdmin) {
    return null;
  }

  return (
    <>
      <Head><title>System Settings - Admin</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <div style={styles.header}>
              <div>
                <Link href="/admin/dashboard" style={styles.backLink}>
                  ← Back to Dashboard
                </Link>
                <h1 style={styles.title}>System Settings</h1>
                <p style={styles.subtitle}>Configure system parameters and preferences</p>
              </div>
            </div>

            {message.text && (
              <div style={{
                ...styles.alert,
                ...(message.type === 'success' ? styles.alertSuccess : styles.alertError)
              }}>
                {message.type === 'success' ? '✅' : '⚠️'} {message.text}
              </div>
            )}

            <div style={styles.tabContainer}>
              <div style={styles.tabs}>
                <button
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'general' ? styles.tabActive : {})
                  }}
                  onClick={() => setActiveTab('general')}
                >
                  ⚙️ General
                </button>
                <button
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'notifications' ? styles.tabActive : {})
                  }}
                  onClick={() => setActiveTab('notifications')}
                >
                  🔔 Notifications
                </button>
                <button
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'sla' ? styles.tabActive : {})
                  }}
                  onClick={() => setActiveTab('sla')}
                >
                  ⏱️ SLA Settings
                </button>
                <button
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'security' ? styles.tabActive : {})
                  }}
                  onClick={() => setActiveTab('security')}
                >
                  🔒 Security
                </button>
              </div>

              <div style={styles.tabContent}>
                {activeTab === 'general' && (
                  <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>General Settings</h2>
                    <div style={styles.settingsGrid}>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>System Name</label>
                        <input
                          type="text"
                          defaultValue="Civic Saathi"
                          style={styles.input}
                          placeholder="System name"
                        />
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Default Language</label>
                        <select style={styles.select}>
                          <option>English</option>
                          <option>Hindi</option>
                          <option>Rajasthani</option>
                        </select>
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Timezone</label>
                        <select style={styles.select}>
                          <option>Asia/Kolkata (IST)</option>
                        </select>
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Auto-Assignment</label>
                        <div style={styles.toggle}>
                          <input type="checkbox" defaultChecked />
                          <span style={styles.toggleLabel}>Enable automatic complaint assignment</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSave('General')} 
                      style={styles.saveButton}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Notification Settings</h2>
                    <div style={styles.settingsGrid}>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Email Notifications</label>
                        <div style={styles.toggle}>
                          <input type="checkbox" defaultChecked />
                          <span style={styles.toggleLabel}>Send email notifications</span>
                        </div>
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>SMS Notifications</label>
                        <div style={styles.toggle}>
                          <input type="checkbox" defaultChecked />
                          <span style={styles.toggleLabel}>Send SMS alerts</span>
                        </div>
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Escalation Alerts</label>
                        <div style={styles.toggle}>
                          <input type="checkbox" defaultChecked />
                          <span style={styles.toggleLabel}>Notify on complaint escalation</span>
                        </div>
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Daily Reports</label>
                        <div style={styles.toggle}>
                          <input type="checkbox" />
                          <span style={styles.toggleLabel}>Send daily summary reports</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSave('Notification')} 
                      style={styles.saveButton}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}

                {activeTab === 'sla' && (
                  <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>SLA Configuration</h2>
                    <div style={styles.settingsGrid}>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Default Escalation Time (hours)</label>
                        <input
                          type="number"
                          defaultValue="24"
                          style={styles.input}
                          min="1"
                        />
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Default Resolution Time (hours)</label>
                        <input
                          type="number"
                          defaultValue="72"
                          style={styles.input}
                          min="1"
                        />
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>High Priority Multiplier</label>
                        <input
                          type="number"
                          defaultValue="0.5"
                          style={styles.input}
                          step="0.1"
                          min="0.1"
                        />
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Auto-Escalation</label>
                        <div style={styles.toggle}>
                          <input type="checkbox" defaultChecked />
                          <span style={styles.toggleLabel}>Automatically escalate overdue complaints</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSave('SLA')} 
                      style={styles.saveButton}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div style={styles.section}>
                    <h2 style={styles.sectionTitle}>Security Settings</h2>
                    <div style={styles.settingsGrid}>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Session Timeout (minutes)</label>
                        <input
                          type="number"
                          defaultValue="30"
                          style={styles.input}
                          min="5"
                        />
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Password Expiry (days)</label>
                        <input
                          type="number"
                          defaultValue="90"
                          style={styles.input}
                          min="30"
                        />
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Two-Factor Authentication</label>
                        <div style={styles.toggle}>
                          <input type="checkbox" />
                          <span style={styles.toggleLabel}>Require 2FA for admin accounts</span>
                        </div>
                      </div>
                      <div style={styles.settingItem}>
                        <label style={styles.label}>Login Attempts Limit</label>
                        <input
                          type="number"
                          defaultValue="5"
                          style={styles.input}
                          min="3"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSave('Security')} 
                      style={styles.saveButton}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
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
    backgroundColor: '#0f172a',
  },
  main: {
    paddingTop: '70px',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '30px 20px',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  header: {
    marginBottom: '30px',
  },
  backLink: {
    display: 'inline-block',
    color: '#60a5fa',
    textDecoration: 'none',
    marginBottom: '12px',
    fontSize: '14px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#f1f5f9',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  alertSuccess: {
    backgroundColor: '#064e3b',
    color: '#6ee7b7',
    border: '1px solid #065f46',
  },
  alertError: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    border: '1px solid #991b1b',
  },
  tabContainer: {
    background: '#1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #334155',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #334155',
    overflowX: 'auto',
  },
  tab: {
    padding: '16px 24px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  tabContent: {
    padding: '32px',
  },
  section: {
    marginBottom: '0',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '24px',
  },
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  settingItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '8px',
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
  },
  select: {
    padding: '10px 14px',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    cursor: 'pointer',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toggleLabel: {
    fontSize: '14px',
    color: '#cbd5e1',
  },
  saveButton: {
    padding: '10px 24px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background 0.2s',
  },
};
