import { useEffect, useState, useCallback } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const ORCHESTRATOR   = '/api/proxy/benchmark-orchestrator';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
const METRICS_BASE   = '/api/proxy/metrics-api';

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

const normalizePlatform = (p?: string): string => {
  if (!p) return '';
  const map: Record<string, string> = {
    'kafka':       'Kafka',
    'confluent':   'Confluent',
    'rabbitmq':    'RabbitMQ',
    'nats server': 'NATS Server',
    'nats':        'NATS Server',
    'pulsar':      'Pulsar',
  };
  return map[p.toLowerCase()] ?? p;
};

const DATA_FORMAT_LABELS: Record<string, string> = {
  'default':   'Per defecte',
  'video-4k':  'Vídeo 4K',
  'video-8k':  'Vídeo 8K',
  'financial': 'Financer',
  'iot':       'IoT',
};

const DATA_FORMAT_COLORS: Record<string, string> = {
  'default':   '#64748b',
  'video-4k':  '#8b5cf6',
  'video-8k':  '#7c3aed',
  'financial': '#0ea5e9',
  'iot':       '#10b981',
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
  if (!start) return '-';
  const ms = new Date(end || new Date().toISOString()).getTime() - new Date(start).getTime();
  if (ms < 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const formatTime = (iso: string) =>
  !iso ? '-' : new Date(iso).toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });


const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ── RunDetailPanel ─────────────────────────────────────────────────────────────
const RunDetailPanel = ({ run, scenarioMap, onClose }: {
  run: any; scenarioMap: Record<string, any>; onClose: () => void;
}) => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loadingM, setLoadingM] = useState(true);

  useEffect(() => {
    setLoadingM(true);
    const doFetch = async () => {
      try {
        let data = await fetch(`${METRICS_BASE}/metrics?runId=${run.id}`).then(r => r.json()).catch(() => null);
        if (!data || !Array.isArray(data) || !data.length) {
          if (run.scenarioId)
            data = await fetch(`${METRICS_BASE}/metrics?scenarioId=${run.scenarioId}`).then(r => r.json()).catch(() => null);
        }
        setMetrics(Array.isArray(data) ? data.slice(-100) : []);
      } catch (_) { setMetrics([]); }
      setLoadingM(false);
    };
    doFetch();
  }, [run.id, run.scenarioId]);

  const st        = STATUS_CONFIG[run.status] || { color: '#94a3b8', bg: 'transparent', label: run.status };
  const platform  = normalizePlatform(run.platform || run.broker);
  const platColor = PLATFORM_COLORS[platform] || 'var(--text-secondary)';
  const sc        = scenarioMap[run.scenarioId];
  const df        = run.dataFormat || sc?.dataFormat || 'default';

  const lats  = metrics.map((m: any) => m.latency    ?? m.avgLatency    ?? 0).filter((v: number) => v > 0);
  const tputs = metrics.map((m: any) => m.throughput ?? m.avgThroughput ?? 0).filter((v: number) => v > 0);
  const errs  = metrics.map((m: any) => m.errorRate  ?? m.avgErrorRate  ?? 0);
  const avg   = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const pct   = (arr: number[], p: number) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
  };
  const avgLat  = avg(lats);
  const avgTput = avg(tputs);
  const avgErr  = avg(errs);
  const p50     = pct(lats, 50);
  const p99     = pct(lats, 99);

  const SRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  const Spark = ({ data, color }: { data: number[]; color: string }) => {
    if (data.length < 2) return null;
    const W = 220, H = 36;
    const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || mx || 1;
    const px = (i: number) => (i / (data.length - 1)) * (W - 4) + 2;
    const py = (v: number) => H - 4 - ((v - mn) / rng) * (H - 8);
    const pts = data.map((v, i) => `${px(i)},${py(v)}`).join(' ');
    const fill = [`${px(0)},${H}`, ...data.map((v, i) => `${px(i)},${py(v)}`), `${px(data.length - 1)},${H}`].join(' ');
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', marginTop: 4 }}>
        <polygon points={fill} style={{ fill: color, opacity: 0.12 }} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div style={{ ...S.card, width: 268, flexShrink: 0, alignSelf: 'flex-start', animation: 'slideIn 0.2s ease', position: 'sticky', top: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, wordBreak: 'break-word' }}>
            {run.scenarioName || run.id?.slice(0, 12) || '-'}
          </div>
          <span style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {run.status === 'running' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color, animation: 'pulseDot 1.5s ease infinite' }} />}
            {st.label}
          </span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6, flexShrink: 0 }}>
          <CloseIcon />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {run.architecture && <span style={{ ...S.badge('#2563eb'), fontSize: 10 }}>{run.architecture}</span>}
        {run.protocol     && <span style={{ ...S.badge('#16a34a'), fontSize: 10 }}>{run.protocol}</span>}
        {platform         && <span style={{ ...S.badge(platColor), fontSize: 10 }}>{platform}</span>}
        {df !== 'default' && <span style={{ ...S.badge(DATA_FORMAT_COLORS[df] || '#64748b'), fontSize: 10 }}>{DATA_FORMAT_LABELS[df] || df}</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
        {formatDuration(run.startedAt || run.createdAt, run.completedAt || run.updatedAt)}
        {' · '}{formatTime(run.createdAt)}
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Mètriques · {metrics.length} mostres
      </div>
      {loadingM ? (
        <div style={{ ...SK_STYLE, height: 10, width: '70%', marginBottom: 6 }} />
      ) : metrics.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-disabled)', padding: '6px 0' }}>Sense dades de mètriques.</div>
      ) : (
        <>
          <SRow label="Latència avg" value={avgLat  != null ? `${avgLat.toFixed(2)}ms`    : '-'} color="#f59e0b" />
          <SRow label="P50"          value={p50     != null ? `${p50.toFixed(2)}ms`        : '-'} color="#3b82f6" />
          <SRow label="P99"          value={p99     != null ? `${p99.toFixed(2)}ms`        : '-'} color="#7c3aed" />
          <SRow label="Throughput"   value={avgTput != null ? `${avgTput.toFixed(1)} m/s`  : '-'} color="#22c55e" />
          <SRow label="Taxa error"   value={avgErr  != null ? `${avgErr.toFixed(3)}%`      : '-'} color={avgErr && avgErr > 0.1 ? '#ef4444' : 'var(--text-secondary)'} />
          {lats.length >= 2 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Latència (historial)</div>
              <Spark data={lats.slice(-60)} color="#f59e0b" />
            </div>
          )}
        </>
      )}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
        <a href="/resultats" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          Veure a Resultats →
        </a>
      </div>
    </div>
  );
};

