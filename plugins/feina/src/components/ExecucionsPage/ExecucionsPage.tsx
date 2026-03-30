
import { useEffect, useState, useCallback } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: 'Pendent' },
  running:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'En execució' },
  completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Completat' },
  cancelled: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',label: 'Cancel·lat' },
  error:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'Error' },
};

const PLATFORM_COLORS: Record<string, string> = {
  'Kafka':       '#ef4444',
  'Confluent':   '#3b82f6',
  'RabbitMQ':    '#f59e0b',
  'NATS Server': '#22c55e',
  'Pulsar':      '#a78bfa',
};

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

const StopIcon     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
const TrashIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const RefreshIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const ActivityIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const ListIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const EmptyIcon    = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

const formatDuration = (start: string, end?: string) => {
  if (!start) return '—';
  const ms = new Date(end || new Date().toISOString()).getTime() - new Date(start).getTime();
  if (ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const formatTime = (iso: string) =>
  !iso ? '—' : new Date(iso).toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

// ── RunTable ───────────────────────────────────────────────────────────────────
const RunTable = ({ data, title, showStop, icon, onCancel, onDelete, cancellingId, deletingId }: {
  data: any[]; title: string; showStop: boolean; icon: React.ReactNode;
  onCancel: (run: any) => void; onDelete: (run: any) => void;
  cancellingId: string | null; deletingId: string | null;
}) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
      {/* Capçalera */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
          {title}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 10px', borderRadius: 10, fontWeight: 600 }}>
          {data.length} registre{data.length !== 1 ? 's' : ''}
        </span>
      </div>

      {data.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <EmptyIcon />
          <p style={{ color: 'var(--text-disabled)', margin: 0, fontSize: 14 }}>Cap execució en aquest grup.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={S.tableHeader}>
                <th style={S.th}>Nom Escenari</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Arquitectura</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Protocol</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Plataforma</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Estat</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Durada</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Iniciat</th>
                <th style={{ ...S.th, textAlign: 'center', width: 90 }}>Accions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                const st       = STATUS_CONFIG[r.status] || { color: '#94a3b8', bg: 'transparent', label: r.status };
                const isActive = r.status === 'running' || r.status === 'pending';
                const platColor = PLATFORM_COLORS[r.platform] || 'var(--text-secondary)';

                return (
                  <tr key={r.id || i}
                    onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                    style={{ ...S.tableRow, background: hoveredRow === i ? 'var(--bg-hover)' : 'transparent' }}
                  >
                    {/* Nom */}
                    <td style={{ ...S.td, fontWeight: 700, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.scenarioName || <span style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.scenarioId?.slice(0, 10) || '—'}…</span>}
                    </td>

                    {/* Arquitectura */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.architecture
                        ? <span style={{ ...S.badge('#2563eb'), fontSize: 11 }}>{r.architecture}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </td>

                    {/* Protocol */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.protocol
                        ? <span style={{ ...S.badge('#16a34a'), fontSize: 11 }}>{r.protocol}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </td>

                    {/* Plataforma amb color propi */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.platform
                        ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{r.platform}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                    </td>

                    {/* Estat */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block', animation: 'pulseDot 1.5s ease infinite' }} />}
                        {st.label}
                      </span>
                    </td>

                    {/* Durada */}
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {isActive
                        ? formatDuration(r.startedAt || r.createdAt)
                        : formatDuration(r.startedAt || r.createdAt, r.completedAt || r.updatedAt)}
                    </td>

                    {/* Iniciat */}
                    <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(r.createdAt)}
                    </td>

                    {/* Accions */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {showStop && isActive && (
                          <button
                            onClick={() => onCancel(r)}
                            disabled={cancellingId === r.id}
                            title="Aturar execució"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 9px', borderRadius: 6, border: 'none',
                              background: '#ef4444', color: 'white', cursor: cancellingId === r.id ? 'not-allowed' : 'pointer',
                              fontSize: 11, fontWeight: 600, opacity: cancellingId === r.id ? 0.6 : 1, fontFamily: 'var(--font)',
                            }}
                          >
                            <StopIcon /> {cancellingId === r.id ? '...' : 'Stop'}
                          </button>
                        )}
                        {!isActive && (
                          <button
                            onClick={() => onDelete(r)}
                            disabled={deletingId === r.id}
                            title="Eliminar registre"
                            style={{
                              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                              padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                              color: 'var(--error)', opacity: deletingId === r.id ? 0.5 : 1,
                              transition: 'border-color var(--transition), background var(--transition)',
                            }}
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── ExecucionsPage ─────────────────────────────────────────────────────────────
export const ExecucionsPage = () => {
  const [runs,         setRuns]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [toast,        setToast]        = useState('');

  useEffect(() => { document.title = 'Execucions | APIs Asíncrones'; }, []);

  const fetchRuns = useCallback(() => {
    setLoading(true);
    fetch(`${ORCHESTRATOR}/runs`)
      .then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRuns();
    const i = setInterval(fetchRuns, 8000);
    return () => clearInterval(i);
  }, [fetchRuns]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCancel = async (run: any) => {
    setCancellingId(run.id);
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs/${run.id}/cancel`, { method: 'POST' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setToast(`Execució "${run.scenarioName || run.id.slice(0, 8)}" cancel·lada.`);
      fetchRuns();
    } catch (e: any) { setToast('Error en cancel·lar: ' + e.message); }
    finally { setCancellingId(null); }
  };

  const handleDelete = async (run: any) => {
    setDeletingId(run.id);
    try {
      await fetch(`${ORCHESTRATOR}/runs/${run.id}`, { method: 'DELETE' });
      setRuns(prev => prev.filter(r => r.id !== run.id));
    } catch (e: any) { setToast('Error en eliminar: ' + e.message); }
    finally { setDeletingId(null); }
  };

  const running   = runs.filter(r => r.status === 'running' || r.status === 'pending');
  const completed = runs.filter(r => r.status !== 'running' && r.status !== 'pending');

  const SkRow = ({ delay = 0 }: { delay?: number }) => (
    <tr>
      {[55, 30, 28, 32, 40, 35, 38, 22].map((w, j) => (
        <td key={j} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${delay}s` }} />
        </td>
      ))}
    </tr>
  );

  return (
    <div style={{ ...S.page, maxWidth: 1280 }}>
      <style>{GLOBAL_CSS}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease', fontFamily: 'var(--font)' }}>
          {toast}
        </div>
      )}

      {/* Capçalera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Execucions</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Historial de benchmarks executats sobre el clúster AKS
          </p>
        </div>
        <button onClick={fetchRuns} style={{ ...S.btn, fontSize: 13 }}>
          <RefreshIcon /> Actualitzar
        </button>
      </div>

      {/* Stats bar */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: runs.length,                                                    color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: 'En execució', value: running.length,                                                 color: '#3b82f6',              bg: 'rgba(59,130,246,0.08)' },
            { label: 'Completats',  value: completed.filter(r => r.status === 'completed').length,         color: 'var(--success)',        bg: 'rgba(34,197,94,0.08)' },
            { label: 'Errors',      value: runs.filter(r => r.status === 'error').length,                  color: 'var(--error)',          bg: 'rgba(239,68,68,0.08)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contingut */}
      {loading ? (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ ...SK_STYLE, height: 12, width: 140 }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <SkRow key={i} delay={i * 0.08} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <RunTable
            data={running}   title="En execució / Pendents" showStop={true}  icon={<ActivityIcon />}
            onCancel={handleCancel} onDelete={handleDelete}
            cancellingId={cancellingId} deletingId={deletingId}
          />
          <RunTable
            data={completed} title="Historial"               showStop={false} icon={<ListIcon />}
            onCancel={handleCancel} onDelete={handleDelete}
            cancellingId={cancellingId} deletingId={deletingId}
          />
        </>
      )}
    </div>
  );
};

