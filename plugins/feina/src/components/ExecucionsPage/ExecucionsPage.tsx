import { useEffect, useState, useCallback } from 'react';

const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:   { color: '#f59e0b', label: 'Pendent' },
  running:   { color: '#3b82f6', label: 'En execució' },
  completed: { color: '#22c55e', label: 'Completat' },
  cancelled: { color: '#94a3b8', label: 'Cancel·lat' },
  error:     { color: '#ef4444', label: 'Error' },
};

const StopIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

const formatDuration = (start: string, end: string) => {
  if (!start) return '—';
  const ms = new Date(end || new Date().toISOString()).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms/1000).toFixed(0)}s`;
  return `${Math.floor(ms/60000)}m ${Math.floor((ms%60000)/1000)}s`;
};

const formatTime = (iso: string) =>
  !iso ? '—' : new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export const ExecucionsPage = () => {
  const [runs,         setRuns]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [toast,        setToast]        = useState('');

  const fetchRuns = useCallback(() => {
    setLoading(true);
    fetch(`${ORCHESTRATOR}/runs`).then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 8000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t); }, [toast]);

  const handleCancel = async (run: any) => {
    setCancellingId(run.id);
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs/${run.id}/cancel`, { method: 'POST' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      setToast(`Execució "${run.scenarioName || run.id.slice(0,8)}" cancel·lada.`);
      fetchRuns();
    } catch (e: any) { setToast('Error: ' + e.message); }
    finally { setCancellingId(null); }
  };

  const handleDelete = async (run: any) => {
    setDeletingId(run.id);
    try {
      await fetch(`${ORCHESTRATOR}/runs/${run.id}`, { method: 'DELETE' });
      setRuns(prev => prev.filter(r => r.id !== run.id));
    } catch (e: any) { setToast('Error: ' + e.message); }
    finally { setDeletingId(null); }
  };

  const running   = runs.filter(r => r.status === 'running' || r.status === 'pending');
  const completed = runs.filter(r => r.status !== 'running' && r.status !== 'pending');

  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #f1f5f9' };
  const td: React.CSSProperties = { padding: '12px 14px', fontSize: 14, borderBottom: '1px solid #f8fafc' };

  const RunTable = ({ data, title, showStop }: { data: any[]; title: string; showStop: boolean }) => (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{title}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{data.length} registre{data.length !== 1 ? 's' : ''}</span>
      </div>
      {data.length === 0 ? (
        <p style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', margin: 0, fontSize: 14 }}>Cap execució en aquest grup.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Nom Escenari</th><th style={th}>Arquitectura</th><th style={th}>Protocol</th><th style={th}>Plataforma</th>
            <th style={{ ...th, textAlign: 'center' }}>Estat</th><th style={{ ...th, textAlign: 'right' }}>Durada</th>
            <th style={{ ...th, textAlign: 'right' }}>Iniciat</th><th style={{ ...th, textAlign: 'center', width: 100 }}>Accions</th>
          </tr></thead>
          <tbody>
            {data.map((r, i) => {
              const st = STATUS_CONFIG[r.status] || { color: '#94a3b8', label: r.status };
              const isActive = r.status === 'running' || r.status === 'pending';
              return (
                <tr key={r.id || i} style={{ background: isActive ? '#f0fdf4' : 'white' }}>
                  <td style={{ ...td, fontWeight: 600, color: '#1e293b' }}>{r.scenarioName || r.scenarioId?.slice(0,12) || '—'}</td>
                  <td style={td}>{r.architecture ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{r.architecture}</span> : '—'}</td>
                  <td style={td}>{r.protocol ? <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{r.protocol}</span> : '—'}</td>
                  <td style={{ ...td, color: '#475569' }}>{r.platform || '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <span style={{ background: st.color + '20', color: st.color, padding: '2px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, animation: 'pulse 1.5s infinite', display: 'inline-block' }} />}
                      {st.label}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>
                    {isActive ? formatDuration(r.startedAt || r.createdAt, new Date().toISOString()) : formatDuration(r.startedAt || r.createdAt, r.completedAt || r.updatedAt)}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{formatTime(r.createdAt)}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {showStop && isActive && (
                        <button onClick={() => handleCancel(r)} disabled={cancellingId === r.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: 'white', cursor: cancellingId === r.id ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: cancellingId === r.id ? 0.6 : 1 }}>
                          <StopIcon />{cancellingId === r.id ? '...' : 'Stop'}
                        </button>
                      )}
                      {!isActive && (
                        <button onClick={() => handleDelete(r)} disabled={deletingId === r.id}
                          style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: '#ef4444', opacity: deletingId === r.id ? 0.5 : 1 }}>
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
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 1300, margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: '#0f172a', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Execucions</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 15 }}>Historial de benchmarks executats sobre el clúster AKS</p>
        </div>
        <button onClick={fetchRuns} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>Actualitzar</button>
      </div>
      {loading && <p style={{ color: '#94a3b8', textAlign: 'center', padding: 48 }}>Carregant execucions...</p>}
      {!loading && <>
        <RunTable data={running}   title="🟢 En execució / Pendents" showStop={true}  />
        <RunTable data={completed} title="📋 Historial"               showStop={false} />
      </>}
    </div>
  );
};