// ── RunTable ───────────────────────────────────────────────────────────────────
const RunTable = ({ data, title, showStop, icon, onCancel, onDelete, cancellingId, deletingId, scenarioMap, onSelect, selectedRunId }: {
  data: any[]; title: string; showStop: boolean; icon: React.ReactNode;
  onCancel: (run: any) => void; onDelete: (run: any) => void;
  cancellingId: string | null; deletingId: string | null;
  scenarioMap: Record<string, any>;
  onSelect: (run: any) => void; selectedRunId: string | null;
}) => {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
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
                <th style={{ ...S.th, textAlign: 'center' }}>Format</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Estat</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Durada</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Iniciat</th>
                <th style={{ ...S.th, textAlign: 'center', width: 90 }}>Accions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                const st        = STATUS_CONFIG[r.status] || { color: '#94a3b8', bg: 'transparent', label: r.status };
                const isActive  = r.status === 'running' || r.status === 'pending';
                const platform  = normalizePlatform(r.platform || r.broker);
                const platColor = PLATFORM_COLORS[platform] || 'var(--text-secondary)';
                const sc        = scenarioMap[r.scenarioId];
                const df        = r.dataFormat || sc?.dataFormat || 'default';
                const dfLabel   = DATA_FORMAT_LABELS[df] || df;
                const dfColor   = DATA_FORMAT_COLORS[df] || '#64748b';

                const isSelected = selectedRunId === r.id;
                return (
                  <tr key={r.id || i}
                    onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onSelect(r)}
                    style={{ ...S.tableRow, background: isSelected ? 'var(--bg-hover)' : hoveredRow === i ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer', borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent', transition: 'all 0.15s ease' }}
                  >
                    <td style={{ ...S.td, fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.scenarioName || <span style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.scenarioId?.slice(0, 10) || '-'}</span>}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.architecture
                        ? <span style={{ ...S.badge('#2563eb'), fontSize: 11 }}>{r.architecture}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.protocol
                        ? <span style={{ ...S.badge('#16a34a'), fontSize: 11 }}>{r.protocol}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {platform
                        ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{platform}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ ...S.badge(dfColor), fontSize: 11 }}>{dfLabel}</span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block', animation: 'pulseDot 1.5s ease infinite' }} />}
                        {st.label}
                      </span>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {isActive
                        ? formatDuration(r.startedAt || r.createdAt)
                        : formatDuration(r.startedAt || r.createdAt, r.completedAt || r.updatedAt)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(r.createdAt)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {showStop && isActive && (
                          <button onClick={() => onCancel(r)} disabled={cancellingId === r.id} title="Aturar execució"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, border: 'none', background: '#ef4444', color: 'white', cursor: cancellingId === r.id ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600, opacity: cancellingId === r.id ? 0.6 : 1, fontFamily: 'var(--font)' }}>
                            <StopIcon /> {cancellingId === r.id ? '...' : 'Stop'}
                          </button>
                        )}
                        {!isActive && (
                          <button onClick={() => onDelete(r)} disabled={deletingId === r.id} title="Eliminar registre"
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--error)', opacity: deletingId === r.id ? 0.5 : 1, transition: 'border-color var(--transition), background var(--transition)' }}>
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
  const [scenarios,    setScenarios]    = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [toast,        setToast]        = useState('');
  const [selectedRun,  setSelectedRun]  = useState<any | null>(null);

  useEffect(() => { document.title = 'Execucions | APIs Asíncrones'; }, []);

  useEffect(() => {
    fetch(`${SCENARIOS_BASE}/scenarios`)
      .then(r => r.json())
      .then(d => setScenarios(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const scenarioMap: Record<string, any> = Object.fromEntries(scenarios.map(s => [s.id, s]));

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
      {[55, 30, 28, 32, 28, 40, 35, 38, 22].map((w, j) => (
        <td key={j} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${delay}s` }} />
        </td>
      ))}
    </tr>
  );

  return (
    <div style={{ ...S.page, maxWidth: 1280 }}>
      <style>{GLOBAL_CSS}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease', fontFamily: 'var(--font)' }}>
          {toast}
        </div>
      )}

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

      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: runs.length,                                            color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: 'En execució', value: running.length,                                          color: '#3b82f6',              bg: 'rgba(59,130,246,0.08)' },
            { label: 'Completats',  value: completed.filter(r => r.status === 'completed').length,  color: 'var(--success)',        bg: 'rgba(34,197,94,0.08)' },
            { label: 'Errors',      value: runs.filter(r => r.status === 'error').length,           color: 'var(--error)',          bg: 'rgba(239,68,68,0.08)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

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
            scenarioMap={scenarioMap}
            onSelect={(r: any) => setSelectedRun((prev: any) => prev?.id === r.id ? null : r)}
            selectedRunId={selectedRun?.id ?? null}
          />
          <RunTable
            data={completed} title="Historial"              showStop={false} icon={<ListIcon />}
            onCancel={handleCancel} onDelete={handleDelete}
            cancellingId={cancellingId} deletingId={deletingId}
            scenarioMap={scenarioMap}
            onSelect={(r: any) => setSelectedRun((prev: any) => prev?.id === r.id ? null : r)}
            selectedRunId={selectedRun?.id ?? null}
          />
        </>
      )}
      {selectedRun && (
        <RunDetailPanel
          run={selectedRun}
          scenarioMap={scenarioMap}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
};
