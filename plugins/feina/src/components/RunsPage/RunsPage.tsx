
import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const API_BASE = '/api/proxy/benchmark-orchestrator';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: 'Pendent'     },
  running:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'En execució' },
  completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Completat'   },
  cancelled: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',label: 'Aturat'      },
  error:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'Error'       },
  cleanup:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',label: 'Netejant'    },
};

const PROTOCOL_COLORS: Record<string, string> = {
  'Kafka':  '#ef4444', 'AMQP': '#f97316', 'MQTT': '#eab308',
  'gRPC':   '#8b5cf6', 'WS':   '#3b82f6', 'SSE':  '#06b6d4',
  'NATS':   '#22c55e', 'CoAP': '#10b981',
};

const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA': '#2563eb', 'QBA': '#9333ea', 'LCA': '#16a34a',
  'EMA': '#dc2626', 'SEA': '#d97706',
};

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const EmptyIcon  = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

const formatTime = (iso: string) =>
  !iso ? '-' : new Date(iso).toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

export const RunsPage = () => {
  const [runs,    setRuns]    = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);

  const fetchRuns = () => {
    setLoading(true);
    fetch(`${API_BASE}/runs`)
      .then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data.filter((r: any) => !r.test) : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { document.title = 'Historial Runs | APIs Asíncrones'; fetchRuns(); }, []);

  const total     = runs.length;
  const running   = runs.filter(r => r.status === 'running' || r.status === 'pending').length;
  const completed = runs.filter(r => r.status === 'completed').length;
  const errors    = runs.filter(r => r.status === 'error').length;

  return (
    <div style={{ ...S.page }}>
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Historial de Runs
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Registre complet de totes les execucions al clúster AKS
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
            { label: 'Total',       value: total,     color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: 'En execució', value: running,   color: '#3b82f6',               bg: 'rgba(59,130,246,0.10)' },
            { label: 'Completats',  value: completed, color: 'var(--success)',        bg: 'rgba(34,197,94,0.08)'  },
            { label: 'Errors',      value: errors,    color: 'var(--error)',          bg: 'rgba(239,68,68,0.08)'  },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
            {loading ? '-' : `${runs.length} registre${runs.length !== 1 ? 's' : ''}`}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Clica una fila per copiar l'ID</span>
        </div>

        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {[18, 32, 20, 18, 22, 30].map((w, j) => (
                    <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${i * 0.07}s` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : runs.length === 0 ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <EmptyIcon />
            <p style={{ color: 'var(--text-disabled)', margin: 0, fontSize: 14 }}>No hi ha execucions registrades.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={S.tableHeader}>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Nom escenari</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Arquitectura</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Protocol</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Estat</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Iniciat</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => {
                  const st       = STATUS_CONFIG[r.status] || { color: '#94a3b8', bg: 'transparent', label: r.status };
                  const isActive = r.status === 'running' || r.status === 'pending';
                  const archColor = ARCHITECTURE_COLORS[r.architecture] || 'var(--text-secondary)';
                  const protColor = PROTOCOL_COLORS[r.protocol]         || 'var(--text-secondary)';
                  return (
                    <tr
                      key={r.id || i}
                      style={{ ...S.tableRow, background: hovered === i ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => { if (r.id) { navigator.clipboard?.writeText(r.id).catch(() => {}); } }}
                      title={r.id ? `Copia ID: ${r.id}` : undefined}
                    >
                      <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-disabled)' }}>
                        {r.id ? r.id.slice(0, 8) + '…' : '-'}
                      </td>
                      <td style={{ ...S.td, fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, animation: 'pulseDot 1.5s ease infinite' }} />}
                          {r.scenarioName || r.scenarioId || '-'}
                        </div>
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {r.architecture
                          ? <span style={{ ...S.badge(archColor), fontSize: 10 }}>{r.architecture}</span>
                          : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {r.protocol
                          ? <span style={{ ...S.badge(protColor), fontSize: 10 }}>{r.protocol}</span>
                          : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'pulseDot 1.5s ease infinite' }} />}
                          {st.label}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {formatTime(r.startedAt || r.createdAt || '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunsPage;
