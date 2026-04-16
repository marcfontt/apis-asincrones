import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const METRICS_BASE = '/api/proxy/metrics-api';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';

// ── Helpers ────────────────────────────────────────────────────────────────────
const computePercentile = (arr: number[], p: number): number | null => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
};

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

const DATA_FORMAT_LABELS: Record<string, string> = {
  'default': 'Per defecte',
  'video-4k': 'Vídeo 4K',
  'video-8k': 'Vídeo 8K',
  'financial': 'Financer',
  'iot': 'IoT',
};

const DATA_FORMAT_COLORS: Record<string, string> = {
  'default': '#64748b',
  'video-4k': '#8b5cf6',
  'video-8k': '#7c3aed',
  'financial': '#0ea5e9',
  'iot': '#10b981',
};

const PLATFORM_COLORS: Record<string, string> = {
  'Kafka': '#ef4444',
  'Confluent': '#3b82f6',
  'RabbitMQ': '#f59e0b',
  'NATS Server': '#22c55e',
  'Pulsar': '#a78bfa',
};

const PROTOCOL_COLORS: Record<string, string> = {
  'Kafka': '#ef4444',
  'AMQP': '#f97316',
  'MQTT': '#eab308',
  'gRPC': '#8b5cf6',
  'WS': '#3b82f6',
  'SSE': '#06b6d4',
  'NATS': '#22c55e',
  'CoAP': '#10b981',
};

const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA': '#2563eb',
  'QBA': '#9333ea',
  'LCA': '#16a34a',
  'EMA': '#dc2626',
  'SEA': '#d97706',
};

const normalizePlatform = (p?: string): string => {
  if (!p) return '';
  const map: Record<string, string> = {
    'kafka': 'Kafka',
    'confluent': 'Confluent',
    'rabbitmq': 'RabbitMQ',
    'nats server': 'NATS Server',
    'nats': 'NATS Server',
    'pulsar': 'Pulsar',
  };
  return map[p.toLowerCase()] ?? p;
};

// ── Format-aware scoring ───────────────────────────────────────────────────────
// Weights per format: { lat, p50, p99, tput, err }
const FORMAT_WEIGHTS: Record<string, { lat: number; p50: number; p99: number; tput: number; err: number }> = {
  'default': { lat: 0.20, p50: 0.15, p99: 0.25, tput: 0.20, err: 0.20 },
  'financial': { lat: 0.15, p50: 0.10, p99: 0.20, tput: 0.15, err: 0.40 }, // error critical
  'video-4k': { lat: 0.10, p50: 0.10, p99: 0.15, tput: 0.40, err: 0.25 }, // throughput critical
  'video-8k': { lat: 0.10, p50: 0.10, p99: 0.15, tput: 0.40, err: 0.25 },
  'iot': { lat: 0.20, p50: 0.15, p99: 0.20, tput: 0.30, err: 0.15 }, // throughput important
};

// Error penalty multiplier (reduces score)
const getErrorPenalty = (dataFormat: string, errRate: number): number => {
  if (dataFormat === 'financial' && errRate > 0.1) return 0.55;
  if ((dataFormat === 'video-4k' || dataFormat === 'video-8k') && errRate > 2.0) return 0.75;
  if (dataFormat === 'iot' && errRate > 0.5) return 0.80;
  if (errRate > 1.0) return 0.70; // default
  return 1.0;
};

// Compute 0-100 normalized scores for a group of scenarios.
// Higher = better.
const computeScores = (
  items: any[],
  percentileMap: Record<string, { p50: number | null; p99: number | null }>,
  dataFormatOf: (s: any) => string,
): Map<string, number> => {
  const n = items.length;
  if (n === 0) return new Map();
  if (n === 1) {
    const s = items[0];
    const fmt = dataFormatOf(s);
    const err = s.avgErrorRate ?? 0;
    const penalty = getErrorPenalty(fmt, err);
    return new Map([[s.scenarioId, Math.round(100 * penalty)]]);
  }

  const getP50 = (s: any) => s.p50Latency ?? percentileMap[s.scenarioId]?.p50 ?? null;
  const getP99 = (s: any) => s.p99Latency ?? percentileMap[s.scenarioId]?.p99 ?? null;
  const getLat = (s: any) => s.avgLatency ?? null;
  const getTput = (s: any) => s.avgThroughput ?? null;
  const getErr = (s: any) => s.avgErrorRate ?? null;

  // Min/max for normalization
  const latVals = items.map(getLat).filter((v): v is number => v !== null);
  const tputVals = items.map(getTput).filter((v): v is number => v !== null);
  const errVals = items.map(getErr).filter((v): v is number => v !== null);
  const p50Vals = items.map(getP50).filter((v): v is number => v !== null);
  const p99Vals = items.map(getP99).filter((v): v is number => v !== null);

  const safeDivide = (val: number | null, min: number, max: number, higherIsBetter: boolean): number => {
    if (val === null || max === min) return 0.5;
    const norm = (val - min) / (max - min); // 0=min, 1=max
    return higherIsBetter ? norm : 1 - norm;
  };

  const minLat = Math.min(...latVals, 0), maxLat = Math.max(...latVals, 0.01);
  const minTp = Math.min(...tputVals, 0), maxTp = Math.max(...tputVals, 0.01);
  const minErr = Math.min(...errVals, 0), maxErr = Math.max(...errVals, 0.01);
  const minP50 = Math.min(...p50Vals, 0), maxP50 = Math.max(...p50Vals, 0.01);
  const minP99 = Math.min(...p99Vals, 0), maxP99 = Math.max(...p99Vals, 0.01);

  const map = new Map<string, number>();
  items.forEach(s => {
    const fmt = dataFormatOf(s);
    const w = FORMAT_WEIGHTS[fmt] ?? FORMAT_WEIGHTS['default'];

    const normLat = safeDivide(getLat(s), minLat, maxLat, false); // lower lat = better
    const normTput = safeDivide(getTput(s), minTp, maxTp, true);  // higher tput = better
    const normErr = safeDivide(getErr(s), minErr, maxErr, false); // lower err = better
    const normP50 = safeDivide(getP50(s), minP50, maxP50, false);
    const normP99 = safeDivide(getP99(s), minP99, maxP99, false);

    const composite = normLat * w.lat + normP50 * w.p50 + normP99 * w.p99 + normTput * w.tput + normErr * w.err;
    const penalty = getErrorPenalty(fmt, s.avgErrorRate ?? 0);
    const score = Math.round(composite * 100 * penalty);
    map.set(s.scenarioId, Math.max(0, Math.min(100, score)));
  });
  return map;
};

