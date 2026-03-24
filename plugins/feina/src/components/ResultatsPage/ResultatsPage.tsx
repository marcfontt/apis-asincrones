import { useEffect, useState, useRef, useCallback } from 'react';

const METRICS_BASE   = '/api/proxy/metrics-api';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
const ORCHESTRATOR   = '/api/proxy/benchmark-orchestrator';

// ── Icones SVG ────────────────────────────────────────────────────────────────
const IconActivity  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconHistory   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconSignal    = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="20" x2="2" y2="20"/><line x1="7" y1="15" x2="7" y2="20"/><line x1="12" y1="10" x2="12" y2="20"/><line x1="17" y1="5" x2="17" y2="20"/><line x1="22" y1="2" x2="22" y2="20"/></svg>;
const IconBarChart2 = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const IconZap       = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconTrophy    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 22V18"/><path d="M14 22V18"/><rect x="6" y="2" width="12" height="13" rx="2"/></svg>;
const IconHash      = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IconRefresh   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;

// ── Gràfic de barres ──────────────────────────────────────────────────────────
const BarChart = ({ data, title, unit = '', color = 'var(--accent)', height = 140 }: {
  data: { label: string; value: number }[];
  title: string; unit?: string; color?: string; height?: number;
}) => {
  if (!data.length) return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24, fontSize: 13 }}>Sense dades</div>;
  const W = 480, max = Math.max(...data.map(d => d.value), 0.01);
  const barW = Math.max(20, (W - 16 - data.length * 6) / data.length);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{title}</div>
      <svg width="100%" viewBox={`0 0 ${W} ${height + 44}`} style={{ overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map(f => <line key={f} x1={8} y1={height - f * height} x2={W - 8} y2={height - f * height} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 2"/>)}
        {data.map((d, i) => {
          const bh = (d.value / max) * height, x = 8 + i * (barW + 6), y = height - bh;
          return <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill={color} rx={3} opacity={0.85}/>
            <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="10" fill="var(--text-secondary)" fontWeight="600">{d.value > 0 ? `${d.value.toFixed(1)}${unit}` : ''}</text>
            <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="9" fill="var(--text-disabled)">{d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label}</text>
          </g>;
        })}
        <line x1={8} y1={height} x2={W - 8} y2={height} stroke="var(--border)" strokeWidth="1.5"/>
      </svg>
    </div>
  );
};

// ── Gràfic de línia live ──────────────────────────────────────────────────────
const LiveLineChart = ({ data, color = 'var(--accent)', label }: { data: number[]; color?: string; label: string }) => {
  if (data.length < 2) return <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: '8px 0' }}>Esperant dades...</div>;
  const W = 480, H = 80, max = Math.max(...data, 0.01);
  const pts = data.map((v, i) => `${data.length < 2 ? W / 2 : (i / (data.length - 1)) * (W - 20) + 10},${H - (v / max) * (H - 10) - 4}`).join(' ');
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color }}>{data[data.length - 1].toFixed(2)}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    </div>
  );
};

