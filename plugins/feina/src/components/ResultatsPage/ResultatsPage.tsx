import { useEffect, useState, useRef, useCallback } from 'react';
import { COLORS, CATEGORY_COLORS, S } from '../../theme';

const BENCH_BASE   = '/api/proxy/benchmark-orchestrator';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:   { color: COLORS.warning, label: 'Pendent' },
  running:   { color: COLORS.accent,  label: 'En execucio' },
  completed: { color: COLORS.success, label: 'Completat' },
  error:     { color: COLORS.error,   label: 'Error' },
  cleanup:   { color: COLORS.textDisabled, label: 'Neteja' },
};

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '10px 28px',
  cursor: 'pointer',
  border: 'none',
  borderBottom: active ? `2px solid ${COLORS.accent}` : '2px solid transparent',
  background: 'none',
  fontWeight: active ? 700 : 400,
  fontSize: 14,
  color: active ? COLORS.accent : COLORS.textSecondary,
  transition: 'all 0.15s',
});

const DotIcon = ({ color }: { color: string }) => (
  <span style={{
    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
    background: color, marginRight: 8, boxShadow: `0 0 6px ${color}66`,
  }} />
);

/* ── Live Tab ─────────────────────────────────────────────────────────────── */

const LiveTab = () => {
  const [wsStatus, setWsStatus]     = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [runId, setRunId]           = useState('');
  const [inputRunId, setInputRunId] = useState('');
  const [metrics, setMetrics]       = useState<any[]>([]);
  const wsRef                       = useRef<WebSocket | null>(null);

  const connect = useCallback((rid: string) => {
    if (wsRef.current) wsRef.current.close();
    setWsStatus('connecting');
    setMetrics([]);
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/proxy/metrics-api`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => { setWsStatus('connected'); ws.send(JSON.stringify({ action: 'subscribe', runId: rid })); };
      ws.onmessage = (event) => { try { const msg = JSON.parse(event.data); if (msg.event === 'metric' && msg.data) setMetrics(prev => [...prev.slice(-99), msg.data]); } catch (_) {} };
      ws.onerror = () => setWsStatus('error');
      ws.onclose = () => setWsStatus('disconnected');
    } catch (_) { setWsStatus('error'); }
  }, []);

  const disconnect = () => { if (wsRef.current) { wsRef.current.close(); wsRef.current = null; } setWsStatus('disconnected'); setRunId(''); };
  useEffect(() => { return () => { if (wsRef.current) wsRef.current.close(); }; }, []);

  const handleSubscribe = () => { if (!inputRunId.trim()) return; setRunId(inputRunId.trim()); connect(inputRunId.trim()); };

  const wsStatusConfig = {
    disconnected: { color: COLORS.textDisabled, label: 'Desconnectat' },
    connecting:   { color: COLORS.warning, label: 'Connectant...' },
    connected:    { color: COLORS.success, label: 'Connectat' },
    error:        { color: COLORS.error, label: 'Error de connexio' },
  };
  const st = wsStatusConfig[wsStatus];

  const lastMetrics = metrics.slice(-10);
  const avgLatency = lastMetrics.length > 0 ? (lastMetrics.reduce((sum, m) => sum + (m.latency || 0), 0) / lastMetrics.length).toFixed(2) : '-';
  const avgThroughput = lastMetrics.length > 0 ? (lastMetrics.reduce((sum, m) => sum + (m.throughput || 0), 0) / lastMetrics.length).toFixed(2) : '-';
  const avgErrorRate = lastMetrics.length > 0 ? (lastMetrics.reduce((sum, m) => sum + (m.errorRate || 0), 0) / lastMetrics.length).toFixed(2) : '-';

  return (
    <div>
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={st.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>Connexió en temps real</div>
              <div style={{ fontSize: 12, color: st.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                <DotIcon color={st.color} />{st.label}
                {runId && wsStatus === 'connected' && <span style={{ color: COLORS.textDisabled, marginLeft: 8 }}>Run: <span style={{ fontFamily: 'monospace' }}>{runId.slice(0, 12)}...</span></span>}
              </div>
            </div>
          </div>
          {wsStatus === 'connected' && <button style={{ ...S.btn, fontSize: 12 }} onClick={disconnect}>Desconnectar</button>}
        </div>
        {wsStatus !== 'connected' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ ...S.input, flex: 1 }} placeholder="Introdueix el Run ID per subscriure't a les mètriques live..." value={inputRunId} onChange={e => setInputRunId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubscribe()} />
            <button style={{ ...S.btnPrimary, opacity: !inputRunId.trim() ? 0.5 : 1, cursor: !inputRunId.trim() ? 'not-allowed' : 'pointer' }} onClick={handleSubscribe} disabled={!inputRunId.trim()}>Connectar</button>
          </div>
        )}
        {wsStatus === 'error' && (
          <div style={{ marginTop: 12, background: COLORS.error + '15', border: `1px solid ${COLORS.error}40`, borderRadius: 6, padding: '10px 14px', color: COLORS.error, fontSize: 13 }}>
            No s&apos;ha pogut establir la connexió WebSocket. Assegura&apos;t que la Metrics API està en funcionament.
          </div>
        )}
      </div>

      {wsStatus === 'connected' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Mètriques rebudes', value: String(metrics.length), color: COLORS.accent },
            { label: 'Latència avg (ms)', value: avgLatency, color: COLORS.warning },
            { label: 'Throughput avg (msg/s)', value: avgThroughput, color: COLORS.success },
            { label: 'Error rate avg (%)', value: avgErrorRate, color: COLORS.error },
          ].map(stat => (
            <div key={stat.label} style={{ ...S.card, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.color, fontFamily: 'monospace' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {wsStatus === 'connected' && metrics.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 20px', borderBottom: `1px solid ${COLORS.border}`, fontSize: 12, color: COLORS.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Últimes mètriques (temps real)
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={S.tableHeader}>
                  <th style={S.th}>Timestamp</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Latència (ms)</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Throughput (msg/s)</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Error rate (%)</th>
                  <th style={S.th}>Protocol</th>
                  <th style={S.th}>Broker</th>
                </tr>
              </thead>
              <tbody>
                {[...metrics].reverse().map((m, i) => (
                  <tr key={i} style={S.tableRow}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ca-ES') : '-'}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{m.latency?.toFixed(2) ?? '-'}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{m.throughput?.toFixed(2) ?? '-'}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{m.errorRate?.toFixed(2) ?? '-'}</td>
                    <td style={S.td}>{m.protocol ? <span style={S.badge(CATEGORY_COLORS.protocol)}>{m.protocol}</span> : '-'}</td>
                    <td style={{ ...S.td, color: COLORS.textSecondary }}>{m.broker || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {wsStatus !== 'connected' && (
        <div style={{ ...S.card, textAlign: 'center', padding: 60 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDisabled} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <div style={{ fontSize: 16, color: COLORS.textSecondary, marginBottom: 8 }}>Monitoratge en temps real</div>
          <div style={{ fontSize: 13, color: COLORS.textDisabled, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
            Introdueix un Run ID per connectar-te a les mètriques en temps real via WebSocket.
            Quan hi hagi un benchmark en execució, aquí es mostraran latència, throughput i errors per segon.
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Historial Tab ────────────────────────────────────────────────────────── */

const HistorialTab = () => {
  const [runs, setRuns]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = useCallback(() => {
    setLoading(true);
    fetch(BENCH_BASE + '/runs')
      .then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const formatTime = (iso: string) => { if (!iso) return '-'; return new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };

  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const realRuns = runs.filter(r => !r.test);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={fetchRuns} style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Actualitzar
        </button>
      </div>
      {loading && <p style={{ color: COLORS.textSecondary, padding: 40, textAlign: 'center' }}>Carregant...</p>}
      {!loading && realRuns.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 48 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={COLORS.textDisabled} strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" />
          </svg>
          <div style={{ color: COLORS.textSecondary, fontSize: 14 }}>No hi ha execucions registrades encara.</div>
          <div style={{ color: COLORS.textDisabled, fontSize: 13, marginTop: 4 }}>Executa un benchmark des de la pàgina d&apos;Escenaris per veure els resultats aquí.</div>
        </div>
      )}
      {!loading && realRuns.length > 0 && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={S.tableHeader}>
                <th style={S.th}>ID</th>
                <th style={S.th}>Escenari</th>
                <th style={S.th}>Arquitectura</th>
                <th style={S.th}>Protocol</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Estat</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Durada</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Creat</th>
              </tr>
            </thead>
            <tbody>
              {realRuns.map((r, i) => {
                const st = STATUS_CONFIG[r.status] || { color: COLORS.textDisabled, label: r.status || '-' };
                return (
                  <tr key={i} style={S.tableRow}>
                    <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{r.id?.slice(0, 8)}...</td>
                    <td style={S.td}>{r.scenarioName || r.scenarioId?.slice(0, 8) || '-'}</td>
                    <td style={S.td}>{r.architecture ? <span style={S.badge(CATEGORY_COLORS.architecture)}>{r.architecture}</span> : '-'}</td>
                    <td style={S.td}>{r.protocol ? <span style={S.badge(CATEGORY_COLORS.protocol)}>{r.protocol}</span> : '-'}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}><span style={S.badge(st.color)}>{st.label}</span></td>
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: COLORS.textSecondary }}>{formatDuration(r.createdAt, r.completedAt || r.updatedAt)}</td>
                    <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: COLORS.textDisabled, fontFamily: 'monospace' }}>{formatTime(r.createdAt)}</td>
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

/* ── Main Page ────────────────────────────────────────────────────────────── */

export const ResultatsPage = () => {
  const [tab, setTab] = useState<'live' | 'historial'>('historial');

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: COLORS.textPrimary }}>Resultats</h1>
        <p style={{ margin: '6px 0 0', color: COLORS.textSecondary, fontSize: 15 }}>
          Visualitza els resultats de les execucions de benchmark en temps real o consulta l&apos;historial complet.
        </p>
      </div>
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24, display: 'flex' }}>
        <button style={TAB_STYLE(tab === 'live')} onClick={() => setTab('live')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            Live
          </span>
        </button>
        <button style={TAB_STYLE(tab === 'historial')} onClick={() => setTab('historial')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            Historial
          </span>
        </button>
      </div>
      {tab === 'live' && <LiveTab />}
      {tab === 'historial' && <HistorialTab />}
    </div>
  );
};