// Score color: green high, yellow mid, red low
const scoreColor = (score: number): string => {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconBarChart = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="12" width="4" height="9" /><rect x="10" y="7" width="4" height="14" /><rect x="17" y="3" width="4" height="18" /></svg>;
const IconSignal = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><path d="M2 12a10 10 0 0 1 20 0" /><path d="M6 12a6 6 0 0 1 12 0" /><path d="M10 12a2 2 0 0 1 4 0" /><circle cx="12" cy="12" r="1" /></svg>;
const IconPulse = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const IconClock = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconInfo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
const IconTrophy = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="8 22 12 17 16 22" /><line x1="12" y1="17" x2="12" y2="11" /><path d="M6.5 4H17.5L17 9a5 5 0 0 1-10 0z" /></svg>;
const IconChevron = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>;
const IconAward = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><polyline points="8.56 2.75 4 6 4 12 8.56 9.25" /><polyline points="15.44 2.75 20 6 20 12 15.44 9.25" /><polyline points="9 16.7 12 19 15 16.7" /></svg>;
const IconFilter = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
const IconRefresh = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;

// ── Metric Glossary ────────────────────────────────────────────────────────────
const METRIC_DEFINITIONS = [
  {
    key: 'latency',
    name: 'Latència (avg)',
    color: '#f59e0b',
    icon: '⟳',
    unit: 'ms',
    lowerBetter: true,
    short: 'Temps des que el productor envia un missatge fins que el consumidor el rep.',
    detail: `La latència mesura la velocitat de resposta del sistema. S'obté calculant la diferència temporal entre l'enviament d'un missatge pel productor i la seva recepció pel consumidor.
    En el benchmark, la "latència mitjana" és la mitjana aritmètica de totes les mostres de la prova. Una latència baixa és crítica per casos d'ús en temps real com IoT, trading o streaming de vídeo.`,
    formula: 'latència = t_recepció − t_enviament',
  },
  {
    key: 'p50',
    name: 'P50 (Mediana)',
    color: '#06b6d4',
    icon: '50',
    unit: 'ms',
    lowerBetter: true,
    short: 'El 50% dels missatges s\'han processat en menys d\'aquest temps (mediana real).',
    detail: `El percentil 50 (P50) és la mediana de la distribució de latències. Significa que el 50% dels missatges han tingut una latència inferior a aquest valor.
    A diferència de la mitjana, el P50 no es veu afectat per pics extrems (outliers). És útil per entendre el comportament "normal" del sistema sota càrrega.`,
    formula: 'P50 = valor en la posició 50% de les latències ordenades',
  },
  {
    key: 'p99',
    name: 'P99 (Cua de latència)',
    color: '#8b5cf6',
    icon: '99',
    unit: 'ms',
    lowerBetter: true,
    short: 'El 99% dels missatges s\'han processat en menys d\'aquest temps (pitjor cas real).',
    detail: `El percentil 99 (P99) representa el pitjor cas per al 99% dels missatges. Si el P99 és 200 ms, significa que 1 de cada 100 missatges tarda més de 200 ms.
    El P99 és la mètrica més important per sistemes de producció: els usuaris "cua" (el 1% pitjor) solen representar els casos d'ús més exigents.
    Un P99 molt superior al P50 indica que el sistema té pics de latència ocasionals greus (jitter), que poden ser inacceptables per aplicacions crítiques.`,
    formula: 'P99 = valor en la posició 99% de les latències ordenades',
  },
  {
    key: 'throughput',
    name: 'Throughput',
    color: '#22c55e',
    icon: '→',
    unit: 'msg/s',
    lowerBetter: false,
    short: 'Nombre de missatges processats per segon. Indica la capacitat del sistema.',
    detail: `El throughput (o taxa de processament) mesura quants missatges processa el sistema per unitat de temps. En el benchmark, es calcula com el nombre total de missatges rebuts dividit pel temps transcorregut des de l'inici de la prova.
    Un throughput alt és clau per aplicacions d'alta càrrega com analítica en temps real, pipelines de dades o plataformes d'events d'alta freqüència.
    El throughput i la latència solen estar en tensió: augmentar la taxa d'enviament sol incrementar la latència si el sistema arriba al seu límit.`,
    formula: 'throughput = missatges_rebuts / temps_transcorregut',
  },
  {
    key: 'errorRate',
    name: 'Taxa d\'error',
    color: '#ef4444',
    icon: '✕',
    unit: '%',
    lowerBetter: true,
    short: 'Percentatge de missatges que no s\'han pogut processar correctament.',
    detail: `La taxa d'error expressa quina fracció dels missatges enviats ha fallat o s'ha perdut. En sistemes de missatgeria asíncrona, els errors poden venir de diverses fonts: pèrdua de connexió, cua plena (backpressure), timeouts, o errors de seriació/deserialització.
    El benchmark aplica una penalització exponencial si la taxa d'error supera el 0.1%. Això reflecteix la realitat: un sistema ràpid però poc fiable és inutilitzable en producció.
    La taxa d'error és la mètrica amb major impacte negatiu en la puntuació global.`,
    formula: 'errorRate = (missatges_fallats / missatges_enviats) × 100',
  },
];

const MetricGlossary = () => {
  const [open, setOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  return (
    <div style={{ ...S.card, marginBottom: 20, borderLeft: '3px solid #3b82f6', padding: '16px 20px' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#3b82f6' }}><IconInfo /></span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Guia de mètriques i sistema de puntuació</span>
        </div>
        <IconChevron open={open} />
      </button>

      {open && (
        <div style={{ marginTop: 20, animation: 'fadeUp 0.3s ease' }}>

          {/* ── Metric definitions ── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Definició de mètriques
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
              {METRIC_DEFINITIONS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setActiveMetric(activeMetric === m.key ? null : m.key)}
                  style={{
                    background: activeMetric === m.key ? m.color + '12' : 'var(--bg-subtle)',
                    border: `1px solid ${activeMetric === m.key ? m.color + '50' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ background: m.color + '20', color: m.color, borderRadius: 6, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{m.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: m.lowerBetter ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{m.lowerBetter ? '↓ millor' : '↑ millor'}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.short}</p>
                </button>
              ))}
            </div>

            {/* Expanded metric explanation */}
            {activeMetric && (() => {
              const m = METRIC_DEFINITIONS.find(x => x.key === activeMetric)!;
              return (
                <div style={{ background: m.color + '08', border: `1px solid ${m.color}30`, borderRadius: 10, padding: '16px 20px', animation: 'fadeUp 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ background: m.color + '20', color: m.color, borderRadius: 7, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{m.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ ...S.badge(m.color), fontSize: 10 }}>{m.unit}</span>
                    <span style={{ fontSize: 11, color: m.lowerBetter ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{m.lowerBetter ? '↓ valor baix = millor' : '↑ valor alt = millor'}</span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{m.detail}</p>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: m.color, background: m.color + '10', padding: '6px 12px', borderRadius: 6, display: 'inline-block', border: `1px solid ${m.color}25` }}>
                    {m.formula}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Scoring system explanation ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Sistema de puntuació (0–100)
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              La <strong style={{ color: 'var(--text-primary)' }}>Puntuació</strong> és un valor de 0 a 100 que resumeix el rendiment de l'escenari <em>en relació al format de dades que s'està provant</em>. Cada format prioritza mètriques diferent perquè les seves necessitats reals ho justifiquen:
            </p>
            <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>Score</span> = (<span style={{ color: '#f59e0b' }}>latència_norm</span> × w_lat + <span style={{ color: '#22c55e' }}>throughput_norm</span> × w_tput + <span style={{ color: '#ef4444' }}>error_norm</span> × w_err + <span style={{ color: '#06b6d4' }}>P50_norm</span> × w_p50 + <span style={{ color: '#8b5cf6' }}>P99_norm</span> × w_p99) × <span style={{ color: '#ef4444' }}>penalització_error</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              On cada mètrica es <strong>normalitza</strong> entre 0 i 1 respecte a tots els escenaris comparats (el millor obté 1.0, el pitjor 0.0). Això fa que la puntuació sigui sempre <em>relativa</em>: si tots els escenaris van molt malament, el millor d'ells seguirà tenint 100 punts.
            </p>

            {/* Per-format weight bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              {Object.entries(FORMAT_WEIGHTS).map(([fmt, weights]) => {
                const label = DATA_FORMAT_LABELS[fmt] || fmt;
                const color = DATA_FORMAT_COLORS[fmt] || '#6b7280';
                const allWeights = [
                  { name: 'Latència',   w: weights.lat,  c: '#f59e0b' },
                  { name: 'Throughput', w: weights.tput, c: '#22c55e' },
                  { name: 'Errors',     w: weights.err,  c: '#ef4444' },
                  { name: 'P50',        w: weights.p50 ?? 0, c: '#06b6d4' },
                  { name: 'P99',        w: weights.p99 ?? 0, c: '#8b5cf6' },
                ];
                return (
                  <div key={fmt} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={{ ...S.badge(color), fontSize: 10 }}>{label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 600 }}>Pesos</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {allWeights.filter(x => x.w > 0).map(item => (
                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, width: 72, color: 'var(--text-secondary)', flexShrink: 0 }}>{item.name}</span>
                          <div style={{ flex: 1, height: 5, background: 'var(--bg-border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${item.w * 100}%`, height: '100%', background: item.c, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, width: 32, textAlign: 'right', color: item.c }}>{Math.round(item.w * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Per format:</strong>{' '}
              <strong>Per defecte</strong> usa pesos equilibrats (referència base, cap optimització específica).{' '}
              <strong>Vídeo 4K/8K</strong> maximitza throughput (40%) i penalitza errors ≥ 2% — els talls de reproducció s'aprecien immediatament.{' '}
              <strong>Financer</strong> penalitza errors durament (40%) — una transacció errònia és un problema real.{' '}
              <strong>IoT</strong> equilibra throughput alt i tolerància moderada a errors, ja que s'assumeix redundància de sensors.
            </p>
          </div>

          {/* ── Error penalty box ── */}
          <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>⚠ Penalització exponencial per errors</div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Si la taxa d'error supera el <strong>0.1%</strong>, s'aplica una penalització exponencial a la puntuació final: <code style={{ background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>penalització = 1 − min(1, errorRate × 10)</code>.
              Això garanteix que un sistema ràpid però inestable no obtingui una bona puntuació. Un 10% d'error fa que la puntuació sigui 0 independentment de les altres mètriques.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Horizontal Bar Chart (sortable, each by its own metric) ───────────────────
const HBarChart = ({
  data, title, unit = '', color = '#3b82f6', lowerIsBetter = true,
}: {
  data: { label: string; value: number }[];
  title: string; unit?: string; color?: string; lowerIsBetter?: boolean;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  // Ensure numeric processing and validation
  const validData = data.filter(d => typeof d.value === 'number' && !isNaN(d.value));
  if (!validData.length) return (
    <div style={{ textAlign: 'center', color: 'var(--text-disabled)', padding: '20px 0', fontSize: 13 }}>Sense dades</div>
  );

  const max = Math.max(...validData.map(d => Math.abs(d.value)), 0.001); // Prevent division by zero
  const sorted = [...validData].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  const bestValue = sorted[0]?.value;

  // Add keyframes for animations directly if needed, or rely on inline transitions
  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</h3>
        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: (color || '#3b82f6') + '18', color: color || '#3b82f6', fontWeight: 700 }}>
          {lowerIsBetter ? 'Menor és millor' : 'Major és millor'}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        {/* Draw vertical reference lines manually (e.g., 25%, 50%, 75%, 100%) */}
        <div style={{ position: 'absolute', inset: '0 0 0 110px', pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', opacity: 0.1 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 1, background: 'var(--text-primary)', height: '100%' }} />
          ))}
        </div>

        <div style={{ display: 'grid', gap: 14, paddingBottom: 10 }}>
          {sorted.map((item, i) => {
            const pct = Math.max(0, Math.min(100, (Math.abs(item.value) / max) * 100));
            const isHovered = hovered === i;
            const isWinner = item.value === bestValue && i === 0;

            // Generate a vibrant gradient for the bars
            const bgGradient = `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`;
            const shadow = isHovered ? `0 4px 12px ${color}40` : (isWinner ? `0 2px 8px ${color}25` : 'none');

            return (
              <div key={item.label}
                style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, cursor: 'default', transition: 'opacity 0.15s', opacity: hovered !== null && !isHovered ? 0.65 : 1 }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>

                <div style={{ width: 130, fontSize: 12, fontWeight: isWinner ? 700 : 400, color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }} title={item.label}>
                  {isWinner && <span style={{ color: '#f59e0b', marginRight: 4 }}><IconTrophy /></span>}
                  {item.label}
                </div>

                <div style={{ flex: 1, height: 22, background: 'var(--bg-hover)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`, background: bgGradient, borderRadius: 4,
                    transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    boxShadow: shadow
                  }}>
                    {pct > 30 && (
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)' }}>
                        {item.value.toFixed(1)}{unit}
                      </span>
                    )}
                    {/* Add subtle animated shine to the winner */}
                    {isWinner && (
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        transform: 'skewX(-20deg) translateX(-150%)',
                        animation: 'shimmer 3s infinite',
                      }} />
                    )}
                  </div>
                </div>

                <div style={{ width: 72, fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: isWinner ? 800 : 700, color: isWinner ? color : 'var(--text-secondary)', textAlign: 'left', flexShrink: 0, transition: 'all 0.2s' }}>
                  {item.value.toFixed(2)}{unit}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Live Line Chart ────────────────────────────────────────────────────────────
const LiveLineChart = ({ data, color = '#3b82f6', label, unit = '' }: {
  data: number[]; color?: string; label: string; unit?: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovX, setHovX] = useState<number | null>(null);
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', color: 'var(--text-disabled)', fontSize: 12, padding: '14px 0' }}>Esperant dades...</div>
  );
  const W = 480, H = 80;
  const max = Math.max(...data, 0.01), min = Math.min(...data, 0);
  const range = max - min || max;
  const px = (i: number) => (i / (data.length - 1)) * (W - 20) + 10;
  const py = (v: number) => H - 8 - ((v - min) / range) * (H - 16);
  const pts = data.map((v, i) => `${px(i)},${py(v)}`).join(' ');
  const fillPts = [`${px(0)},${H}`, ...data.map((v, i) => `${px(i)},${py(v)}`), `${px(data.length - 1)},${H}`].join(' ');
  const gradId = 'lg-' + label.replace(/\s+/g, '').replace(/[^a-zA-Z0-9-]/g, '');

  let hovIdx: number | null = null;
  if (hovX !== null && svgRef.current) {
    const rect = svgRef.current.getBoundingClientRect();
    hovIdx = Math.round(((hovX - rect.left) * (W / rect.width) - 10) / (W - 20) * (data.length - 1));
    hovIdx = Math.max(0, Math.min(data.length - 1, hovIdx));
  }
  const curVal = hovIdx !== null ? data[hovIdx] : data[data.length - 1];
  const curX = hovIdx !== null ? px(hovIdx) : px(data.length - 1);
  const curY = hovIdx !== null ? py(curVal) : py(data[data.length - 1]);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{curVal.toFixed(2)}{unit}</span>
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible', display: 'block', cursor: 'crosshair' }}
        onMouseMove={e => setHovX(e.clientX)} onMouseLeave={() => setHovX(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill={`url(#${gradId})`} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hovX !== null && hovIdx !== null && (
          <>
            <line x1={curX} y1={0} x2={curX} y2={H} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
            <circle cx={curX} cy={curY} r={4} fill={color} stroke="var(--bg-card)" strokeWidth="2" />
          </>
        )}
        <circle cx={px(data.length - 1)} cy={py(data[data.length - 1])} r={3} fill={color} opacity={hovX === null ? 1 : 0.3} />
      </svg>
    </div>
  );
};

// ── FilterChip ────────────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) => (
  <button onClick={onClick} style={{ ...S.chip(active, color), fontSize: 12 }}>{label}</button>
);

// ── Score Ring (small circular score indicator) ───────────────────────────────
const ScoreRing = ({ score, size = 36 }: { score: number; size?: number }) => {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const col = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={col} fontFamily="var(--font-mono)">{score}</text>
    </svg>
  );
};

// ── HistorialTab ───────────────────────────────────────────────────────────────
const HistorialTab = () => {
  const [summary, setSummary] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [percentileMap, setPercentileMap] = useState<Record<string, { p50: number | null; p99: number | null }>>({});
  const [filterPlatform, setFilterPlatform] = useState<string[]>([]);
  const [filterProtocol, setFilterProtocol] = useState<string[]>([]);
  const [filterArch, setFilterArch] = useState<string[]>([]);
  const [filterDataFormat, setFilterDataFormat] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, scRes, runsRes] = await Promise.all([
        fetch(`${METRICS_BASE}/metrics/summary`).then(r => r.json()).catch(() => []),
        fetch(`${SCENARIOS_BASE}/scenarios`).then(r => r.json()).catch(() => []),
        fetch(`${ORCHESTRATOR}/runs`).then(r => r.json()).catch(() => []),
      ]);
      setSummary(Array.isArray(sumRes) ? sumRes : []);
      setScenarios(Array.isArray(scRes) ? scRes : []);
      setRuns(Array.isArray(runsRes) ? runsRes : []);
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Calculate P50/P99 client-side from raw metrics
  useEffect(() => {
    if (!summary.length) return;
    const uniqueIds = [...new Set(summary.map((s: any) => s.scenarioId).filter(Boolean))];
    Promise.all(
      uniqueIds.map(id =>
        fetch(`${METRICS_BASE}/metrics?scenarioId=${id}`)
          .then(r => r.json())
          .then(data => {
            if (!Array.isArray(data) || !data.length) return null;
            const latArr = data.map((m: any) => m.latency ?? m.avgLatency ?? 0).filter((v: number) => v > 0);
            return { id, p50: computePercentile(latArr, 50), p99: computePercentile(latArr, 99) };
          })
          .catch(() => null)
      )
    ).then(results => {
      const map: Record<string, { p50: number | null; p99: number | null }> = {};
      results.forEach(r => { if (r) map[r.id] = { p50: r.p50, p99: r.p99 }; });
      setPercentileMap(map);
    });
  }, [summary]);

  const scenarioMap = Object.fromEntries(scenarios.map((s: any) => [s.id, s]));
  const nameMap = Object.fromEntries(scenarios.map((s: any) => [s.id, s.name || s.id?.slice(0, 10)]));

  // Sync with orchestrator runs
  const runScenarioIds = new Set(runs.map((r: any) => r.scenarioId).filter(Boolean));
  const syncedSummary = loading
    ? summary
    : runs.length > 0
      ? summary.filter(s => runScenarioIds.has(s.scenarioId))
      : [];

  // Derive the data format for a summary item
  const dataFormatOf = (s: any): string =>
    s.dataFormat || scenarioMap[s.scenarioId]?.dataFormat || 'default';

  // Available filter values
  const availPlatforms = [...new Set(syncedSummary.map((s: any) => normalizePlatform(s.platform || s.broker) || '').filter(Boolean))];
  const availProtocols = [...new Set(syncedSummary.map((s: any) => s.protocol || '').filter(Boolean))];
  const availArchs = [...new Set(syncedSummary.map((s: any) => s.architecture || '').filter(Boolean))];
  const availDataFormats = [...new Set(syncedSummary.map(dataFormatOf).filter(Boolean))];

  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const filteredSummary = syncedSummary.filter(s => {
    const platform = normalizePlatform(s.platform || s.broker) || '';
    if (filterPlatform.length && !filterPlatform.includes(platform)) return false;
    if (filterProtocol.length && !filterProtocol.includes(s.protocol || '')) return false;
    if (filterArch.length && !filterArch.includes(s.architecture || '')) return false;
    if (filterDataFormat.length && !filterDataFormat.includes(dataFormatOf(s))) return false;
    return true;
  });

  const activeFilters = filterPlatform.length + filterProtocol.length + filterArch.length + filterDataFormat.length;
  const clearFilters = () => { setFilterPlatform([]); setFilterProtocol([]); setFilterArch([]); setFilterDataFormat([]); };

  // ── Scoring: format-aware, normalized 0-100 ──
  const scoreMap = computeScores(filteredSummary, percentileMap, dataFormatOf);

  // Sort by score descending (higher = better)
  const sorted = [...filteredSummary].sort((a, b) =>
    (scoreMap.get(b.scenarioId) ?? 0) - (scoreMap.get(a.scenarioId) ?? 0)
  );
  const best = sorted[0];

  // Charts: each sorted by its own metric (best first)
  // Latency: ascending (lower = better)
  const latData = [...filteredSummary]
    .sort((a, b) => (a.avgLatency ?? 9999) - (b.avgLatency ?? 9999))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgLatency ?? 0 }));

  // Throughput: descending (higher = better)
  const tputData = [...filteredSummary]
    .sort((a, b) => (b.avgThroughput ?? 0) - (a.avgThroughput ?? 0))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgThroughput ?? 0 }));

  // Error rate: ascending (lower = better)
  const errData = [...filteredSummary]
    .sort((a, b) => (a.avgErrorRate ?? 0) - (b.avgErrorRate ?? 0))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgErrorRate ?? 0 }));

  if (loading) return (
    <div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ ...SK_STYLE, height: 12, width: 160, marginBottom: 14, animationDelay: `${i * 0.1}s` }} />
          <div style={{ ...SK_STYLE, height: 110, width: '100%' }} />
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <MetricGlossary />

      {/* ── Filters ── */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        {/* Format de Dades: primary filter, always visible */}
        {availDataFormats.length > 0 && (
          <div style={{ marginBottom: filtersOpen || availDataFormats.length > 0 ? 14 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Format de Dades</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availDataFormats.map(f => (
                <Chip
                  key={f}
                  label={DATA_FORMAT_LABELS[f] || f}
                  active={filterDataFormat.includes(f)}
                  color={DATA_FORMAT_COLORS[f] || '#7c3aed'}
                  onClick={() => toggle(filterDataFormat, setFilterDataFormat, f)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Divider + toggle for secondary filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: availDataFormats.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: availDataFormats.length > 0 ? 14 : 0 }}>
          <button
            onClick={() => setFiltersOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}
          >
            <IconFilter />
            Més filtres (Protocol, Plataforma, Arquitectura)
            {(filterPlatform.length + filterProtocol.length + filterArch.length) > 0 && (
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 17, height: 17, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {filterPlatform.length + filterProtocol.length + filterArch.length}
              </span>
            )}
            <IconChevron open={filtersOpen} />
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {filteredSummary.length !== syncedSummary.length && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Mostrant <strong>{filteredSummary.length}</strong> de {syncedSummary.length}
              </span>
            )}
            {activeFilters > 0 && (
              <button onClick={clearFilters} style={{ ...S.btn, fontSize: 12, padding: '4px 12px', color: 'var(--error)', borderColor: 'var(--error)' }}>
                Esborra tots
              </button>
            )}
            <button onClick={fetchData} style={{ ...S.btn, fontSize: 12, padding: '5px 12px', gap: 5 }}>
              <IconRefresh /> Actualitzar
            </button>
          </div>
        </div>

        {/* Secondary filters (collapsible) */}
        {filtersOpen && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {availProtocols.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Protocol</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {availProtocols.map(p => <Chip key={p} label={p} active={filterProtocol.includes(p)} color="#16a34a" onClick={() => toggle(filterProtocol, setFilterProtocol, p)} />)}
                </div>
              </div>
            )}
            {availPlatforms.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Plataforma</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {availPlatforms.map(p => <Chip key={p} label={p} active={filterPlatform.includes(p)} color={PLATFORM_COLORS[p] || '#d97706'} onClick={() => toggle(filterPlatform, setFilterPlatform, p)} />)}
                </div>
              </div>
            )}
            {availArchs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Arquitectura</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {availArchs.map(a => <Chip key={a} label={a} active={filterArch.includes(a)} color={ARCHITECTURE_COLORS[a] || '#2563eb'} onClick={() => toggle(filterArch, setFilterArch, a)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {syncedSummary.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 64 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><IconBarChart /></div>
          <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>Encara no hi ha resultats</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            Executa escenaris per veure les comparatives aquí.{' '}
            <a href="/escenaris" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Anar a Escenaris →</a>
          </div>
        </div>
      )}

      {filteredSummary.length === 0 && syncedSummary.length > 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Cap resultat coincideix amb els filtres actuals.</div>
        </div>
      )}

      {filteredSummary.length > 0 && (
        <>
          {/* Stat cards: escenaris comparats + guanyador */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 20 }}>
            {/* Escenaris comparats */}
            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#3b82f614', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, fontFamily: 'var(--font)' }}>
                {filteredSummary.length}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Escenaris comparats</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{filteredSummary.length} escenari{filteredSummary.length !== 1 ? 's' : ''} · puntuació format-aware</div>
              </div>
            </div>

            {/* Guanyador (best by score) */}
            {best && (
              <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(34,197,94,0.04) 100%)', borderColor: 'rgba(34,197,94,0.25)' }}>
                <ScoreRing score={scoreMap.get(best.scenarioId) ?? 0} size={52} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: '#f59e0b' }}><IconAward /></span>
                    <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Millor escenari (multi-factor)</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                    {nameMap[best.scenarioId] || best.scenarioId?.slice(0, 16) || '-'}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                    {best.protocol && <span style={{ ...S.badge(PROTOCOL_COLORS[best.protocol] || '#16a34a'), fontSize: 10 }}>{best.protocol}</span>}
                    {best.architecture && <span style={{ ...S.badge(ARCHITECTURE_COLORS[best.architecture] || '#2563eb'), fontSize: 10 }}>{best.architecture}</span>}
                    {(() => { const p = normalizePlatform(best.platform || best.broker); return p ? <span style={{ ...S.badge(PLATFORM_COLORS[p] || '#d97706'), fontSize: 10 }}>{p}</span> : null; })()}
                    {(() => { const df = dataFormatOf(best); return <span style={{ ...S.badge(DATA_FORMAT_COLORS[df] || '#64748b'), fontSize: 10 }}>{DATA_FORMAT_LABELS[df] || df}</span>; })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Charts — always horizontal */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Rendiment Mètric</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ ...S.card }}>
                <HBarChart data={latData} title="Latència mitjana (ms)" unit="ms" color="#f59e0b" lowerIsBetter />
              </div>
              <div style={{ ...S.card }}>
                <HBarChart data={tputData} title="Throughput mitjà (msg/s)" unit="" color="#22c55e" lowerIsBetter={false} />
              </div>
            </div>
            <div style={{ ...S.card, marginBottom: 20 }}>
              <HBarChart data={errData} title="Taxa d'error mitjana (%)" unit="%" color="#ef4444" lowerIsBetter />
            </div>
          </div>

          {/* Comparison table */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Taula comparativa completa</span>
              <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>{sorted.length} escenaris · puntuació format-aware (0-100)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <style>{`.cmp-tbl th,.cmp-tbl td{padding:7px 8px!important}`}</style>
              <table className="cmp-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={S.tableHeader}>
                    <th style={S.th}>Escenari</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Puntuació</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Lat. avg</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>P50</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>P99</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Throughput</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Error %</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Mostres</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Arq.</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Protocol</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Plataforma</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => {
                    const isBest = i === 0;
                    const sc = scenarioMap[s.scenarioId];
                    const arch = s.architecture || sc?.architecture || '';
                    const proto = s.protocol || sc?.protocol || '';
                    const platform = normalizePlatform(s.platform || s.broker || sc?.platform || sc?.broker);
                    const platColor = PLATFORM_COLORS[platform] || 'var(--text-secondary)';
                    const df = dataFormatOf(s);
                    const dfColor = DATA_FORMAT_COLORS[df] || '#64748b';
                    const computed = percentileMap[s.scenarioId];
                    const p50Val = s.p50Latency ?? computed?.p50;
                    const p99Val = s.p99Latency ?? computed?.p99;
                    const score = scoreMap.get(s.scenarioId) ?? 0;
                    const errRate = s.avgErrorRate ?? 0;

                    return (
                      <tr key={i} style={{ ...S.tableRow, background: isBest ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                        {/* Escenari */}
                        <td style={{ ...S.td, fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isBest && <span style={{ color: '#f59e0b', flexShrink: 0 }}><IconTrophy /></span>}
                            <div title={nameMap[s.scenarioId] || s.scenarioId} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nameMap[s.scenarioId] || s.scenarioId?.slice(0, 12) || '-'}
                            </div>
                          </div>
                          <div style={{ fontSize: 10, color: dfColor, fontWeight: 600, marginTop: 2 }}>{DATA_FORMAT_LABELS[df] || df}</div>
                        </td>

                        {/* Puntuació */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <ScoreRing score={score} size={32} />
                          </div>
                        </td>

                        {/* Latència avg */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b' }}>
                          {s.avgLatency != null ? <>{s.avgLatency.toFixed(2)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-disabled)' }}>ms</span></> : '-'}
                        </td>

                        {/* P50 */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#3b82f6' }}>
                          {p50Val != null ? <>{p50Val.toFixed(2)}<span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>ms</span></> : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </td>

                        {/* P99 */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7c3aed' }}>
                          {p99Val != null ? <>{p99Val.toFixed(2)}<span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>ms</span></> : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </td>

                        {/* Throughput */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#22c55e' }}>
                          {s.avgThroughput?.toFixed(1) ?? '-'}
                        </td>

                        {/* Error % */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: errRate > 0.1 ? '#ef4444' : 'var(--text-secondary)' }}>
                          {s.avgErrorRate?.toFixed(3) ?? '-'}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-disabled)' }}>%</span>
                        </td>

                        {/* Mostres */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)' }}>
                          {s.count ?? '-'}
                        </td>

                        {/* Arquitectura */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {arch ? <span style={{ ...S.badge(ARCHITECTURE_COLORS[arch] || '#2563eb'), fontSize: 11 }}>{arch}</span>
                            : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </td>

                        {/* Protocol */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {proto ? <span style={{ ...S.badge(PROTOCOL_COLORS[proto] || '#16a34a'), fontSize: 11 }}>{proto}</span>
                            : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </td>

                        {/* Plataforma */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {platform ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{platform}</span>
                            : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-disabled)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Puntuació 0-100 normalitzada · pesos adaptats al format de dades (financer: error x40%, vídeo: throughput x40%, IoT: throughput x30%)</span>
              <span>P50/P99: calculats de les mètriques en brut · <span style={{ fontStyle: 'italic' }}>-</span> = sense dades suficients</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── RunCard (Live tab scenario picker) ─────────────────────────────────────────
const RunCard = ({
  run, selected, onClick,
}: {
  run: any; selected: boolean; onClick: () => void;
}) => {
  const isRunning = run.status === 'running';
  const platform = normalizePlatform(run.platform || run.broker);
  const platColor = PLATFORM_COLORS[platform] || '#7c3aed';
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 14px',
        background: selected ? 'var(--accent-soft)' : 'var(--bg-card)',
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        transition: 'all 0.15s ease',
        minWidth: 180,
        maxWidth: 240,
        flexShrink: 0,
        boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.12)' : 'var(--shadow-sm)',
      }}
    >
      {/* Status indicator + name */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: isRunning ? '#22c55e' : '#f59e0b',
          boxShadow: isRunning ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
          animation: isRunning ? 'pulseDot 1.8s ease infinite' : 'none',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
          {run.scenarioName || run.id?.slice(0, 14) || '-'}
        </span>
      </div>
      {/* Badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {run.protocol && <span style={{ ...S.badge(PROTOCOL_COLORS[run.protocol] || '#16a34a'), fontSize: 10 }}>{run.protocol}</span>}
        {run.architecture && <span style={{ ...S.badge(ARCHITECTURE_COLORS[run.architecture] || '#2563eb'), fontSize: 10 }}>{run.architecture}</span>}
        {platform && <span style={{ ...S.badge(platColor), fontSize: 10 }}>{platform}</span>}
        {run.dataFormat && run.dataFormat !== 'default' && (
          <span style={{ ...S.badge(DATA_FORMAT_COLORS[run.dataFormat] || '#8b5cf6'), fontSize: 10 }}>{DATA_FORMAT_LABELS[run.dataFormat] || run.dataFormat}</span>
        )}
      </div>
      {/* Status text */}
      <div style={{ marginTop: 8, fontSize: 11, color: isRunning ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
        {isRunning ? 'En execució' : 'Pendent'}
      </div>
    </button>
  );
};

// ── LiveTab ────────────────────────────────────────────────────────────────────
const LiveTab = () => {
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [metrics, setMetrics] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pollError, setPollError] = useState('');

  const fetchActive = useCallback(async () => {
    try {
      const data = await fetch(`${ORCHESTRATOR}/runs`).then(r => r.json());
      if (Array.isArray(data)) setActiveRuns(data.filter((r: any) => r.status === 'running' || r.status === 'pending'));
    } catch (_) { }
  }, []);

  useEffect(() => {
    fetchActive();
    const i = setInterval(fetchActive, 5000);
    return () => clearInterval(i);
  }, [fetchActive]);

  useEffect(() => {
    if (!selectedRunId && activeRuns.length > 0) setSelectedRunId(activeRuns[0].id);
    if (selectedRunId && !activeRuns.find(r => r.id === selectedRunId) && activeRuns.length > 0)
      setSelectedRunId(activeRuns[0].id);
  }, [activeRuns, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId) { setMetrics([]); setPolling(false); return; }
    setMetrics([]); setPolling(true); setPollError('');

    const poll = async () => {
      try {
        // Always fetch by runId only — never fall back to scenarioId
        // (fallback would show old historical data from previous runs)
        const data = await fetch(`${METRICS_BASE}/metrics?runId=${selectedRunId}`).then(r => r.json()).catch(() => null);
        if (Array.isArray(data) && data.length > 0) {
          setMetrics(data);
          setLastUpdate(new Date());
          setPollError('');
        }
      } catch (e: any) { setPollError(e.message); }
    };

    poll();
    const i = setInterval(poll, 3000);
    return () => { clearInterval(i); setPolling(false); };
  }, [selectedRunId]);

  const lat = metrics.map(m => m.latency ?? m.avgLatency ?? 0);
  const tput = metrics.map(m => m.throughput ?? m.avgThroughput ?? 0);
  const err = metrics.map(m => m.errorRate ?? m.avgErrorRate ?? 0);
  const avg = (a: number[]) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) : '-';
  const p50v = (a: number[]) => computePercentile(a, 50)?.toFixed(2) ?? '-';
  const p99v = (a: number[]) => computePercentile(a, 99)?.toFixed(2) ?? '-';

  return (
    <div>
      {/* ── Rich scenario picker ── */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: activeRuns.length > 0 ? 14 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Escenari en execució
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: polling && activeRuns.length > 0 ? '#22c55e' : '#94a3b8',
              display: 'inline-block',
              boxShadow: polling && activeRuns.length > 0 ? '0 0 8px #22c55e80' : 'none',
              animation: polling && activeRuns.length > 0 ? 'pulseDot 2s ease infinite' : 'none',
            }} />
            <span style={{ fontSize: 13, color: polling && activeRuns.length > 0 ? '#22c55e' : 'var(--text-disabled)', fontWeight: 600 }}>
              {polling && activeRuns.length > 0 ? 'En directe' : 'Inactiu'}
            </span>
            {lastUpdate && (
              <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
                · actualitzat {lastUpdate.toLocaleTimeString('ca-ES')}
              </span>
            )}
          </div>
        </div>

        {activeRuns.length === 0 ? (
          <div style={{ color: 'var(--text-disabled)', fontSize: 14 }}>Cap escenari actiu.</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {activeRuns.map(r => (
              <RunCard
                key={r.id}
                run={r}
                selected={r.id === selectedRunId}
                onClick={() => setSelectedRunId(r.id)}
              />
            ))}
          </div>
        )}

        {pollError && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--error)', borderRadius: 6, fontSize: 12, color: 'var(--error)' }}>
            Error en carregar mètriques: {pollError}
          </div>
        )}
      </div>

      {/* Empty state */}
      {activeRuns.length === 0 ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 72 }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}><IconSignal /></div>
          <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Cap execució activa</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 20px' }}>
            Inicia un escenari des de la pàgina <strong>Escenaris</strong> i aquí apareixeran les mètriques en temps real: latència, throughput, P50 i P99.
          </div>
          <a href="/escenaris" style={{ ...S.btnPrimary as React.CSSProperties, textDecoration: 'none', display: 'inline-flex' }}>
            Anar a Escenaris →
          </a>
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div aria-live="polite" aria-atomic="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'Mostres rebudes', v: String(metrics.length), c: '#3b82f6' },
              { l: 'Latència avg (ms)', v: `${avg(lat)}ms`, c: '#f59e0b' },
              { l: 'Throughput avg', v: avg(tput), c: '#22c55e' },
              { l: 'Error rate avg (%)', v: `${avg(err)}%`, c: '#ef4444' },
            ].map(c => (
              <div key={c.l} style={{ ...S.card, textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.c, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>{c.v}</div>
                <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.l}</div>
              </div>
            ))}
          </div>

          {/* P50 + P99 */}
          {metrics.length >= 5 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { l: 'P50 Latència (mediana)', v: `${p50v(lat)}ms`, c: '#3b82f6', desc: '50% dels missatges arriben en menys d\'aquest temps' },
                { l: 'P99 Latència (cua llarga)', v: `${p99v(lat)}ms`, c: '#7c3aed', desc: '99% dels missatges arriben en menys d\'aquest temps (pitjor cas pràctic)' },
              ].map(c => (
                <div key={c.l} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: c.c + '14', color: c.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 12 }}>
                    {c.l.slice(0, 3)}
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: c.c, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>{c.v}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 2, fontWeight: 600 }}>{c.l}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2, fontStyle: 'italic' }}>{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Live charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              { data: lat, color: '#f59e0b', label: 'Latència (ms)', unit: 'ms' },
              { data: tput, color: '#22c55e', label: 'Throughput (msg/s)', unit: '' },
              { data: err, color: '#ef4444', label: 'Error rate (%)', unit: '%' },
            ].map(c => (
              <div key={c.label} style={{ ...S.card }}>
                <LiveLineChart data={c.data} color={c.color} label={c.label} unit={c.unit} />
              </div>
            ))}
          </div>

          {/* Recent metrics table */}
          {metrics.length > 0 && (
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-secondary)' }}><IconPulse /></span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimes mesures</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-disabled)' }}>
                  {metrics.length} punts · actualització cada 3s
                </span>
              </div>
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={S.tableHeader}>
                      {['Hora', 'Latència (ms)', 'Throughput', 'Error (%)'].map(h => (
                        <th key={h} style={{ ...S.th, textAlign: h === 'Hora' ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...metrics].reverse().map((m, i) => (
                      <tr key={i} style={S.tableRow}>
                        <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)' }}>
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ca-ES') : '-'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>
                          {(m.latency ?? m.avgLatency)?.toFixed(2) ?? '-'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#22c55e' }}>
                          {(m.throughput ?? m.avgThroughput)?.toFixed(2) ?? '-'}
                        </td>
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                          {(m.errorRate ?? m.avgErrorRate)?.toFixed(3) ?? '-'}
                        </td>
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

  const tabBtn = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '10px 22px', cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'none', fontWeight: active ? 700 : 500, fontSize: 14,
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    transition: 'color var(--transition), border-color var(--transition)',
    fontFamily: 'var(--font)',
  });

  return (
    <div style={{ ...S.page, maxWidth: 1200 }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Resultats</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
          Mètriques en temps real i comparatives d'arquitectures asíncrones
        </p>
      </div>

      <div role="tablist" aria-label="Vistes de resultats" style={{ borderBottom: '1px solid var(--border)', marginBottom: 24, display: 'flex' }}>
        <button role="tab" aria-selected={tab === 'live'} style={tabBtn(tab === 'live')} onClick={() => setTab('live')}>      <IconPulse /> En directe</button>
        <button role="tab" aria-selected={tab === 'historial'} style={tabBtn(tab === 'historial')} onClick={() => setTab('historial')}><IconClock /> Historial i comparatives</button>
      </div>

      <div role="tabpanel" aria-label={tab === 'live' ? 'En directe' : 'Historial i comparatives'}>
        {tab === 'live' && <LiveTab />}
        {tab === 'historial' && <HistorialTab />}
      </div>
    </div>
  );
};

export default ResultatsPage;

