/**
 * SLATimerCard — shared complaint SLA info block shown on all complaint detail pages.
 *
 * Displays:
 *  1. Allocated SLA time (total resolution window)
 *  2. Complaint lifetime (time elapsed since submission)
 *  3. SLA status (on-track / warning / critical / overdue / completed / declined)
 *  4. Overdue duration (if complaint has passed its SLA deadline)
 */

export default function SLATimerCard({ complaint }) {
  const timer = complaint?.sla_timer;
  const deadline = complaint?.sla_deadline;

  // ─── colour palette keyed by sla_timer.status ───────────────────────────
  const palette = {
    completed: { border: '#10b981', glow: 'rgba(16,185,129,0.15)',  badge: '#10b981', text: '#10b981' },
    declined:  { border: '#6b7280', glow: 'rgba(107,114,128,0.10)', badge: '#6b7280', text: '#6b7280' },
    pending:   { border: '#3b82f6', glow: 'rgba(59,130,246,0.15)',  badge: '#3b82f6', text: '#3b82f6' },
    overdue:   { border: '#dc2626', glow: 'rgba(220,38,38,0.15)',   badge: '#dc2626', text: '#dc2626' },
    critical:  { border: '#ea580c', glow: 'rgba(234,88,12,0.15)',   badge: '#ea580c', text: '#ea580c' },
    warning:   { border: '#eab308', glow: 'rgba(234,179,8,0.15)',   badge: '#d97706', text: '#d97706' },
    ok:        { border: '#10b981', glow: 'rgba(16,185,129,0.15)',  badge: '#10b981', text: '#10b981' },
  };

  // ─── helpers ─────────────────────────────────────────────────────────────
  function fmtHours(h) {
    if (h == null || isNaN(h)) return '—';
    const abs = Math.abs(h);
    if (abs < 1)  return `${Math.round(abs * 60)}m`;
    if (abs >= 48) return `${Math.floor(abs / 24)}d ${Math.round(abs % 24)}h`;
    return `${abs % 1 === 0 ? abs : abs.toFixed(1)}h`;
  }

  function StatBox({ label, value, sub, color, highlight }) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '0.75rem 0.5rem',
        backgroundColor: highlight ? `${highlight}15` : 'var(--bg-primary)',
        borderRadius: '10px',
        border: `1px solid ${highlight ? highlight + '40' : 'var(--border-primary)'}`,
      }}>
        <div style={{
          fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '1.5rem', fontWeight: '800',
          color: color || 'var(--text-primary)',
          lineHeight: 1.1,
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {sub}
          </div>
        )}
      </div>
    );
  }

  // ─── Full card using sla_timer ────────────────────────────────────────────
  if (timer) {
    const c = palette[timer.status] || palette.ok;
    const priorityColor = timer.priority === 3 ? '#dc2626' : timer.priority === 2 ? '#ea580c' : '#3b82f6';

    return (
      <div style={{
        marginBottom: '1.5rem',
        padding: '1.5rem',
        borderRadius: '14px',
        border: `2px solid ${c.border}`,
        boxShadow: `0 0 24px ${c.glow}`,
        backgroundColor: 'var(--bg-secondary)',
      }}>
        {/* ── Header row ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          marginBottom: timer.status === 'declined' ? 0 : '1.25rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>{timer.icon}</span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: c.text, marginBottom: '0.15rem',
            }}>
              SLA Status
            </div>
            <div style={{
              fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {timer.title}
            </div>
          </div>

          {/* Priority badge */}
          <span style={{
            padding: '0.35rem 0.9rem', borderRadius: '20px',
            fontSize: '0.72rem', fontWeight: '700', color: '#fff',
            backgroundColor: priorityColor, textTransform: 'uppercase',
            letterSpacing: '0.05em', whiteSpace: 'nowrap',
          }}>
            {timer.priority_text} Priority
          </span>
        </div>

        {/* ── Stat grid (hidden for declined) ── */}
        {timer.status !== 'declined' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.75rem',
          }}>
            {/* 1. Allocated SLA */}
            <StatBox
              label="Allocated SLA"
              value={fmtHours(timer.resolution_deadline)}
              sub="Total time allowed"
            />

            {/* 2. Complaint Lifetime */}
            <StatBox
              label="Complaint Age"
              value={fmtHours(timer.hours_elapsed)}
              sub={timer.status === 'completed' ? 'Total time taken' : 'Time since submission'}
              color={timer.status === 'completed' ? '#10b981' : undefined}
            />

            {/* 3. SLA Status detail — overdue or time remaining */}
            {timer.status !== 'completed' && (
              timer.is_overdue ? (
                <StatBox
                  label="Overdue By"
                  value={fmtHours(timer.hours_overdue)}
                  sub="Past SLA deadline"
                  color="#dc2626"
                  highlight="#dc2626"
                />
              ) : (
                <StatBox
                  label="Time Remaining"
                  value={fmtHours(timer.hours_remaining)}
                  sub="Until SLA deadline"
                  color={
                    timer.status === 'critical' ? '#ea580c' :
                    timer.status === 'warning'  ? '#d97706' : '#10b981'
                  }
                />
              )
            )}

            {/* 4. Escalation deadline (allotted escalation window) */}
            <StatBox
              label="Escalation Window"
              value={fmtHours(timer.escalation_deadline)}
              sub="Hours before escalation"
            />
          </div>
        )}

        {/* ── Escalation warning banner ── */}
        {timer.escalation_count > 0 && (
          <div style={{
            marginTop: '1rem',
            padding: '0.65rem 1rem',
            backgroundColor: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.25)',
            borderRadius: '8px',
            fontSize: '0.83rem', fontWeight: '600', color: '#dc2626',
          }}>
            ⚠️ This complaint has been escalated&nbsp;
            <strong>{timer.escalation_count}</strong>&nbsp;time{timer.escalation_count > 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  // ─── Fallback: basic deadline card (when sla_timer is absent) ─────────────
  if (deadline) {
    const now      = new Date();
    const dl       = new Date(deadline);
    const hoursLeft = (dl - now) / (1000 * 60 * 60);
    const isCompleted = ['COMPLETED', 'RESOLVED'].includes(complaint?.status);
    const isOverdue   = !isCompleted && hoursLeft < 0;

    const borderColor = isCompleted ? '#10b981'
                      : hoursLeft < 0  ? '#dc2626'
                      : hoursLeft < 24 ? '#ea580c'
                      : hoursLeft < 48 ? '#eab308'
                      : '#10b981';

    const icon  = isCompleted ? '✅' : hoursLeft < 0 ? '🚨' : hoursLeft < 24 ? '⚠️' : hoursLeft < 48 ? '⏰' : '✅';
    const title = isCompleted ? 'Completed on Time'
                : hoursLeft < 0  ? 'SLA Deadline Overdue'
                : hoursLeft < 24 ? 'SLA Deadline Critical'
                : hoursLeft < 48 ? 'SLA Deadline Warning'
                : 'SLA Deadline Active';

    return (
      <div style={{
        marginBottom: '1.5rem', padding: '1.5rem', borderRadius: '14px',
        border: `2px solid ${borderColor}`,
        boxShadow: `0 0 20px rgba(79,70,229,0.12)`,
        backgroundColor: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '2rem' }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: borderColor, marginBottom: '0.15rem' }}>SLA Status</div>
            <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {/* Complaint Age */}
          <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>Complaint Age</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {complaint?.created_at
                ? (() => { const h = (new Date() - new Date(complaint.created_at)) / 3600000; return h >= 48 ? `${Math.floor(h/24)}d` : `${Math.round(h)}h`; })()
                : '—'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Time since submission</div>
          </div>

          {/* Overdue / Time remaining */}
          {!isCompleted && (
            <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: isOverdue ? 'rgba(220,38,38,0.1)' : 'var(--bg-primary)', borderRadius: '8px', border: `1px solid ${isOverdue ? 'rgba(220,38,38,0.3)' : 'var(--border-primary)'}` }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '700', color: isOverdue ? '#dc2626' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{isOverdue ? 'Overdue By' : 'Time Remaining'}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: isOverdue ? '#dc2626' : 'var(--text-primary)' }}>
                {Math.abs(Math.round(hoursLeft))}h
              </div>
              <div style={{ fontSize: '0.68rem', color: isOverdue ? '#dc2626' : 'var(--text-secondary)', marginTop: '0.25rem' }}>{isOverdue ? 'Past SLA deadline' : 'Until SLA deadline'}</div>
            </div>
          )}

          {/* Deadline timestamp */}
          <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>SLA Deadline</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              {dl.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No SLA data at all ───────────────────────────────────────────────────
  return (
    <div style={{
      marginBottom: '1.5rem', padding: '1.25rem 1.5rem', borderRadius: '14px',
      border: '2px dashed var(--border-primary)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      color: 'var(--text-secondary)',
    }}>
      <span style={{ fontSize: '1.5rem' }}>⏱️</span>
      <div>
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>SLA Timer</div>
        <div style={{ fontSize: '0.82rem' }}>No SLA deadline has been assigned to this complaint yet.</div>
      </div>
    </div>
  );
}