// ── Tab Historial ─────────────────────────────────────────────────────────────
const HistorialTab = () => {
  const [summary,   setSummary]   = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sumRes, scRes] = await Promise.all([
        fetch(`${METRICS_BASE}/metrics/summary`).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)),
        fetch(`${SCENARIOS_BASE}/scenarios`).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)),
      ]);
      setSummary(Array.isArray(sumRes) ? sumRes : []);
      setScenarios(Array.isArray(scRes) ? scRes : []);
    } catch (e: any) {
      setError(typeof e === 'string' ? e : (e.message || 'Error desconegut'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const nameMap = Object.fromEntries(scenarios.map((s: any) => [s.id, s.name || s.id?.slice(0, 8)]));
  const lat  = summary.map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 8) || '?', value: s.avgLatency    ?? 0 }));
  const tput = summary.map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 8) || '?', value: s.avgThroughput ?? 0 }));
  const err  = summary.map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 8) || '?', value: s.avgErrorRate  ?? 0 }));

  const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };

  if (loading) return <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 48 }}>Carregant...</p>;

  if (error) return (
    <div style={{ ...card, textAlign: 'center', padding: 48 }}>
      <div style={{ color: 'var(--error)', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Error carregant les mètriques</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{error}</div>
      <button onClick={fetchData} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 12 }}>Torna a intentar</button>
    </div>
  );

  if (!summary.length) return (
    <div style={{ ...card, textAlign: 'center', padding: 64 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}><IconBarChart2 /></div>
      <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>Encara no hi ha resultats</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Executa escenaris per veure les comparatives aquí.</div>
    </div>
  );

  const best     = [...summary].sort((a, b) => (a.avgLatency ?? 999) - (b.avgLatency ?? 999))[0];
  const bestName = nameMap[best?.scenarioId] || best?.scenarioId?.slice(0, 8) || '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Escenaris comparats', value: String(summary.length),                      color: 'var(--accent)',   icon: <IconHash /> },
          { label: 'Millor latència',     value: `${best?.avgLatency?.toFixed(1) ?? '—'}ms`, color: 'var(--success)', icon: <IconZap /> },
          { label: 'Millor escenari',     value: bestName,                                    color: 'var(--warning)', icon: <IconTrophy /> },
        ].map(c => (
          <div key={c.label} style={{ ...card, padding: '20px 24px' }}>
            <div style={{ color: c.color, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color, fontFamily: 'monospace' }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={card}><BarChart data={lat}  title="Latència mitjana (ms)"    unit="ms" color="var(--warning)" /></div>
        <div style={card}><BarChart data={tput} title="Throughput mitjà (msg/s)" unit=""   color="var(--success)" /></div>
      </div>
      <div style={{ ...card, marginBottom: 20 }}>
        <BarChart data={err} title="Taxa d'error mitjana (%)" unit="%" color="var(--error)" height={100}/>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Taula comparativa</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Escenari', 'Arquitectura', 'Protocol', 'Broker', 'Latència avg', 'Throughput avg', 'Error rate', 'Mostres'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Escenari' ? 'left' : 'right', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--border)', background: 'var(--bg-main)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i === 0 ? 'rgba(63,185,80,0.06)' : 'transparent' }}>
                <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                  {i === 0 && <span style={{ marginRight: 6, color: 'var(--warning)' }}>★</span>}
                  {nameMap[s.scenarioId] || s.scenarioId?.slice(0, 12)}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  {s.architecture ? <span style={{ background: 'rgba(88,166,255,0.15)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{s.architecture}</span> : '—'}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  {s.protocol ? <span style={{ background: 'rgba(63,185,80,0.15)', color: 'var(--success)', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{s.protocol}</span> : '—'}
                </td>
                <td style={{ padding: '11px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13 }}>{s.broker || '—'}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--warning)' }}>{s.avgLatency?.toFixed(2) ?? '—'}ms</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{s.avgThroughput?.toFixed(1) ?? '—'}</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--error)' }}>{s.avgErrorRate?.toFixed(3) ?? '—'}%</td>
                <td style={{ padding: '11px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <IconRefresh /> Actualitzar
        </button>
      </div>
    </div>
  );
};

// ── Tab Live ──────────────────────────────────────────────────────────────────
const LiveTab = () => {
  const [activeRuns,    setActiveRuns]    = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [wsStatus,      setWsStatus]      = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [metrics,       setMetrics]       = useState<any[]>([]);
  const wsRef      = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActive = useCallback(() => {
    fetch(`${ORCHESTRATOR}/runs/active`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setActiveRuns(d); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchActive(); const i = setInterval(fetchActive, 5000); return () => clearInterval(i); }, [fetchActive]);
  useEffect(() => { if (!selectedRunId && activeRuns.length > 0) setSelectedRunId(activeRuns[0].id); }, [activeRuns, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId) return;
    wsRef.current?.close();
    if (pollingRef.current) clearInterval(pollingRef.current);
    setWsStatus('connecting');
    setMetrics([]);

    let wsWorked = false;

    function startPolling() {
      setWsStatus('connected');
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${METRICS_BASE}/metrics?runId=${selectedRunId}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) setMetrics(data.slice(-120));
          }
        } catch (_) {}
      }, 3000);
    }

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/api/proxy/metrics-api`);
      wsRef.current = ws;
      const timeout = setTimeout(() => { if (!wsWorked) { ws.close(); startPolling(); } }, 4000);
      ws.onopen    = () => { clearTimeout(timeout); wsWorked = true; setWsStatus('connected'); ws.send(JSON.stringify({ action: 'subscribe', runId: selectedRunId })); };
      ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.event === 'metric' && m.data) setMetrics(p => [...p.slice(-120), m.data]); } catch (_) {} };
      ws.onerror   = () => { if (!wsWorked) startPolling(); else setWsStatus('error'); };
      ws.onclose   = () => { if (wsWorked) setWsStatus('disconnected'); };
    } catch (_) { startPolling(); }

    return () => { wsRef.current?.close(); if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [selectedRunId]);

  const lat  = metrics.map(m => m.latency    ?? 0);
  const tput = metrics.map(m => m.throughput ?? 0);
  const err  = metrics.map(m => m.errorRate  ?? 0);
  const avg  = (a: number[]) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) : '—';

  const wsC = { disconnected: 'var(--text-secondary)', connecting: 'var(--warning)', connected: 'var(--success)', error: 'var(--error)' };
  const wsL = { disconnected: 'Desconnectat', connecting: 'Connectant...', connected: 'Connectat', error: 'Error' };
  const sel = activeRuns.find(r => r.id === selectedRunId);
  const card: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };

  return (
    <div>
      <div style={{ ...card, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Escenari en execució</div>
          {activeRuns.length === 0
            ? <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Cap escenari actiu ara mateix.</div>
            : <select value={selectedRunId} onChange={e => setSelectedRunId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, width: '100%', maxWidth: 360, background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
                {activeRuns.map(r => <option key={r.id} value={r.id}>{r.scenarioName || r.id.slice(0, 12)} — {r.protocol || '?'} / {r.architecture || '?'}</option>)}
              </select>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: wsC[wsStatus], display: 'inline-block', boxShadow: wsStatus === 'connected' ? `0 0 6px ${wsC.connected}` : 'none' }}/>
          <span style={{ fontSize: 13, color: wsC[wsStatus], fontWeight: 600 }}>{wsL[wsStatus]}</span>
        </div>
        {sel && <div style={{ display: 'flex', gap: 8 }}>
          {sel.protocol     && <span style={{ background: 'rgba(63,185,80,0.15)',   color: 'var(--success)', padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>{sel.protocol}</span>}
          {sel.architecture && <span style={{ background: 'rgba(88,166,255,0.15)',  color: 'var(--accent)',  padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>{sel.architecture}</span>}
          {sel.platform     && <span style={{ background: 'rgba(188,140,255,0.15)', color: 'var(--special)', padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>{sel.platform}</span>}
        </div>}
      </div>

      {activeRuns.length === 0 ? (
        <div style={{ ...card, padding: 64, textAlign: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}><IconSignal /></div>
          <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>Cap execució activa</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 360, margin: '8px auto 0' }}>
            Inicia un escenari des de la pàgina <strong>Escenaris</strong> i aquí apareixeran les mètriques en temps real.
          </div>
        </div>
      ) : <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          {[
            { l: 'Mostres rebudes',    v: String(metrics.length), c: 'var(--accent)' },
            { l: 'Latència avg (ms)',  v: avg(lat),               c: 'var(--warning)' },
            { l: 'Throughput avg',     v: avg(tput),              c: 'var(--success)' },
            { l: 'Error rate avg (%)', v: avg(err),               c: 'var(--error)' },
          ].map(c => (
            <div key={c.l} style={{ ...card, padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.c, fontFamily: 'monospace' }}>{c.v}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { data: lat,  color: 'var(--warning)', label: 'Latència (ms)' },
            { data: tput, color: 'var(--success)', label: 'Throughput (msg/s)' },
            { data: err,  color: 'var(--error)',   label: 'Error rate (%)' },
          ].map(c => (
            <div key={c.label} style={{ ...card, padding: 16 }}>
              <LiveLineChart data={c.data} color={c.color} label={c.label}/>
            </div>
          ))}
        </div>
        {metrics.length > 0 && (
          <div style={{ ...card, overflow: 'hidden', marginTop: 20 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Últimes mètriques</div>
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)' }}>
                    {['Hora', 'Latència', 'Throughput', 'Errors (%)'].map(h => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Hora' ? 'left' : 'right', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...metrics].reverse().slice(0, 50).map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ca-ES') : '—'}</td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>{m.latency?.toFixed(2) ?? '—'}</td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>{m.throughput?.toFixed(2) ?? '—'}</td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--error)', fontWeight: 600 }}>{m.errorRate?.toFixed(3) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}
    </div>
  );
};

// ── Pàgina principal ──────────────────────────────────────────────────────────
export const ResultatsPage = () => {
  const [tab, setTab] = useState<'live' | 'historial'>('live');

  useEffect(() => { document.title = 'Resultats | APIs Asíncrones'; }, []);

  const ts = (a: boolean): React.CSSProperties => ({
    padding: '10px 24px', cursor: 'pointer', border: 'none',
    borderBottom: a ? `2px solid var(--accent)` : '2px solid transparent',
    background: 'none', fontWeight: a ? 700 : 400, fontSize: 14,
    color: a ? 'var(--accent)' : 'var(--text-secondary)',
    display: 'flex', alignItems: 'center', gap: 8,
  });

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif', background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>Resultats</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>Gràfiques de rendiment en temps real i comparatives d'escenaris</p>
      </div>
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 24, display: 'flex' }}>
        <button style={ts(tab === 'live')}      onClick={() => setTab('live')}><IconActivity /> Live</button>
        <button style={ts(tab === 'historial')} onClick={() => setTab('historial')}><IconHistory /> Historial &amp; Comparatives</button>
      </div>
      {tab === 'live'      && <LiveTab />}
      {tab === 'historial' && <HistorialTab />}
    </div>
  );
};
