import { useEffect, useState, useCallback, useRef } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const METRICS_BASE   = '/api/proxy/metrics-api';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
const ORCHESTRATOR   = '/api/proxy/benchmark-orchestrator';

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

const IconBarChartEmpty = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
  </svg>
);
const IconSignalEmpty = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 12a10 10 0 0 1 20 0"/><path d="M6 12a6 6 0 0 1 12 0"/>
    <path d="M10 12a2 2 0 0 1 4 0"/><circle cx="12" cy="12" r="1"/>
  </svg>
);
const IconHash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
  </svg>
);
const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconTrophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 22 12 17 16 22"/><line x1="12" y1="17" x2="12" y2="11"/>
    <path d="M6.5 4H17.5L17 9a5 5 0 0 1-10 0z"/>
    <path d="M6.5 4c-.5 2.5-1.5 4-3.5 4"/><path d="M17.5 4c.5 2.5 1.5 4 3.5 4"/>
  </svg>
);
const IconPulse = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconClock2 = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconTrophySmall = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="8 22 12 17 16 22"/><line x1="12" y1="17" x2="12" y2="11"/>
    <path d="M6.5 4H17.5L17 9a5 5 0 0 1-10 0z"/>
  </svg>
);
const IconFilter = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

// ── BarChart with hover tooltip ────────────────────────────────────────────────
const BarChart = ({ data, title, unit = '', color = '#3b82f6', height = 140 }: {
  data: { label: string; value: number }[];
  title: string; unit?: string; color?: string; height?: number;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  if (!data.length) return <div style={{ textAlign: 'center', color: 'var(--text-disabled)', padding: 24, fontSize: 13 }}>Sense dades</div>;

  const W = 480, max = Math.max(...data.map(d => d.value), 0.01);
  const barW = Math.max(20, (W - 16 - data.length * 6) / data.length);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{title}</div>
      {hovered !== null && data[hovered] && (
        <div style={{ position: 'absolute', left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', boxShadow: 'var(--shadow-md)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color }}>{data[hovered].value.toFixed(2)}{unit}</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500, marginLeft: 6 }}>{data[hovered].label}</span>
        </div>
      )}
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${height + 48}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`bg-${title.replace(/\s/g,'-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.55"/>
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={8} y1={height - f * height} x2={W - 8} y2={height - f * height} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3"/>
        ))}
        {[0.5, 1].map(f => (
          <text key={f} x={6} y={height - f * height - 3} fontSize="9" fill="var(--text-disabled)" textAnchor="start">
            {(max * f).toFixed(max > 100 ? 0 : 1)}{unit}
          </text>
        ))}
        {data.map((d, i) => {
          const bh = (d.value / max) * height, x = 8 + i * (barW + 6), y = height - bh;
          const isHov = hovered === i;
          return (
            <g key={i} style={{ cursor: 'crosshair' }}
              onMouseEnter={e => {
                setHovered(i);
                const svg = svgRef.current;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                setTooltipPos({ x: (x + barW / 2) * (rect.width / W), y: y * (rect.width / W) - 8 });
              }}
              onMouseLeave={() => setHovered(null)}
            >
              {isHov && <rect x={x - 2} y={0} width={barW + 4} height={height} fill={color} opacity={0.06} rx={4}/>}
              <rect x={x} y={y} width={barW} height={bh} fill={`url(#bg-${title.replace(/\s/g,'-')})`} rx={3} opacity={isHov ? 1 : 0.82} style={{ transition: 'opacity 0.15s' }}/>
              <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="9" fill={isHov ? 'var(--text-secondary)' : 'var(--text-disabled)'}>
                {d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label}
              </text>
            </g>
          );
        })}
        <line x1={8} y1={height} x2={W - 8} y2={height} stroke="var(--border)" strokeWidth="1.5"/>
      </svg>
    </div>
  );
};

