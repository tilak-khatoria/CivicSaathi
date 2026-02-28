import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminNavbar from '../../components/AdminNavbar';
import { slaAPI } from '../../utils/adminApi';

export default function SLAManagement() {
  const { adminUser, loading } = useAdminAuth();
  const router = useRouter();

  const [report, setReport] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [activeTab, setActiveTab] = useState('report');
  const [loadingData, setLoadingData] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !adminUser) router.push('/admin/login');
    else if (adminUser) fetchData();
  }, [adminUser, loading]);

  const fetchData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [reportRes, configsRes] = await Promise.all([
        slaAPI.getReport(),
        slaAPI.getConfigs(),
      ]);
      setReport(reportRes.data);
      setConfigs(configsRes.data);
    } catch (err) {
      setError('Failed to load SLA data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingData(false);
    }
  };

  const startEdit = (cfg) => {
    setEditingId(cfg.id);
    setEditValues({ escalation_hours: cfg.escalation_hours, resolution_hours: cfg.resolution_hours });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const res = await slaAPI.updateConfig(id, {
        escalation_hours: parseInt(editValues.escalation_hours),
        resolution_hours: parseInt(editValues.resolution_hours),
      });
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...res.data } : c));
      setEditingId(null);
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async (dryRun) => {
    setTriggering(true);
    setTriggerResult(null);
    try {
      const res = await slaAPI.triggerEscalation(dryRun);
      setTriggerResult({ success: true, output: res.data.output, dryRun });
      if (!dryRun) fetchData();
    } catch (err) {
      setTriggerResult({ success: false, error: err.response?.data?.error || err.message });
    } finally {
      setTriggering(false);
    }
  };

  if (loading || loadingData) {
    return (
      <>
        <AdminNavbar />
        <div style={styles.loading}>Loading SLA data...</div>
      </>
    );
  }

  const summary = report?.summary || {};
  const deptBreakdown = report?.department_breakdown || [];

  return (
    <>
      <Head><title>SLA Management – CivicSaathi Admin</title></Head>
      <AdminNavbar />
      <div style={styles.container}>
        <main style={styles.main}>
          <div style={styles.content}>

            {/* ── Header ── */}
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>SLA Management</h1>
                <p style={styles.subtitle}>
                  Monitor Service Level Agreement compliance and configure time limits per category
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={fetchData}
                  style={styles.refreshBtn}
                >
                  ↻ Refresh
                </button>
                <button
                  onClick={() => handleTrigger(true)}
                  disabled={triggering}
                  style={styles.dryRunBtn}
                >
                  Preview Escalation
                </button>
                <button
                  onClick={() => handleTrigger(false)}
                  disabled={triggering}
                  style={styles.triggerBtn}
                >
                  {triggering ? 'Running...' : '⚡ Run Escalation Now'}
                </button>
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div style={styles.errorBox}>
                ⚠ {error}
                <button onClick={() => setError(null)} style={styles.closeBtn}>✕</button>
              </div>
            )}

            {/* ── Trigger Result ── */}
            {triggerResult && (
              <div style={{
                ...styles.resultBox,
                borderColor: triggerResult.success ? '#10b981' : '#ef4444'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ color: triggerResult.success ? '#10b981' : '#ef4444', fontSize: '14px' }}>
                    {triggerResult.success
                      ? (triggerResult.dryRun ? '🔍 Preview Result (No changes made)' : '✅ Escalation Complete')
                      : '❌ Escalation Error'}
                  </strong>
                  <button onClick={() => setTriggerResult(null)} style={styles.closeBtn}>✕</button>
                </div>
                <pre style={styles.resultPre}>{triggerResult.output || triggerResult.error}</pre>
              </div>
            )}

            {/* ── Summary Stat Cards ── */}
            <div style={styles.statsGrid}>
              <StatCard
                value={summary.total_active ?? '—'}
                label="Active Complaints"
                color="var(--text-primary)"
                accent="#4f46e5"
              />
              <StatCard
                value={summary.overdue ?? '—'}
                label="SLA Breached (Overdue)"
                color="#ef4444"
                accent="#ef4444"
              />
              <StatCard
                value={summary.warning ?? '—'}
                label="Warning (≤ 6h left)"
                color="#f59e0b"
                accent="#f59e0b"
              />
              <StatCard
                value={summary.on_time ?? '—'}
                label="On Track"
                color="#10b981"
                accent="#10b981"
              />
              <StatCard
                value={`${summary.compliance_rate ?? '—'}%`}
                label="Active Compliance Rate"
                color="#3b82f6"
                accent="#3b82f6"
              />
              <StatCard
                value={`${summary.resolution_compliance ?? '—'}%`}
                label="Resolution Compliance"
                color="#8b5cf6"
                accent="#8b5cf6"
              />
            </div>

            {/* ── Tabs ── */}
            <div style={styles.tabBar}>
              <TabBtn active={activeTab === 'report'} onClick={() => setActiveTab('report')}>
                📊 Department Report
              </TabBtn>
              <TabBtn active={activeTab === 'config'} onClick={() => setActiveTab('config')}>
                ⚙️ SLA Configuration
              </TabBtn>
            </div>

            {/* ── Department Report Tab ── */}
            {activeTab === 'report' && (
              <div style={styles.tableCard}>
                <div style={styles.tableHeader}>
                  <h2 style={styles.tableTitle}>Department SLA Breakdown</h2>
                  <p style={styles.tableSubtitle}>
                    Active complaints grouped by department. Sorted by most overdue.
                  </p>
                </div>
                {deptBreakdown.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      No active complaints — all issues resolved.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {['Department', 'Total Active', 'Overdue', 'Warning', 'On Track', 'Compliance'].map(h => (
                            <th key={h} style={styles.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {deptBreakdown.map((row, i) => {
                          const compliance = row.total > 0
                            ? Math.round(((row.on_time + row.warning) / row.total) * 100)
                            : 100;
                          return (
                            <tr key={i} style={i % 2 === 0 ? styles.trEven : {}}>
                              <td style={{ ...styles.td, fontWeight: '500' }}>{row.department}</td>
                              <td style={{ ...styles.td, textAlign: 'center' }}>{row.total}</td>
                              <td style={{ ...styles.td, textAlign: 'center' }}>
                                <Badge value={row.overdue} type={row.overdue > 0 ? 'red' : 'gray'} />
                              </td>
                              <td style={{ ...styles.td, textAlign: 'center' }}>
                                <Badge value={row.warning} type={row.warning > 0 ? 'yellow' : 'gray'} />
                              </td>
                              <td style={{ ...styles.td, textAlign: 'center' }}>
                                <Badge value={row.on_time} type={row.on_time > 0 ? 'green' : 'gray'} />
                              </td>
                              <td style={{ ...styles.td, textAlign: 'center' }}>
                                <span style={{
                                  ...styles.compPill,
                                  backgroundColor: compliance >= 80 ? '#10b981' : compliance >= 50 ? '#f59e0b' : '#ef4444'
                                }}>
                                  {compliance}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Resolved stats */}
                <div style={styles.resolvedRow}>
                  <div style={styles.resolvedItem}>
                    <span style={{ color: '#10b981', fontWeight: '700', fontSize: '18px' }}>
                      {summary.resolved_on_time ?? 0}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>
                      resolved within SLA
                    </span>
                  </div>
                  <div style={styles.resolvedItem}>
                    <span style={{ color: '#ef4444', fontWeight: '700', fontSize: '18px' }}>
                      {summary.resolved_overdue ?? 0}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>
                      resolved past SLA deadline
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── SLA Config Tab ── */}
            {activeTab === 'config' && (
              <div style={styles.tableCard}>
                <div style={styles.tableHeader}>
                  <h2 style={styles.tableTitle}>SLA Configuration per Category</h2>
                  <p style={styles.tableSubtitle}>
                    Set how many hours before a complaint is escalated and the expected resolution time.
                    Click <strong>Edit</strong> on any row to modify.
                  </p>
                </div>
                {configs.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      No SLA configurations found. Add complaint categories first.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {['Department', 'Category', 'Escalate After', 'Resolve Within', 'Actions'].map(h => (
                            <th key={h} style={styles.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {configs.map((cfg, i) => (
                          <tr key={cfg.id} style={i % 2 === 0 ? styles.trEven : {}}>
                            <td style={{ ...styles.td, color: 'var(--text-secondary)', fontSize: '13px' }}>
                              {cfg.department_name}
                            </td>
                            <td style={{ ...styles.td, fontWeight: '500' }}>{cfg.category_name}</td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {editingId === cfg.id ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={editValues.escalation_hours}
                                  onChange={e => setEditValues(p => ({ ...p, escalation_hours: e.target.value }))}
                                  style={styles.inlineInput}
                                />
                              ) : (
                                <span style={styles.hoursBadge}>{cfg.escalation_hours}h</span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {editingId === cfg.id ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={editValues.resolution_hours}
                                  onChange={e => setEditValues(p => ({ ...p, resolution_hours: e.target.value }))}
                                  style={styles.inlineInput}
                                />
                              ) : (
                                <span style={{ ...styles.hoursBadge, backgroundColor: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                                  {cfg.resolution_hours}h
                                </span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {editingId === cfg.id ? (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => saveEdit(cfg.id)}
                                    disabled={saving}
                                    style={styles.saveBtn}
                                  >
                                    {saving ? '...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    style={styles.cancelBtn}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => startEdit(cfg)} style={styles.editBtn}>
                                  Edit
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={styles.configNote}>
                  <strong>Escalate After:</strong> If a complaint is not resolved within this many hours, it is automatically escalated to a higher authority and priority is increased.
                  &nbsp;&nbsp;<strong>Resolve Within:</strong> The target time for full resolution (used for resolution compliance tracking).
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

/* ── Small helper components ── */

function StatCard({ value, label, color, accent }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: '28px', fontWeight: '700', color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ ...styles.tabBtn, ...(active ? styles.tabBtnActive : {}) }}
    >
      {children}
    </button>
  );
}

function Badge({ value, type }) {
  const colors = {
    red: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
    yellow: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    green: { bg: 'rgba(16,185,129,0.15)', text: '#10b981' },
    gray: { bg: 'rgba(148,163,184,0.1)', text: '#94a3b8' },
  };
  const c = colors[type] || colors.gray;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 12px',
      borderRadius: '12px',
      fontSize: '13px',
      fontWeight: '600',
      backgroundColor: c.bg,
      color: c.text,
    }}>
      {value}
    </span>
  );
}

/* ── Styles ── */

const styles = {
  container: { minHeight: '100vh', backgroundColor: 'var(--bg-primary)' },
  main: { paddingTop: '70px' },
  content: { maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    paddingTop: '70px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: { fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px 0' },
  subtitle: { fontSize: '15px', color: 'var(--text-secondary)', margin: 0 },
  refreshBtn: {
    padding: '10px 18px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  dryRunBtn: {
    padding: '10px 18px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  triggerBtn: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  errorBox: {
    padding: '14px 20px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultBox: {
    padding: '16px 20px',
    background: 'var(--bg-card)',
    border: '1px solid',
    borderRadius: '10px',
    marginBottom: '24px',
  },
  resultPre: {
    whiteSpace: 'pre-wrap',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    margin: 0,
    maxHeight: '200px',
    overflowY: 'auto',
    fontFamily: 'monospace',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    fontSize: '16px',
    lineHeight: 1,
    padding: '0 4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  statCard: {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '20px 24px',
    border: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-md)',
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '6px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  tabBar: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tabBtn: {
    padding: '10px 22px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-primary)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: '1px solid transparent',
  },
  tableCard: {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid var(--border-primary)',
    boxShadow: 'var(--shadow-md)',
  },
  tableHeader: { marginBottom: '20px' },
  tableTitle: { fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px 0' },
  tableSubtitle: { fontSize: '13px', color: 'var(--text-secondary)', margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    borderBottom: '1px solid var(--border-primary)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-primary)',
  },
  trEven: { backgroundColor: 'rgba(255,255,255,0.02)' },
  compPill: {
    display: 'inline-block',
    padding: '3px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '700',
    color: 'white',
  },
  resolvedRow: {
    display: 'flex',
    gap: '32px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-primary)',
    flexWrap: 'wrap',
  },
  resolvedItem: { display: 'flex', alignItems: 'center' },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  configNote: {
    marginTop: '20px',
    padding: '14px 16px',
    background: 'rgba(79,70,229,0.08)',
    border: '1px solid rgba(79,70,229,0.2)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  hoursBadge: {
    display: 'inline-block',
    padding: '3px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '600',
    backgroundColor: 'rgba(79,70,229,0.12)',
    color: '#818cf8',
  },
  inlineInput: {
    width: '75px',
    padding: '6px 8px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    textAlign: 'center',
  },
  editBtn: {
    padding: '6px 16px',
    background: 'rgba(79,70,229,0.12)',
    border: '1px solid rgba(79,70,229,0.25)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    color: '#818cf8',
  },
  saveBtn: {
    padding: '6px 16px',
    background: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: 'white',
  },
  cancelBtn: {
    padding: '6px 16px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
};
