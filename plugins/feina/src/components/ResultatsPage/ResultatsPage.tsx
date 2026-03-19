import { useEffect, useState, useRef, useCallback } from 'react';

const BENCH_BASE = '/api/proxy/benchmark-orchestrator';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:   { color: '#f59e0b', label: 'Pendent' },
  running:   { color: '#4a9eed', label: 'En execució' },
  completed: { color: '#22c55e', label: 'Completat' },
  error:     { color: '#ef4444', label: 'Error' },
};

const DotIcon = ({ color }: { color: string }) => (
  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 8, boxShadow: `0 0 6px ${color}66` }} />
);

/* Live Tab */
const LiveTab = () => {
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [runId, setRunId] = useState('');
  const [inputRunId, setInputRunId] = useState('');
  const [metrics, setMetrics] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback((rid: string) => {
    if (wsRef.current) wsRef.current.close();
    setWsStatus('connecting'); setMetrics([]);
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

  const wsStatusConfig = { disconnected: { color: '#999', label: 'Desconnectat' }, connecting: { color: '#f59e0b', label: 'Connectant...' }, connected: { color: '#22c55e', label: 'Connectat' }, error: { color: '#ef4444', label: 'Error de connexió' } };
  const st = wsStatusConfig[wsStatus];

  const last = metrics.slice(-10);
  const avg = (key: string) => last.length > 0 ? (last.reduce((s, m) => s + (m[key] || 0), 0) / last.length).toFixed(2) : '-';

  return (
    <div>
      <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={st.color} strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" /></svg>
            <div>
              <div style={{ fontWeight: 600 }}>Connexió en temps real</div>
              <div style={{ fontSize: 12, color: st.color, display: 'flex', alignItems: 'center' }}><DotIcon color={st.color} />{st.label}
                {runId && wsStatus === 'connected' && <span style={{ color: '#999', marginLeft: 8 }}>Run: <span style={{ fontFamily: 'monospace' }}>{runId.slice(0, 12)}...</span></span>}
              </div>
            </div>
          </div>
          {wsStatus === 'connected' && <button onClick={disconnect} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 12 }}>Desconnectar</button>}
        </div>
        {wsStatus !== 'connected' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }} placeholder="Introdueix el Run ID per subscriure't a les mètriques live..." value={inputRunId} onChange={e => setInputRunId(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubscribe()} />
            <button onClick={handleSubscribe} disabled={!inputRunId.trim()} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#4a9eed', color: 'white', fontWeight: 600, cursor: !inputRunId.trim() ? 'not-allowed' : 'pointer', opacity: !inputRunId.trim() ? 0.5 : 1 }}>Connectar</button>
          </div>
        )}
        {wsStatus === 'error' && <div style={{ marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>No s'ha pogut establir la connexió WebSocket. Assegura't que la Metrics API està en funcionament.</div>}
      </div>

      {wsStatus === 'connected' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {[{ label: 'Mètriques rebudes', value: String(metrics.length), color: '#4a9eed' }, { label: 'Latència avg (ms)', value: avg('latency'), color: '#f59e0b' }, { label: 'Throughput avg (msg/s)', value: avg('throughput'), color: '#22c55e' }, { label: 'Error rate avg (%)', value: avg('errorRate'), color: '#ef4444' }].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {wsStatus === 'connected' && metrics.length > 0 && (
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #eee', fontSize: 12, color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>Últimes mètriques (temps real)</div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 12, color: '#999' }}>Timestamp</th>
                <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: '#999' }}>Latència (ms)</th>
                <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: '#999' }}>Throughput</th>
                <th style={{ padding: '8px 14px', textAlign: 'right', fontSize: 12, color: '#999' }}>Errors (%)</th>
              </tr></thead>
              <tbody>
                {[...metrics].reverse().map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: 12 }}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ca-ES') : '-'}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{m.latency?.toFixed(2) ?? '-'}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{m.throughput?.toFixed(2) ?? '-'}</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{m.errorRate?.toFixed(2) ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {wsStatus !== 'connected' && (
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', textAlign: 'center', padding: 60 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" style={{ marginBottom: 16 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <div style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>Monitoratge en temps real</div>
          <div style={{ fontSize: 13, color: '#999', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>Introdueix un Run ID per connectar-te a les mètriques en temps real via WebSocket. Quan hi hagi un benchmark en execució, aquí es mostraran latència, throughput i errors per segon.</div>
        </div>
      )}
    </div>
  );
};

/* Historial Tab */
const HistorialTab = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchRuns = useCallback(() => { setLoading(true); fetch(BENCH_BASE + '/runs').then(r => r.json()).then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); }).catch(() => setLoading(false)); }, []);
  useEffect(() => { fetchRuns(); }, [fetchRuns]);
  const formatTime = (iso: string) => { if (!iso) return '-'; return new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };
  const formatDuration = (start: string, end: string) => { if (!start || !end) return '-'; const ms = new Date(end).getTime() - new Date(start).getTime(); if (ms < 1000) return `${ms}ms`; if (ms < 60000) return `${(ms/1000).toFixed(1)}s`; return `${Math.floor(ms/60000)}m ${Math.floor((ms%60000)/1000)}s`; };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={fetchRuns} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          Actualitzar
        </button>
      </div>
      {loading && <p style={{ color: '#999', padding: 40, textAlign: 'center' }}>Carregant...</p>}
      {!loading && runs.length === 0 && (
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', textAlign: 'center', padding: 48 }}>
          <div style={{ color: '#666', fontSize: 14 }}>No hi ha execucions registrades encara.</div>
          <div style={{ color: '#999', fontSize: 13, marginTop: 4 }}>Executa un benchmark des de la pàgina d'Escenaris per veure els resultats aquí.</div>
        </div>
      )}
      {!loading && runs.length > 0 && (
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8f9fa' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#999' }}>ID</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#999' }}>Escenari</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: '#999' }}>Estat</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: '#999' }}>Durada</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: '#999' }}>Creat</th>
            </tr></thead>
            <tbody>
              {runs.map((r, i) => {
                const st = STATUS_CONFIG[r.status] || { color: '#999', label: r.status || '-' };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{r.id?.slice(0, 8)}...</td>
                    <td style={{ padding: '10px 14px' }}>{r.scenarioName || r.scenarioId?.slice(0, 8) || '-'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}><span style={{ background: st.color + '20', color: st.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{st.label}</span></td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{formatDuration(r.createdAt, r.completedAt || r.updatedAt)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: '#999', fontFamily: 'monospace' }}>{formatTime(r.createdAt)}</td>
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

/* Pàgina Principal */
export const ResultatsPage = () => {
  const [tab, setTab] = useState<'live' | 'historial'>('historial');
  const tabStyle = (active: boolean): React.CSSProperties => ({ padding: '10px 24px', cursor: 'pointer', border: 'none', borderBottom: active ? '2px solid #4a9eed' : '2px solid transparent', background: 'none', fontWeight: active ? 700 : 400, fontSize: 14, color: active ? '#4a9eed' : '#666' });

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Resultats</h1>
        <p style={{ margin: '6px 0 0', color: '#666', fontSize: 15 }}>Visualitza els resultats de les execucions de benchmark en temps real o consulta l'historial complet.</p>
      </div>
      <div style={{ borderBottom: '1px solid #eee', marginBottom: 24, display: 'flex' }}>
        <button style={tabStyle(tab === 'live')} onClick={() => setTab('live')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            Live
          </span>
        </button>
        <button style={tabStyle(tab === 'historial')} onClick={() => setTab('historial')}>
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