// ── LiveLineChart with gradient + cursor tooltip ───────────────────────────────
const LiveLineChart = ({ data, color = '#3b82f6', label }: { data: number[]; color?: string; label: string }) => {
  const [cursorX, setCursorX] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length < 2) return <div style={{ textAlign: 'center', color: 'var(--text-disabled)', fontSize: 12, padding: '12px 0' }}>Esperant dades...</div>;

  const W = 480, H = 90, max = Math.max(...data, 0.01);
  const px2 = (i: number) => (i / (data.length - 1)) * (W - 20) + 10;
  const py2 = (v: number) => H - 8 - (v / max) * (H - 16);
  const pts = data.map((v, i) => `${px2(i)},${py2(v)}`).join(' ');
  const last = `${px2(data.length - 1)},${H}`;
  const fillPts = [`${px2(0)},${H}`, ...data.map((v, i) => `${px2(i)},${py2(v)}`), last].join(' ');
  const gradId = 'lg-' + label.replace(/\s/g, '-');

  let hovIdx: number | null = null;
  if (cursorX !== null && svgRef.current) {
    const rect = svgRef.current.getBoundingClientRect();
    hovIdx = Math.round(((cursorX - rect.left) * (W / rect.width) - 10) / (W - 20) * (data.length - 1));
    hovIdx = Math.max(0, Math.min(data.length - 1, hovIdx));
  }
  const hovVal = hovIdx !== null ? data[hovIdx] : data[data.length - 1];
  const hovX   = hovIdx !== null ? px2(hovIdx)  : px2(data.length - 1);
  const hovY   = hovIdx !== null ? py2(hovVal)  : py2(data[data.length - 1]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{hovVal.toFixed(2)}</span>
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block', cursor: 'crosshair' }}
        onMouseMove={e => setCursorX(e.clientX)} onMouseLeave={() => setCursorX(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill={'url(#' + gradId + ')'}/>
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"/>
        {cursorX !== null && hovIdx !== null && (
          <>
            <line x1={hovX} y1={0} x2={hovX} y2={H} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity={0.5}/>
            <circle cx={hovX} cy={hovY} r={4} fill={color} stroke="var(--bg-card)" strokeWidth="2"/>
            <rect x={hovX + 8} y={hovY - 18} width={72} height={20} rx={5} fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1"/>
            <text x={hovX + 44} y={hovY - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={color} fontFamily="monospace">{hovVal.toFixed(2)}</text>
          </>
        )}
      </svg>
    </div>
  );
};

// ── FilterChip ────────────────────────────────────────────────────────────────
const FilterChip = ({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) => (
  <button onClick={onClick} style={{ ...S.chip(active, color), fontSize: 12 }}>{label}</button>
);

// ── HistorialTab ───────────────────────────────────────────────────────────────
const HistorialTab = () => {
  const [summary,        setSummary]        = useState<any[]>([]);
  const [scenarios,      setScenarios]      = useState<any[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string[]>([]);
  const [filterProtocol, setFilterProtocol] = useState<string[]>([]);
  const [filterArch,     setFilterArch]     = useState<string[]>([]);
  const [filtersOpen,    setFiltersOpen]    = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sumRes = await fetch(`${METRICS_BASE}/metrics/summary`).then(r => r.json());
      const scRes  = await fetch(`${SCENARIOS_BASE}/scenarios`).then(r => r.json());
      setSummary(Array.isArray(sumRes) ? sumRes : []);
      setScenarios(Array.isArray(scRes) ? scRes : []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const nameMap        = Object.fromEntries(scenarios.map((s: any) => [s.id, s.name || s.id?.slice(0, 8)]));
  const availPlatforms = [...new Set(summary.map((s: any) => s.platform  || s.broker || '').filter(Boolean))];
  const availProtocols = [...new Set(summary.map((s: any) => s.protocol  || '').filter(Boolean))];
  const availArchs     = [...new Set(summary.map((s: any) => s.architecture || '').filter(Boolean))];

  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const filteredSummary = summary.filter(s => {
    if (filterPlatform.length && !filterPlatform.includes(s.platform || s.broker || '')) return false;
    if (filterProtocol.length && !filterProtocol.includes(s.protocol || ''))             return false;
    if (filterArch.length     && !filterArch.includes(s.architecture || ''))             return false;
    return true;
  });

  const activeFilters = filterPlatform.length + filterProtocol.length + filterArch.length;
  const clearFilters  = () => { setFilterPlatform([]); setFilterProtocol([]); setFilterArch([]); };

  if (loading) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ ...S.card }}>
            <div style={{ ...SK_STYLE, height: 18, width: 18, borderRadius: '50%', marginBottom: 12 }}/>
            <div style={{ ...SK_STYLE, height: 22, width: '55%', marginBottom: 8, animationDelay: `${i*0.1}s` }}/>
            <div style={{ ...SK_STYLE, height: 10, width: '75%', animationDelay: `${i*0.15}s` }}/>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[0,1].map(i => (
          <div key={i} style={{ ...S.card }}>
            <div style={{ ...SK_STYLE, height: 10, width: '45%', marginBottom: 14 }}/>
            <div style={{ ...SK_STYLE, height: 130, width: '100%' }}/>
          </div>
        ))}
      </div>
    </div>
  );

  if (!summary.length) return (
    <div style={{ ...S.card, textAlign: 'center', padding: 64 }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><IconBarChartEmpty /></div>
      <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>Encara no hi ha resultats</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Executa escenaris per veure les comparatives aquí.</div>
    </div>
  );

  const sorted   = [...filteredSummary].sort((a, b) => (a.avgLatency ?? 999) - (b.avgLatency ?? 999));
  const best     = sorted[0];
  const bestName = nameMap[best?.scenarioId] || best?.scenarioId?.slice(0, 8) || '—';
  const statCards = [
    { label: 'Escenaris comparats', value: String(filteredSummary.length), color: '#3b82f6', Icon: IconHash },
    { label: 'Millor latència',     value: best ? `${best.avgLatency?.toFixed(1)}ms` : '—', color: '#22c55e', Icon: IconZap },
    { label: 'Millor escenari',     value: bestName, color: '#f59e0b', Icon: IconTrophy },
  ];

  const lat  = filteredSummary.map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 8) || '?', value: s.avgLatency   ?? 0 }));
  const tput = filteredSummary.map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 8) || '?', value: s.avgThroughput ?? 0 }));
  const err  = filteredSummary.map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 8) || '?', value: s.avgErrorRate  ?? 0 }));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '14', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><c.Icon /></div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>{c.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {(availPlatforms.length > 0 || availProtocols.length > 0 || availArchs.length > 0) && (
        <div style={{ ...S.card, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setFiltersOpen(o => !o)} style={{ ...S.btn, fontSize: 13, padding: '6px 14px', border: 'none', background: 'none', paddingLeft: 0 }}>
              <IconFilter /> Filtres
              {activeFilters > 0 && <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{activeFilters}</span>}
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {filteredSummary.length !== summary.length && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Mostrant <strong>{filteredSummary.length}</strong> de {summary.length}</span>}
              {activeFilters > 0 && <button onClick={clearFilters} style={{ ...S.btn, fontSize: 12, padding: '5px 12px', color: 'var(--error)', borderColor: 'var(--error)' }}>Esborra tots</button>}
            </div>
          </div>
          {filtersOpen && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {availPlatforms.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Plataforma</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{availPlatforms.map(p => <FilterChip key={p} label={p} active={filterPlatform.includes(p)} color="#d97706" onClick={() => toggle(filterPlatform, setFilterPlatform, p)}/>)}</div>
                </div>
              )}
              {availProtocols.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Protocol</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{availProtocols.map(p => <FilterChip key={p} label={p} active={filterProtocol.includes(p)} color="#16a34a" onClick={() => toggle(filterProtocol, setFilterProtocol, p)}/>)}</div>
                </div>
              )}
              {availArchs.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Arquitectura</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{availArchs.map(a => <FilterChip key={a} label={a} active={filterArch.includes(a)} color="#2563eb" onClick={() => toggle(filterArch, setFilterArch, a)}/>)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {filteredSummary.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Cap resultat coincideix amb els filtres actuals.</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ ...S.card }}><BarChart data={lat}  title="Latència mitjana (ms)"   unit="ms" color="#f59e0b"/></div>
            <div style={{ ...S.card }}><BarChart data={tput} title="Throughput mitjà (msg/s)" unit=""   color="#22c55e"/></div>
          </div>
          <div style={{ ...S.card, marginBottom: 16 }}><BarChart data={err} title="Taxa d'error mitjana (%)" unit="%" color="#ef4444" height={100}/></div>
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Taula comparativa</span>
              <button onClick={fetchData} style={{ ...S.btn, fontSize: 12, padding: '5px 12px' }}>Actualitzar</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={S.tableHeader}>
                    {['Escenari','Arquitectura','Protocol','Plataforma','Latència avg','Throughput avg','Error rate','Mostres'].map(h => (
                      <th key={h} style={{ ...S.th }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => (
                    <tr key={i} style={{ ...S.tableRow, background: i === 0 ? 'rgba(34,197,94,0.05)' : 'transparent' }}>
                      <td style={{ ...S.td, fontWeight: 600 }}>
                        {i === 0 && <span style={{ marginRight: 6, verticalAlign: 'middle', color: '#f59e0b' }}><IconTrophySmall /></span>}
                        {nameMap[s.scenarioId] || s.scenarioId?.slice(0, 12)}
                      </td>
                      <td style={S.td}>{s.architecture ? <span style={{ ...S.badge('#2563eb'), fontSize: 11 }}>{s.architecture}</span> : <span style={{ color: 'var(--text-disabled)' }}>—</span>}</td>
                      <td style={S.td}>{s.protocol ? <span style={{ ...S.badge('#16a34a'), fontSize: 11 }}>{s.protocol}</span> : <span style={{ color: 'var(--text-disabled)' }}>—</span>}</td>
                      <td style={{ ...S.td, color: 'var(--text-secondary)' }}>{s.platform || s.broker || '—'}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b' }}>{s.avgLatency?.toFixed(2) ?? '—'}ms</td>
                      <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#22c55e' }}>{s.avgThroughput?.toFixed(1) ?? '—'}</td>
                      <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ef4444' }}>{s.avgErrorRate?.toFixed(3) ?? '—'}%</td>
                      <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)' }}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── LiveTab ────────────────────────────────────────────────────────────────────
const LiveTab = () => {
  const [activeRuns,    setActiveRuns]    = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [metrics,       setMetrics]       = useState<any[]>([]);
  const [polling,       setPolling]       = useState(false);

  const fetchActive = useCallback(async () => {
    try {
      const data = await fetch(`${ORCHESTRATOR}/runs`).then(r => r.json());
      if (Array.isArray(data)) setActiveRuns(data.filter((r: any) => r.status === 'running'));
    } catch (_) {}
  }, []);

  useEffect(() => { fetchActive(); const i = setInterval(fetchActive, 5000); return () => clearInterval(i); }, [fetchActive]);
  useEffect(() => {
    if (!selectedRunId && activeRuns.length > 0) setSelectedRunId(activeRuns[0].id);
    if (selectedRunId && !activeRuns.find(r => r.id === selectedRunId) && activeRuns.length > 0) setSelectedRunId(activeRuns[0].id);
  }, [activeRuns, selectedRunId]);
  useEffect(() => {
    if (!selectedRunId) { setMetrics([]); setPolling(false); return; }
    setMetrics([]); setPolling(true);
    const poll = async () => {
      try { const data = await fetch(`${METRICS_BASE}/metrics?runId=${selectedRunId}`).then(r => r.json()); if (Array.isArray(data)) setMetrics(data.slice(-120)); } catch (_) {}
    };
    poll();
    const i = setInterval(poll, 4000);
    return () => { clearInterval(i); setPolling(false); };
  }, [selectedRunId]);

  const lat  = metrics.map(m => m.latency    ?? 0);
  const tput = metrics.map(m => m.throughput ?? 0);
  const err  = metrics.map(m => m.errorRate  ?? 0);
  const avg  = (a: number[]) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) : '—';
  const sel  = activeRuns.find(r => r.id === selectedRunId);

  return (
    <div>
      <div style={{ ...S.card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Escenari en execució</div>
          {activeRuns.length === 0
            ? <div style={{ color: 'var(--text-disabled)', fontSize: 14 }}>Cap escenari actiu.</div>
            : <select value={selectedRunId} onChange={e => setSelectedRunId(e.target.value)} style={{ ...S.input, maxWidth: 320 }}>
                {activeRuns.map(r => <option key={r.id} value={r.id}>{r.scenarioName || r.id.slice(0, 12)}</option>)}
              </select>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: polling && activeRuns.length > 0 ? '#22c55e' : 'var(--text-disabled)', display: 'inline-block', boxShadow: polling && activeRuns.length > 0 ? '0 0 6px #22c55e' : 'none', animation: polling && activeRuns.length > 0 ? 'pulseDot 2s ease infinite' : 'none' }}/>
          <span style={{ fontSize: 13, color: polling && activeRuns.length > 0 ? '#22c55e' : 'var(--text-disabled)', fontWeight: 600 }}>{polling && activeRuns.length > 0 ? 'En directe' : 'Inactiu'}</span>
        </div>
        {sel && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {sel.protocol     && <span style={{ ...S.badge('#16a34a'), fontSize: 11 }}>{sel.protocol}</span>}
            {sel.architecture && <span style={{ ...S.badge('#2563eb'), fontSize: 11 }}>{sel.architecture}</span>}
            {sel.platform     && <span style={{ ...S.badge('#7c3aed'), fontSize: 11 }}>{sel.platform}</span>}
          </div>
        )}
      </div>

      {activeRuns.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 64 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><IconSignalEmpty /></div>
          <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>Cap execució activa</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 360, margin: '8px auto 0' }}>
            Inicia un escenari des de la pàgina <strong>Escenaris</strong> i aquí apareixeran les mètriques en temps real.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { l: 'Mostres rebudes',   v: String(metrics.length), c: '#3b82f6' },
              { l: 'Latència avg (ms)', v: avg(lat),               c: '#f59e0b' },
              { l: 'Throughput avg',    v: avg(tput),              c: '#22c55e' },
              { l: 'Error rate avg (%)',v: avg(err),               c: '#ef4444' },
            ].map(c => (
              <div key={c.l} style={{ ...S.card, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: c.c, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>{c.v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { data: lat,  color: '#f59e0b', label: 'Latència (ms)' },
              { data: tput, color: '#22c55e', label: 'Throughput (msg/s)' },
              { data: err,  color: '#ef4444', label: 'Error rate (%)' },
            ].map(c => (
              <div key={c.label} style={{ ...S.card }}><LiveLineChart data={c.data} color={c.color} label={c.label}/></div>
            ))}
          </div>
          {metrics.length > 0 && (
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-disabled)' }}><IconPulse /></span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimes mètriques</span>
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={S.tableHeader}>
                      {['Hora','Latència','Throughput','Error (%)'].map(h => <th key={h} style={{ ...S.th }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...metrics].reverse().slice(0, 50).map((m, i) => (
                      <tr key={i} style={S.tableRow}>
                        <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ca-ES') : '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>{m.latency?.toFixed(2) ?? '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#22c55e', fontWeight: 700 }}>{m.throughput?.toFixed(2) ?? '—'}</td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{m.errorRate?.toFixed(3) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── ResultatsPage ──────────────────────────────────────────────────────────────
export const ResultatsPage = () => {
  const [tab, setTab] = useState<'live' | 'historial'>('live');
  useEffect(() => { document.title = 'Resultats | APIs Asíncrones'; }, []);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '10px 20px', cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'none', fontWeight: active ? 700 : 500, fontSize: 14,
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    transition: 'color var(--transition), border-color var(--transition)',
    fontFamily: 'var(--font)',
  });

  return (
    <div style={{ ...S.page }}>
      <style>{GLOBAL_CSS}</style>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Resultats</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>Mètriques en temps real i comparatives d'escenaris</p>
      </div>
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 24, display: 'flex' }}>
        <button style={tabStyle(tab === 'live')} onClick={() => setTab('live')}><IconPulse /> En directe</button>
        <button style={tabStyle(tab === 'historial')} onClick={() => setTab('historial')}><IconClock2 /> Historial i comparatives</button>
      </div>
      {tab === 'live'      && <LiveTab />}
      {tab === 'historial' && <HistorialTab />}
    </div>
  );
};
