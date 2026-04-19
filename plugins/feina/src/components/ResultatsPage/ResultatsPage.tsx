/**
 * ResultatsPage.tsx - AsyncBench Results & Comparison Page
 *
 * This page is the central analytics view of the AsyncBench Backstage plugin.
 * It provides two main tabs:
 *
 *   1. "En directe" (Live tab) - polls the benchmark orchestrator for active
 *      runs and streams real-time metrics (latency, throughput, error rate,
 *      P50, P99) from the metrics API every 3 seconds.
 *
 *   2. "Historial i comparatives" (History tab) - fetches aggregated summaries
 *      from Elasticsearch via /metrics/summary and displays ranked comparisons
 *      with a format-aware weighted scoring system (0-100).
 *
 * Key architectural decisions documented below:
 *
 * - History data source: /metrics/summary only (Elasticsearch), NOT the
 *   orchestrator /runs endpoint. The orchestrator uses in-memory storage that
 *   is lost on pod restart. Previously, the history tab filtered summary data
 *   against the orchestrator's run list, causing the history to appear empty
 *   after any restart. The fix: syncedSummary = summary (no filter).
 *
 * - Run-level granularity: /metrics/summary groups by runId (not scenarioId).
 *   Each benchmark run appears as its own history entry, preserving individual
 *   run differences. The old scenarioId grouping merged all runs of a scenario,
 *   hiding variance between runs.
 *
 * - Server-side percentiles: P50/P99 are now returned directly by the summary
 *   API (p50Latency, p99Latency fields). The previous client-side percentile
 *   computation (percentileMap) was removed since it required fetching all raw
 *   data points just to compute percentiles that the server can aggregate more
 *   accurately via Elasticsearch percentile aggregations.
 *
 * Design system:
 *   - Font: var(--font) = IBM Plex Sans, var(--font-mono) = JetBrains Mono
 *   - Dark mode: OLED black (#09090b) background
 *   - Shared styles via S object imported from ../../theme
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import { S, GLOBAL_CSS } from '../../theme';

// ---------------------------------------------------------------------------
// API base URLs - routed through Backstage proxy to avoid CORS issues
// ---------------------------------------------------------------------------

/** Metrics collection and aggregation service (backed by Elasticsearch). */
const METRICS_BASE = '/api/proxy/metrics-api';

/** Scenario definition service - provides scenario metadata (name, config). */
const SCENARIOS_BASE = '/api/proxy/scenario-service';

/**
 * Benchmark orchestrator - manages active/pending run lifecycle.
 * NOTE: Uses in-memory storage. State is lost on pod restart.
 * Do NOT use this as a source of truth for historical data.
 */
const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Computes the p-th percentile of a numeric array using the nearest-rank method.
 * Used in the Live tab to compute P50/P99 from real-time metric samples
 * (since the live endpoint returns raw points, not pre-aggregated percentiles).
 *
 * NOTE: This function is kept for the Live tab only. The History tab no longer
 * uses client-side percentile computation - the /metrics/summary endpoint now
 * returns p50Latency and p99Latency directly from Elasticsearch percentile
 * aggregations, which are more accurate over large datasets.
 *
 * @param arr - Array of numeric values
 * @param p   - Percentile to compute (0-100)
 * @returns   The percentile value, or null if the array is empty
 */
const computePercentile = (arr: number[], p: number): number | null => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
};

/**
 * CSS-in-JS style object for skeleton loading shimmer animation.
 * Applied to placeholder elements while data is being fetched.
 * The shimmer animation is defined in GLOBAL_CSS (from theme).
 */
const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

/**
 * Human-readable labels for each data format type.
 * Used in filter chips, badges, and table cells throughout the page.
 * Keys match the dataFormat field stored in Elasticsearch documents.
 */
const DATA_FORMAT_LABELS: Record<string, string> = {
  'default': 'Per defecte',
  'video-4k': 'Video 4K',
  'video-8k': 'Video 8K',
  'financial': 'Financer',
  'iot': 'IoT',
};

/**
 * Brand colors for each data format.
 * Used to visually distinguish formats in badges, filter chips, and chart labels.
 * Colors were chosen to be distinct and accessible on dark backgrounds.
 */
const DATA_FORMAT_COLORS: Record<string, string> = {
  'default': '#64748b',
  'video-4k': '#8b5cf6',
  'video-8k': '#7c3aed',
  'financial': '#0ea5e9',
  'iot': '#10b981',
};

/**
 * Brand colors for each messaging platform.
 * Displayed on RunCard badges and the history comparison table.
 * Normalized platform names (via normalizePlatform) are used as keys.
 */
const PLATFORM_COLORS: Record<string, string> = {
  'Kafka': '#ef4444',
  'Confluent': '#3b82f6',
  'RabbitMQ': '#f59e0b',
  'NATS Server': '#22c55e',
  'Pulsar': '#a78bfa',
};

/**
 * Brand colors for each messaging protocol.
 * Used in badges throughout the History and Live tabs.
 */
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

/**
 * Brand colors for each asynchronous architecture pattern.
 * EDA=Event-Driven, QBA=Queue-Based, LCA=Log-Centric, EMA=Event Mesh, SEA=Streaming.
 */
const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA': '#2563eb',
  'QBA': '#9333ea',
  'LCA': '#16a34a',
  'EMA': '#dc2626',
  'SEA': '#d97706',
};

/**
 * Normalizes raw platform strings from the API to canonical display names.
 * The metrics/scenario APIs may return platform values in various casing/forms
 * (e.g. "kafka", "KAFKA", "rabbitmq"), so we normalize before display and
 * before looking up in PLATFORM_COLORS.
 *
 * @param p - Raw platform string from API (may be undefined)
 * @returns  Canonical display name, or empty string if not recognized
 */
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

// ---------------------------------------------------------------------------
// Delivery model (intrinsic protocol property, NOT a benchmark artefact)
// ---------------------------------------------------------------------------

/**
 * Returns the broker's delivery model:
 *   - 'pull'   Kafka / Confluent (consumer fetches from broker)
 *   - 'push'   NATS / RabbitMQ / Pulsar (broker pushes to consumer)
 *
 * Reported in the load-generator metric docs via `deliveryModel`. The UI
 * prefers that server-side value when present, but falls back to inferring
 * from platform/broker so older history records still render a badge.
 *
 * Documented in the FairComparisonPanel so readers understand why residual
 * latency differences between pull and push brokers are intrinsic to the
 * protocol and not a benchmark configuration issue.
 */
const deliveryModelOf = (s: any): 'pull' | 'push' | null => {
  // 1. Prefer server-side value (load-generator >= fdcf64d embeds this).
  if (s?.deliveryModel === 'pull' || s?.deliveryModel === 'push') return s.deliveryModel;
  // 2. Fall back to platform/broker lookup for older records.
  const raw = (s?.platform || s?.broker || '').toString().toLowerCase();
  if (raw.includes('kafka') || raw.includes('confluent')) return 'pull';
  if (raw.includes('nats') || raw.includes('rabbit') || raw.includes('pulsar') || raw.includes('mqtt') || raw.includes('amqp')) return 'push';
  return null;
};

/** Badge styling for delivery model — pull uses amber, push uses teal. */
const DELIVERY_MODEL_META: Record<'pull' | 'push', { label: string; color: string; bg: string }> = {
  pull: { label: 'pull',  color: '#d97706', bg: 'rgba(217,119,6,0.10)' },
  push: { label: 'push',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
};

// ---------------------------------------------------------------------------
// Format-aware scoring system
// ---------------------------------------------------------------------------

/**
 * Per-format metric weights for the composite scoring algorithm.
 * Each format assigns different importance to each metric, reflecting
 * real-world requirements:
 *
 * - default:    Balanced weights - no specific optimization
 * - financial:  Error rate is critical (40%) - a failed transaction is a real problem
 * - video-4k/8k: Throughput dominates (40%) - video playback needs sustained bandwidth
 * - iot:        Throughput important (30%) but sensor redundancy tolerates moderate errors
 *
 * Weights per format: { lat, p50, p99, tput, err }
 * All weights within a format sum to 1.0.
 */
const FORMAT_WEIGHTS: Record<string, { lat: number; p50: number; p99: number; tput: number; err: number }> = {
  'default': { lat: 0.20, p50: 0.15, p99: 0.25, tput: 0.20, err: 0.20 },
  'financial': { lat: 0.15, p50: 0.10, p99: 0.20, tput: 0.15, err: 0.40 }, // error critical
  'video-4k': { lat: 0.10, p50: 0.10, p99: 0.15, tput: 0.40, err: 0.25 }, // throughput critical
  'video-8k': { lat: 0.10, p50: 0.10, p99: 0.15, tput: 0.40, err: 0.25 },
  'iot': { lat: 0.20, p50: 0.15, p99: 0.20, tput: 0.30, err: 0.15 }, // throughput important
};

/**
 * Returns an error penalty multiplier (0.0-1.0) applied to the final score.
 * If error rates exceed format-specific thresholds, the score is reduced.
 * A fast but unreliable system should not achieve a high overall score.
 *
 * Penalty values by format:
 * - financial: 0.55 if error > 0.1% (one failed transaction is costly)
 * - video-4k/8k: 0.75 if error > 2.0% (visible artifacts in video stream)
 * - iot: 0.80 if error > 0.5% (sensor data has some redundancy)
 * - default: 0.70 if error > 1.0%
 * - no threshold exceeded: 1.0 (no penalty)
 *
 * @param dataFormat - The data format key (e.g. 'financial', 'video-4k')
 * @param errRate    - The average error rate percentage (e.g. 0.3 means 0.3%)
 * @returns          Multiplier to apply to the composite score (0.55-1.0)
 */
const getErrorPenalty = (dataFormat: string, errRate: number): number => {
  if (dataFormat === 'financial' && errRate > 0.1) return 0.55;
  if ((dataFormat === 'video-4k' || dataFormat === 'video-8k') && errRate > 2.0) return 0.75;
  if (dataFormat === 'iot' && errRate > 0.5) return 0.80;
  if (errRate > 1.0) return 0.70; // default
  return 1.0;
};

/**
 * Computes a normalized 0-100 composite score for each item in a group.
 * Higher score = better performance relative to the group.
 *
 * Algorithm:
 *   1. For each metric, find the min and max across all items in the group.
 *   2. Normalize each item's metric value to [0, 1] (0=worst, 1=best).
 *   3. Compute weighted composite: sum(normalized_metric * weight).
 *   4. Apply error penalty multiplier.
 *   5. Clamp to [0, 100] and round to integer.
 *
 * Important: scores are RELATIVE to the comparison group. If all scenarios
 * perform poorly, the best one still gets ~100. This is intentional - the
 * score helps rank scenarios against each other, not against an absolute standard.
 *
 * Key change: The map key is now `s.runId || s.scenarioId` to support both:
 *   - New summary data grouped by runId (each run is a separate entry)
 *   - Legacy summary data grouped by scenarioId (backward compatibility)
 *
 * The percentileMap parameter is kept for API compatibility but is now always
 * passed as {} - P50/P99 come from s.p50Latency / s.p99Latency (server-side).
 *
 * @param items          - Array of summary objects to score
 * @param percentileMap  - Legacy: client-computed P50/P99 by scenarioId (now unused)
 * @param dataFormatOf   - Function to determine data format for a given item
 * @returns              Map from runId (or scenarioId) to score (0-100)
 */
const computeScores = (
  items: any[],
  percentileMap: Record<string, { p50: number | null; p99: number | null }>,
  dataFormatOf: (s: any) => string,
): Map<string, number> => {
  const n = items.length;
  if (n === 0) return new Map();

  // Special case: single item has no group to normalize against.
  // Score is based solely on the error penalty (100 * penalty).
  if (n === 1) {
    const s = items[0];
    const fmt = dataFormatOf(s);
    const err = s.avgErrorRate ?? 0;
    const penalty = getErrorPenalty(fmt, err);
    // Key uses runId first (new grouping), falling back to scenarioId (legacy)
    return new Map([[s.runId || s.scenarioId, Math.round(100 * penalty)]]);
  }

  // Accessors - prefer server-side P50/P99 (p50Latency/p99Latency), fall back
  // to client-computed percentileMap keyed by runId (or scenarioId for legacy)
  const getP50 = (s: any) => s.p50Latency ?? percentileMap[s.runId]?.p50 ?? percentileMap[s.scenarioId]?.p50 ?? null;
  const getP99 = (s: any) => s.p99Latency ?? percentileMap[s.runId]?.p99 ?? percentileMap[s.scenarioId]?.p99 ?? null;
  const getLat = (s: any) => s.avgLatency ?? null;
  const getTput = (s: any) => s.avgThroughput ?? null;
  const getErr = (s: any) => s.avgErrorRate ?? null;

  // Collect valid values for min/max normalization per metric
  const latVals = items.map(getLat).filter((v): v is number => v !== null);
  const tputVals = items.map(getTput).filter((v): v is number => v !== null);
  const errVals = items.map(getErr).filter((v): v is number => v !== null);
  const p50Vals = items.map(getP50).filter((v): v is number => v !== null);
  const p99Vals = items.map(getP99).filter((v): v is number => v !== null);

  /**
   * Normalizes a single value to [0, 1] within [min, max].
   * Returns 0.5 (neutral) if the value is null or min==max (no variance).
   * higherIsBetter inverts the normalization so that better always maps to 1.
   */
  const safeDivide = (val: number | null, min: number, max: number, higherIsBetter: boolean): number => {
    if (val === null || max === min) return 0.5;
    const norm = (val - min) / (max - min); // 0=min, 1=max
    return higherIsBetter ? norm : 1 - norm;
  };

  // Establish min/max bounds for each metric across the group.
  // A small non-zero epsilon (0.01) prevents division by zero when all values are 0.
  const minLat = Math.min(...latVals, 0), maxLat = Math.max(...latVals, 0.01);
  const minTp = Math.min(...tputVals, 0), maxTp = Math.max(...tputVals, 0.01);
  const minErr = Math.min(...errVals, 0), maxErr = Math.max(...errVals, 0.01);
  const minP50 = Math.min(...p50Vals, 0), maxP50 = Math.max(...p50Vals, 0.01);
  const minP99 = Math.min(...p99Vals, 0), maxP99 = Math.max(...p99Vals, 0.01);

  const map = new Map<string, number>();
  items.forEach(s => {
    const fmt = dataFormatOf(s);
    // Use format-specific weights, fall back to 'default' if format is unknown
    const w = FORMAT_WEIGHTS[fmt] ?? FORMAT_WEIGHTS['default'];

    // Normalize each metric: lower latency/errors = higher normalized score
    const normLat = safeDivide(getLat(s), minLat, maxLat, false);
    const normTput = safeDivide(getTput(s), minTp, maxTp, true);
    const normErr = safeDivide(getErr(s), minErr, maxErr, false);
    const normP50 = safeDivide(getP50(s), minP50, maxP50, false);
    const normP99 = safeDivide(getP99(s), minP99, maxP99, false);

    // Weighted composite score (0.0-1.0), then scale to 0-100
    const composite = normLat * w.lat + normP50 * w.p50 + normP99 * w.p99 + normTput * w.tput + normErr * w.err;
    const penalty = getErrorPenalty(fmt, s.avgErrorRate ?? 0);
    const score = Math.round(composite * 100 * penalty);

    // Key by runId when available (per-run scoring), fallback to scenarioId for legacy data
    map.set(s.runId || s.scenarioId, Math.max(0, Math.min(100, score)));
  });
  return map;
};

/**
 * Maps a 0-100 score to a semantic color for visual feedback.
 * - Green (>=75): good performance
 * - Amber (>=50): moderate performance
 * - Red (<50):    poor performance
 */
const scoreColor = (score: number): string => {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

// ---------------------------------------------------------------------------
// SVG Icon components - inline SVG for zero-dependency icon rendering
// ---------------------------------------------------------------------------

/** Large bar chart icon used in the empty state of the History tab. */
const IconBarChart = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="12" width="4" height="9" /><rect x="10" y="7" width="4" height="14" /><rect x="17" y="3" width="4" height="18" /></svg>;

/** Large signal/wifi icon used in the empty state of the Live tab. */
const IconSignal = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><path d="M2 12a10 10 0 0 1 20 0" /><path d="M6 12a6 6 0 0 1 12 0" /><path d="M10 12a2 2 0 0 1 4 0" /><circle cx="12" cy="12" r="1" /></svg>;

/** Small pulse/waveform icon used in the Live tab header and metrics table. */
const IconPulse = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;

/** Small clock icon used in the History tab button. */
const IconClock = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

/** Small info circle icon used in the MetricGlossary toggle button. */
const IconInfo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;

/** Small trophy icon marking the best-performing scenario in charts/tables. */
const IconTrophy = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="8 22 12 17 16 22" /><line x1="12" y1="17" x2="12" y2="11" /><path d="M6.5 4H17.5L17 9a5 5 0 0 1-10 0z" /></svg>;

/**
 * Animated chevron arrow that rotates 180deg when open=true.
 * Used in collapsible sections (MetricGlossary, secondary filters).
 */
const IconChevron = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>;

/** Award/badge icon used in the "best scenario" winner card. */
const IconAward = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><polyline points="8.56 2.75 4 6 4 12 8.56 9.25" /><polyline points="15.44 2.75 20 6 20 12 15.44 9.25" /><polyline points="9 16.7 12 19 15 16.7" /></svg>;

/** Small funnel filter icon used in the secondary filters toggle button. */
const IconFilter = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;

/** Small refresh/reload icon used in the "Actualitzar" button. */
const IconRefresh = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;

// ---------------------------------------------------------------------------
// Metric Glossary data and component
// ---------------------------------------------------------------------------

/**
 * Static definitions for the 5 benchmark metrics displayed in the glossary.
 * Each entry includes:
 * - key: matches the field name used in scoring/display logic
 * - short: one-line summary shown on the collapsed card
 * - detail: full explanation shown when the card is expanded (multi-line)
 * - formula: mathematical definition shown in a monospace box
 * - lowerBetter: determines the directional hint in the UI
 */
const METRIC_DEFINITIONS = [
  {
    key: 'latency',
    name: 'Latencia (avg)',
    color: '#f59e0b',
    icon: '(r)',
    unit: 'ms',
    lowerBetter: true,
    short: 'Temps des que el productor envia un missatge fins que el consumidor el rep.',
    detail: `La latencia mesura la velocitat de resposta del sistema. S'obte calculant la diferencia temporal entre l'enviament d'un missatge pel productor i la seva recepcio pel consumidor.
    En el benchmark, la "latencia mitjana" es la mitjana aritmetica de totes les mostres de la prova. Una latencia baixa es critica per casos d'us en temps real com IoT, trading o streaming de video.`,
    formula: 'latencia = t_recepcio - t_enviament',
  },
  {
    key: 'p50',
    name: 'P50 (Mediana)',
    color: '#06b6d4',
    icon: '50',
    unit: 'ms',
    lowerBetter: true,
    short: 'El 50% dels missatges s\'han processat en menys d\'aquest temps (mediana real).',
    detail: `El percentil 50 (P50) es la mediana de la distribucio de latencies. Significa que el 50% dels missatges han tingut una latencia inferior a aquest valor.
    A diferencia de la mitjana, el P50 no es veu afectat per pics extrems (outliers). Es util per entendre el comportament "normal" del sistema sota carrega.`,
    formula: 'P50 = valor en la posicio 50% de les latencies ordenades',
  },
  {
    key: 'p99',
    name: 'P99 (Cua de latencia)',
    color: '#8b5cf6',
    icon: '99',
    unit: 'ms',
    lowerBetter: true,
    short: 'El 99% dels missatges s\'han processat en menys d\'aquest temps (pitjor cas real).',
    detail: `El percentil 99 (P99) representa el pitjor cas per al 99% dels missatges. Si el P99 es 200 ms, significa que 1 de cada 100 missatges tarda mes de 200 ms.
    El P99 es la metrica mes important per sistemes de produccio: els usuaris "cua" (el 1% pitjor) solen representar els casos d'us mes exigents.
    Un P99 molt superior al P50 indica que el sistema te pics de latencia ocasionals greus (jitter), que poden ser inacceptables per aplicacions critiques.`,
    formula: 'P99 = valor en la posicio 99% de les latencies ordenades',
  },
  {
    key: 'throughput',
    name: 'Throughput',
    color: '#22c55e',
    icon: '>',
    unit: 'msg/s',
    lowerBetter: false,
    short: 'Nombre de missatges processats per segon. Indica la capacitat del sistema.',
    detail: `El throughput (o taxa de processament) mesura quants missatges processa el sistema per unitat de temps. En el benchmark, es calcula com el nombre total de missatges rebuts dividit pel temps transcorregut des de l'inici de la prova.
    Un throughput alt es clau per aplicacions d'alta carrega com analitica en temps real, pipelines de dades o plataformes d'events d'alta frequencia.
    El throughput i la latencia solen estar en tensio: augmentar la taxa d'enviament sol incrementar la latencia si el sistema arriba al seu limit.`,
    formula: 'throughput = missatges_rebuts / temps_transcorregut',
  },
  {
    key: 'errorRate',
    name: 'Taxa d\'error',
    color: '#ef4444',
    icon: 'X',
    unit: '%',
    lowerBetter: true,
    short: 'Percentatge de missatges que no s\'han pogut processar correctament.',
    detail: `La taxa d'error expressa quina fraccio dels missatges enviats ha fallat o s'ha perdut. En sistemes de missatgeria asincrona, els errors poden venir de diverses fonts: perdua de connexio, cua plena (backpressure), timeouts, o errors de seriacoi/deserialitzacio.
    El benchmark aplica una penalitzacio exponencial si la taxa d'error supera el 0.1%. Aixo reflecteix la realitat: un sistema rapid pero poc fiable es inutilitzable en produccio.
    La taxa d'error es la metrica amb major impacte negatiu en la puntuacio.`,
    formula: 'errorRate = (missatges_fallats / missatges_enviats) x 100',
  },
];

/**
 * MetricGlossary component - collapsible educational panel.
 *
 * Renders an accordion with:
 *   - Clickable metric cards (one per metric) that expand to show full
 *     definitions, formulas, and directional guidance.
 *   - Per-format weight bar charts showing how each format prioritizes metrics.
 *   - Explanation of the error penalty system.
 *
 * Placed at the top of HistorialTab so users understand the scoring context
 * before reading the comparison table.
 */
const MetricGlossary = () => {
  // Controls whether the entire glossary panel is open or collapsed
  const [open, setOpen] = useState(false);
  // Controls which individual metric card is expanded (null = none)
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  return (
    <div style={{ ...S.card, marginBottom: 20, borderLeft: '3px solid #3b82f6', padding: '16px 20px' }}>
      {/* Toggle button for the entire glossary */}
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#3b82f6' }}><IconInfo /></span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Guia de metriques i sistema de puntuacio</span>
        </div>
        <IconChevron open={open} />
      </button>

      {open && (
        <div style={{ marginTop: 20, animation: 'fadeUp 0.3s ease' }}>

          {/* Metric definition cards - one per metric in METRIC_DEFINITIONS */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Definicio de metriques
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
              {METRIC_DEFINITIONS.map(m => (
                <button
                  key={m.key}
                  // Toggle: clicking again collapses the same card
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
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: m.lowerBetter ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{m.lowerBetter ? '(v) millor' : '(^) millor'}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.short}</p>
                </button>
              ))}
            </div>

            {/* Expanded metric detail panel - only shown for the active metric */}
            {activeMetric && (() => {
              const m = METRIC_DEFINITIONS.find(x => x.key === activeMetric)!;
              return (
                <div style={{ background: m.color + '08', border: `1px solid ${m.color}30`, borderRadius: 10, padding: '16px 20px', animation: 'fadeUp 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ background: m.color + '20', color: m.color, borderRadius: 7, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{m.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{m.name}</span>
                    <span style={{ ...S.badge(m.color), fontSize: 10 }}>{m.unit}</span>
                    <span style={{ fontSize: 11, color: m.lowerBetter ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{m.lowerBetter ? '(v) valor baix = millor' : '(^) valor alt = millor'}</span>
                  </div>
                  {/* Multi-line detail text (pre-line preserves newlines in the template literal) */}
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, whiteSpace: 'pre-line' }}>{m.detail}</p>
                  {/* Formula displayed in monospace with brand color */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: m.color, background: m.color + '10', padding: '6px 12px', borderRadius: 6, display: 'inline-block', border: `1px solid ${m.color}25` }}>
                    {m.formula}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Scoring system explanation section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              Sistema de puntuació (0–100)
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              La <strong style={{ color: 'var(--text-primary)' }}>Puntuació</strong> és un valor de 0 a 100 que resumeix el rendiment de l'escenari <em>en relació al format de dades que s'està provant</em>. Cada format prioritza mètriques diferents perquè les seves necessitats reals ho justifiquen:
            </p>
            {/* Composite score formula displayed in a styled monospace block */}
            <div style={{ marginBottom: 14, padding: '10px 16px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>Score</span> = (<span style={{ color: '#f59e0b' }}>latencia_norm</span> x w_lat + <span style={{ color: '#22c55e' }}>throughput_norm</span> x w_tput + <span style={{ color: '#ef4444' }}>error_norm</span> x w_err + <span style={{ color: '#06b6d4' }}>P50_norm</span> x w_p50 + <span style={{ color: '#8b5cf6' }}>P99_norm</span> x w_p99) x <span style={{ color: '#ef4444' }}>penalitzacio_error</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              On cada metrica es <strong>normalitza</strong> entre 0 i 1 respecte a tots els escenaris comparats (el millor obte 1.0, el pitjor 0.0). Aixo fa que la puntuacio sigui sempre <em>relativa</em>: si tots els escenaris van molt malament, el millor d'ells seguira tenint 100 punts.
            </p>

            {/* Per-format weight bar charts - one card per FORMAT_WEIGHTS entry */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
              {Object.entries(FORMAT_WEIGHTS).map(([fmt, weights]) => {
                const label = DATA_FORMAT_LABELS[fmt] || fmt;
                const color = DATA_FORMAT_COLORS[fmt] || '#6b7280';
                // Build the weight list for display - filter out zero-weight entries
                const allWeights = [
                  { name: 'Latencia',   w: weights.lat,  c: '#f59e0b' },
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
                    {/* Horizontal bar for each metric weight - width is proportional to weight value */}
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

            {/* Per-format narrative description */}
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Per format:</strong>{' '}
              <strong>Per defecte</strong> usa pesos equilibrats (referencia base, cap optimitzacio especifica).{' '}
              <strong>Video 4K/8K</strong> maximitza throughput (40%) i penalitza errors d'1 2% o mes. Els talls de reproduccio s'aprecien immediatament.{' '}
              <strong>Financer</strong> penalitza errors durament (40%). Una transaccio erronea es un problema real.{' '}
              <strong>IoT</strong> equilibra throughput alt i tolerancia moderada a errors, ja que s'assumeix redundancia de sensors.
            </p>
          </div>

          {/* Error penalty explanation box */}
          <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Penalitzacio exponencial per errors</div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Si la taxa d'error supera el <strong>0.1%</strong>, s'aplica una penalitzacio exponencial a la puntuacio final: <code style={{ background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>penalitzacio = 1 - min(1, errorRate x 10)</code>.
              Aixo garanteix que un sistema rapid pero inestable no obtingui una bona puntuacio. Un 10% d'error fa que la puntuacio sigui 0 independentment de les altres metriques.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// FairComparisonPanel - methodological transparency panel
// ---------------------------------------------------------------------------

/**
 * FairComparisonPanel - collapsible info box documenting the fair-comparison
 * contract enforced by the load-generator.
 *
 * The benchmark treats Kafka, Confluent, NATS and RabbitMQ symmetrically:
 * fire-and-forget producers, single partition / no persistence / no ack,
 * warm-up window, percentile-based latency reporting. Residual differences
 * (pull vs push) are intrinsic to the protocol, not the benchmark config.
 *
 * Placed directly below MetricGlossary so readers have methodology context
 * before reading the numbers. Collapsed by default to keep the first render
 * lightweight.
 */
const FairComparisonPanel = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...S.card, marginBottom: 20, borderLeft: '3px solid #0ea5e9', padding: '16px 20px' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#0ea5e9' }}><IconInfo /></span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Metodologia — comparació justa entre plataformes</span>
        </div>
        <IconChevron open={open} />
      </button>

      {open && (
        <div style={{ marginTop: 18, animation: 'fadeUp 0.3s ease' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Totes les plataformes s'executen sota un <strong style={{ color: 'var(--text-primary)' }}>contracte de comparació</strong> que
            neutralitza les diferències de configuració. Les variacions que veus als resultats reflecteixen el protocol en sí, no
            avantatges artificials d'un broker sobre un altre.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
            {/* Card 1: Contracte d'equitat */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ background: '#22c55e20', color: '#22c55e', borderRadius: 6, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>=</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Contracte d'equitat</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Productors <em>fire-and-forget</em> (Kafka <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>acks=0</code>, NATS Core, RabbitMQ sense publisher-confirms, consumer <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>noAck:true</code>). Una sola partició, sense persistència, un canal per run.
              </p>
            </div>

            {/* Card 2: Warm-up */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ background: '#f59e0b20', color: '#f59e0b', borderRadius: 6, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>~</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Finestra de warm-up (5 s)</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Els primers 5 segons de cada execució es descarten per ignorar el cost inicial de <em>session-setup</em> (JVM warm-up, TCP handshake, rebalance). Només els samples en <em>steady-state</em> compten per al score.
              </p>
            </div>

            {/* Card 3: Percentils */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ background: '#8b5cf620', color: '#8b5cf6', borderRadius: 6, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>P95</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>P50 / P95 / P99</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                La mitjana pot ocultar <em>tail latency</em>. P50 = típica, P95 = pitjor cas habitual, P99 = pitjor cas real. Una diferència gran entre P50 i P99 indica un sistema inestable, encara que la mitjana sembli bona.
              </p>
            </div>

            {/* Card 4: Pull vs Push */}
            <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ ...S.badge(DELIVERY_MODEL_META.pull.color), fontSize: 9 }}>pull</span>
                <span style={{ ...S.badge(DELIVERY_MODEL_META.push.color), fontSize: 9 }}>push</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginLeft: 2 }}>Model de lliurament</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                <strong style={{ color: DELIVERY_MODEL_META.pull.color }}>Kafka/Confluent</strong> són <em>pull</em> (el consumidor sondeja). <strong style={{ color: DELIVERY_MODEL_META.push.color }}>NATS/RabbitMQ</strong> són <em>push</em> (el broker empeny). Això afegeix ~1 ms de fetch-wait als pull, intrínsec al protocol — no a la configuració.
              </p>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'rgba(14, 165, 233, 0.06)', borderRadius: 8, border: '1px solid rgba(14, 165, 233, 0.22)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: '#0ea5e9' }}>Com llegir els números:</strong>{' '}
            una plataforma <em>pull</em> amb latència ~1 ms més alta que una <em>push</em> no és <em>pitjor</em> — és el tradeoff del seu model.
            Utilitza la puntuació adaptativa al format per decidir quina combinació encaixa millor amb el teu cas d'ús real.
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// HBarChart - horizontal bar chart component
// ---------------------------------------------------------------------------

/**
 * HBarChart - horizontal bar chart for metric comparison.
 *
 * Renders each scenario as a horizontal bar proportional to its metric value.
 * Features:
 * - Auto-sorts data with best value first (ascending for lower-is-better,
 *   descending for higher-is-better).
 * - Highlights the winner with a trophy icon and a shimmer shine animation.
 * - Hover dims non-hovered bars for focus.
 * - Shows value label inside the bar if bar is wide enough (>30% of max).
 *
 * Chart label badge: uses `(color || '#3b82f6') + '18'` for the background
 * and `color || '#3b82f6'` for the text. This ensures the "Menor es millor"
 * or "Major es millor" badge matches each chart's own line/bar color,
 * providing a visual connection between the label and the data.
 *
 * @param data        - Array of {label, value} pairs to render
 * @param title       - Chart title (displayed at top-left)
 * @param unit        - Unit suffix appended to numeric values (e.g. 'ms', '%')
 * @param color       - Brand color for bars and label badge
 * @param lowerIsBetter - If true, lower values sort first and earn the trophy
 */
const HBarChart = ({
  data, title, unit = '', color = '#3b82f6', lowerIsBetter = true,
}: {
  data: { label: string; value: number }[];
  title: string; unit?: string; color?: string; lowerIsBetter?: boolean;
}) => {
  // Track which bar index is hovered (-1 = none) to dim all other bars
  const [hovered, setHovered] = useState<number | null>(null);

  // Filter out NaN/non-numeric values that could break rendering
  const validData = data.filter(d => typeof d.value === 'number' && !isNaN(d.value));
  if (!validData.length) return (
    <div style={{ textAlign: 'center', color: 'var(--text-disabled)', padding: '20px 0', fontSize: 13 }}>Sense dades</div>
  );

  // Use absolute value for bar width computation; prevents negative bars
  const max = Math.max(...validData.map(d => Math.abs(d.value)), 0.001); // Prevent division by zero
  // Sort best-first so the winner always appears at the top
  const sorted = [...validData].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  const bestValue = sorted[0]?.value;

  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</h3>
        {/*
          Label badge color matches the chart's own color prop.
          Previously this was a hardcoded color; changed to use the color prop
          so each chart's badge visually matches its bars.
          Background: color + '18' = 9.4% opacity (hex 0x18 = 24, 24/255 ~ 9.4%)
        */}
        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: (color || '#3b82f6') + '18', color: color || '#3b82f6', fontWeight: 700 }}>
          {lowerIsBetter ? 'Menor és millor' : 'Major és millor'}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        {/* Subtle vertical reference grid lines at 0%, 25%, 50%, 75%, 100% */}
        <div style={{ position: 'absolute', inset: '0 0 0 110px', pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', opacity: 0.1 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 1, background: 'var(--text-primary)', height: '100%' }} />
          ))}
        </div>

        <div style={{ display: 'grid', gap: 14, paddingBottom: 10 }}>
          {sorted.map((item, i) => {
            // Clamp percentage to [0, 100] to handle edge cases
            const pct = Math.max(0, Math.min(100, (Math.abs(item.value) / max) * 100));
            const isHovered = hovered === i;
            // Only i===0 can be the winner since data is pre-sorted
            const isWinner = item.value === bestValue && i === 0;

            // Gradient bar: slightly lighter at left, full color at right
            const bgGradient = `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`;
            // Stronger shadow on hover; subtle glow on winner
            const shadow = isHovered ? `0 4px 12px ${color}40` : (isWinner ? `0 2px 8px ${color}25` : 'none');

            return (
              <div key={item.label}
                style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, cursor: 'default', transition: 'opacity 0.15s', opacity: hovered !== null && !isHovered ? 0.65 : 1 }}
                onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>

                {/* Label column - truncates long names with ellipsis */}
                <div style={{ width: 130, fontSize: 12, fontWeight: isWinner ? 700 : 400, color: isHovered ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }} title={item.label}>
                  {isWinner && <span style={{ color: '#f59e0b', marginRight: 4 }}><IconTrophy /></span>}
                  {item.label}
                </div>

                {/* Bar track - full width container */}
                <div style={{ flex: 1, height: 22, background: 'var(--bg-hover)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  {/* Filled bar - width driven by percentage of max value */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${pct}%`, background: bgGradient, borderRadius: 4,
                    transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    boxShadow: shadow
                  }}>
                    {/* Inline value label - only shown when bar is wide enough to avoid overflow */}
                    {pct > 30 && (
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, color: 'white', fontFamily: 'var(--font-mono)' }}>
                        {item.value.toFixed(1)}{unit}
                      </span>
                    )}
                    {/* Animated shine overlay on the winning bar */}
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

                {/* Numeric value column - monospace for alignment across rows */}
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

// ---------------------------------------------------------------------------
// LiveLineChart - real-time sparkline chart
// ---------------------------------------------------------------------------

/**
 * LiveLineChart - SVG-based sparkline chart for streaming metric data.
 *
 * Renders a polyline over a gradient fill area. Supports hover interaction:
 * hovering the SVG shows a crosshair and a dot at the cursor's data point.
 * When not hovering, the cursor is at the latest data point (right edge).
 *
 * The gradient ID is derived from the label to avoid SVG defs collisions
 * when multiple charts are rendered on the same page.
 *
 * @param data  - Array of numeric values in chronological order
 * @param color - Line/fill color
 * @param label - Metric name (also used as gradient ID base)
 * @param unit  - Unit suffix for the value display
 */
const LiveLineChart = ({ data, color = '#3b82f6', label, unit = '' }: {
  data: number[]; color?: string; label: string; unit?: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  // hovX: mouse X position in client coordinates (null = not hovering)
  const [hovX, setHovX] = useState<number | null>(null);

  // Require at least 2 points to draw a line
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', color: 'var(--text-disabled)', fontSize: 12, padding: '14px 0' }}>Esperant dades...</div>
  );

  // Fixed SVG viewport dimensions - scales to parent via width="100%"
  const W = 480, H = 80;
  const max = Math.max(...data, 0.01), min = Math.min(...data, 0);
  const range = max - min || max; // Prevent zero range if all values are equal

  // Map data index to SVG X coordinate (with 10px padding each side)
  const px = (i: number) => (i / (data.length - 1)) * (W - 20) + 10;
  // Map data value to SVG Y coordinate (inverted: higher value = lower Y)
  const py = (v: number) => H - 8 - ((v - min) / range) * (H - 16);

  // Polyline points for the line stroke
  const pts = data.map((v, i) => `${px(i)},${py(v)}`).join(' ');
  // Polygon points for the filled area under the line
  const fillPts = [`${px(0)},${H}`, ...data.map((v, i) => `${px(i)},${py(v)}`), `${px(data.length - 1)},${H}`].join(' ');

  // Sanitize label for use as SVG gradient ID (no spaces or special chars)
  const gradId = 'lg-' + label.replace(/\s+/g, '').replace(/[^a-zA-Z0-9-]/g, '');

  // Convert hover client X to data array index
  let hovIdx: number | null = null;
  if (hovX !== null && svgRef.current) {
    const rect = svgRef.current.getBoundingClientRect();
    hovIdx = Math.round(((hovX - rect.left) * (W / rect.width) - 10) / (W - 20) * (data.length - 1));
    hovIdx = Math.max(0, Math.min(data.length - 1, hovIdx));
  }

  // Display the hovered data point value, or the latest value when not hovering
  const curVal = hovIdx !== null ? data[hovIdx] : data[data.length - 1];
  const curX = hovIdx !== null ? px(hovIdx) : px(data.length - 1);
  const curY = hovIdx !== null ? py(curVal) : py(data[data.length - 1]);

  return (
    <div>
      {/* Header row: metric label on left, current value on right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 800, color, letterSpacing: '-0.02em' }}>{curVal.toFixed(2)}{unit}</span>
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: 'visible', display: 'block', cursor: 'crosshair' }}
        onMouseMove={e => setHovX(e.clientX)} onMouseLeave={() => setHovX(null)}
      >
        <defs>
          {/* Vertical gradient: semi-transparent at top, nearly invisible at bottom */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Fill area under the line */}
        <polygon points={fillPts} fill={`url(#${gradId})`} />
        {/* Line stroke */}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Hover crosshair: vertical dashed line + dot at data point */}
        {hovX !== null && hovIdx !== null && (
          <>
            <line x1={curX} y1={0} x2={curX} y2={H} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />
            <circle cx={curX} cy={curY} r={4} fill={color} stroke="var(--bg-card)" strokeWidth="2" />
          </>
        )}
        {/* Trailing dot at the latest value - fades out while hovering */}
        <circle cx={px(data.length - 1)} cy={py(data[data.length - 1])} r={3} fill={color} opacity={hovX === null ? 1 : 0.3} />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Chip - filter chip button
// ---------------------------------------------------------------------------

/**
 * Chip - a toggleable filter chip for the filter bar.
 * Delegates styling to S.chip(active, color) from the theme.
 *
 * @param label   - Text label displayed in the chip
 * @param active  - Whether this chip is currently selected
 * @param onClick - Called when the chip is clicked
 * @param color   - Optional brand color for active state
 */
const Chip = ({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) => (
  <button onClick={onClick} style={{ ...S.chip(active, color), fontSize: 12 }}>{label}</button>
);

// ---------------------------------------------------------------------------
// ScoreRing - circular SVG score indicator
// ---------------------------------------------------------------------------

/**
 * ScoreRing - a circular progress ring that visualizes a 0-100 score.
 *
 * Uses SVG stroke-dasharray to draw an arc proportional to the score value.
 * The arc starts at the top (offset = circumference/4 to rotate 90deg CCW).
 * Color is determined by scoreColor() - green/amber/red based on thresholds.
 *
 * @param score - Score value 0-100
 * @param size  - Outer diameter in px (default 36)
 */
const ScoreRing = ({ score, size = 36 }: { score: number; size?: number }) => {
  const r = (size - 4) / 2; // Inner radius with 2px stroke padding each side
  const circ = 2 * Math.PI * r; // Full circumference
  const dash = (score / 100) * circ; // Arc length for the score
  const col = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Background track ring */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      {/* Score arc - animates when score changes via CSS transition */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4} // Start arc at top (12 o'clock position)
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* Score number centered in the ring */}
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={col} fontFamily="var(--font-mono)">{score}</text>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// HistorialTab - historical comparison view
// ---------------------------------------------------------------------------

/**
 * HistorialTab - aggregated benchmark history and multi-scenario comparison.
 *
 * Data flow:
 *   1. Fetches /metrics/summary from the metrics API.
 *      - This endpoint queries Elasticsearch and returns one document per
 *        runId (as of the recent change from grouping by scenarioId).
 *      - Each document contains avgLatency, avgThroughput, avgErrorRate,
 *        p50Latency, p99Latency, count, and benchmark metadata.
 *   2. Fetches /scenarios from the scenario service for display names.
 *      - Scenarios are keyed by id and used to enrich summary data with
 *        human-readable names and config fields not stored in metrics.
 *
 * Key architectural fix (history visibility after orchestrator restart):
 *   Previously: syncedSummary = summary.filter(s => runIds.has(s.runId))
 *     This filtered Elasticsearch data against the orchestrator's in-memory
 *     run list. After any pod restart, the orchestrator loses all run state,
 *     making runIds an empty set and causing the history to appear empty.
 *   Now: syncedSummary = summary (no filter)
 *     Elasticsearch is the authoritative source of truth for historical data.
 *     The orchestrator's /runs endpoint is only used in LiveTab for active runs.
 *
 * Filter system:
 *   - Primary filter: data format (always visible, most commonly used)
 *   - Secondary filters: protocol, platform, architecture (collapsible)
 *   - Filters are applied client-side to the full summary dataset
 *
 * Scoring:
 *   - computeScores() is called on filteredSummary (not syncedSummary) so
 *     scores are relative to the currently visible set. This means enabling
 *     a filter can change scores - intentional, since you're comparing
 *     a different peer group.
 *   - scoreMap uses `b.runId || b.scenarioId` for sorting to match the key
 *     used when building the map in computeScores().
 */
const HistorialTab = () => {
  // Raw summary data from /metrics/summary (Elasticsearch aggregations)
  const [summary, setSummary] = useState<any[]>([]);
  // Scenario definitions from /scenarios (for display names and metadata)
  const [scenarios, setScenarios] = useState<any[]>([]);
  // Known runs from the orchestrator (/runs). Used to intersect the ES
  // summary and hide orphans from Elasticsearch that no longer correspond
  // to a run the orchestrator remembers. When the list is empty (orchestrator
  // unreachable OR freshly restarted with no new runs) we fall back to
  // showing raw ES data — better stale history than none.
  const [knownRuns, setKnownRuns] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Client-side computed percentiles, keyed by runId. Populated lazily by
  // fetching /metrics?runId=X for runs that lack p50Latency/p99Latency in the
  // summary response. See the useEffect below for details.
  const [percentileMap, setPercentileMap] = useState<Record<string, { p50: number | null; p95: number | null; p99: number | null }>>({});

  // Filter state - each is an array of selected values (empty = no filter)
  const [filterPlatform, setFilterPlatform] = useState<string[]>([]);
  const [filterProtocol, setFilterProtocol] = useState<string[]>([]);
  const [filterArch, setFilterArch] = useState<string[]>([]);
  const [filterDataFormat, setFilterDataFormat] = useState<string[]>([]);

  // Time range filter: hides runs older than the selected duration.
  // Default "24h" avoids showing weeks of old data that inflate the history.
  // Key maps to milliseconds; 'all' disables the filter entirely.
  const [filterTimeRange, setFilterTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('24h');

  // Controls visibility of the secondary filters (protocol/platform/arch)
  const [filtersOpen, setFiltersOpen] = useState(false);

  /**
   * Fetches both summary and scenario data in parallel.
   * Gracefully handles API errors by defaulting to empty arrays,
   * so a broken scenarios endpoint doesn't prevent history from loading.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, scRes, runsRes] = await Promise.all([
        fetch(`${METRICS_BASE}/metrics/summary`).then(r => r.json()).catch(() => []),
        fetch(`${SCENARIOS_BASE}/scenarios`).then(r => r.json()).catch(() => []),
        // `null` signals "orchestrator unreachable" so we can distinguish
        // that from "reachable but returned empty list".
        fetch(`${ORCHESTRATOR}/runs`).then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      setSummary(Array.isArray(sumRes) ? sumRes : []);
      setScenarios(Array.isArray(scRes) ? scRes : []);
      setKnownRuns(Array.isArray(runsRes) ? runsRes : null);
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // -------------------------------------------------------------------------
  // Client-side percentile fallback.
  //
  // The /metrics/summary endpoint is supposed to return server-computed
  // p50Latency and p99Latency via Elasticsearch percentiles aggregation.
  // In practice these fields are frequently missing (backend aggregation
  // not populated, field renamed, etc.), which causes the table P50/P99
  // columns to show "-".
  //
  // Fix: for any run whose summary doc lacks p50Latency/p99Latency, fetch
  // its raw metrics by runId and compute the percentiles client-side.
  // Results are cached in `percentileMap` keyed by runId so each run is
  // only fetched once per page load.
  //
  // Performance: runs are fetched in parallel batches of 6 to avoid
  // hammering the metrics-api with dozens of simultaneous requests.
  // Runs without a runId (very old data) are skipped.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (summary.length === 0) return;
    // Only fetch percentiles for runs that need them and haven't been
    // fetched yet. This makes the effect idempotent across re-renders.
    const runsNeedingPercentiles = summary.filter(s => {
      const rid = s.runId;
      if (!rid) return false; // no stable key
      if (percentileMap[rid]) return false; // already computed
      if (s.p50Latency != null && s.p95Latency != null && s.p99Latency != null) return false; // server provided
      return true;
    });
    if (runsNeedingPercentiles.length === 0) return;

    let cancelled = false;
    const BATCH_SIZE = 6;

    const run = async () => {
      for (let i = 0; i < runsNeedingPercentiles.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = runsNeedingPercentiles.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(async (s: any) => {
          try {
            const data = await fetch(`${METRICS_BASE}/metrics?runId=${s.runId}`).then(r => r.json()).catch(() => null);
            if (!Array.isArray(data) || data.length === 0) return { runId: s.runId, p50: null, p95: null, p99: null };
            const latencies = data.map((m: any) => m.latency ?? m.avgLatency ?? 0).filter((v: number) => v > 0);
            return {
              runId: s.runId,
              p50: computePercentile(latencies, 50),
              p95: computePercentile(latencies, 95),
              p99: computePercentile(latencies, 99),
            };
          } catch (_) {
            return { runId: s.runId, p50: null, p95: null, p99: null };
          }
        }));
        if (cancelled) return;
        // Merge the batch into percentileMap incrementally so the UI updates
        // progressively as each batch completes (instead of waiting for all).
        setPercentileMap(prev => {
          const next = { ...prev };
          for (const r of results) next[r.runId] = { p50: r.p50, p95: r.p95, p99: r.p99 };
          return next;
        });
      }
    };
    run();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  // Build lookup maps from scenario arrays for O(1) access by id
  const scenarioMap = Object.fromEntries(scenarios.map((s: any) => [s.id, s]));
  const nameMap = Object.fromEntries(scenarios.map((s: any) => [s.id, s.name || s.id?.slice(0, 10)]));

  // History source. Two-tier strategy to give the user "historial = execucions"
  // semantics without emptying the history after every orchestrator restart:
  //
  //   1. If the orchestrator's /runs endpoint returns a NON-EMPTY list, we
  //      intersect the ES summary with it by runId. Runs that are only in
  //      Elasticsearch (orphans from a previous orchestrator incarnation)
  //      are hidden - user sees only runs the orchestrator actually tracked.
  //
  //   2. If /runs is unreachable (null) OR returned an empty list, we show
  //      the raw ES summary. This covers: orchestrator just restarted (state
  //      lost but history shouldn't vanish), orchestrator unreachable, or
  //      genuinely no runs (both lists empty → nothing shown anyway).
  const syncedSummary = (knownRuns && knownRuns.length > 0)
    ? (() => {
        const ids = new Set(knownRuns.map((r: any) => r.id || r.runId).filter(Boolean));
        return summary.filter(s => s.runId && ids.has(s.runId));
      })()
    : summary;

  /**
   * Resolves the data format for a summary item.
   * Prefers the format stored in the metrics document itself (set at run time),
   * falls back to the scenario definition, then defaults to 'default'.
   */
  const dataFormatOf = (s: any): string =>
    s.dataFormat || scenarioMap[s.scenarioId]?.dataFormat || 'default';

  // Derive unique filter option values from the full (unfiltered) summary set
  const availPlatforms = [...new Set(syncedSummary.map((s: any) => normalizePlatform(s.platform || s.broker) || '').filter(Boolean))];
  const availProtocols = [...new Set(syncedSummary.map((s: any) => s.protocol || '').filter(Boolean))];
  const availArchs = [...new Set(syncedSummary.map((s: any) => s.architecture || '').filter(Boolean))];
  const availDataFormats = [...new Set(syncedSummary.map(dataFormatOf).filter(Boolean))];

  /**
   * Toggles a value in a filter list - adds if not present, removes if present.
   * Used by Chip onClick handlers.
   */
  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  // Time-range cutoff. Runs whose latest activity is older than this
  // are hidden. `startedAt` / `timestamp` / `lastSampleAt` field names
  // are checked in that priority order.
  const rangeMs: Record<string, number | null> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    'all': null,
  };
  const timeCutoff = rangeMs[filterTimeRange] != null ? Date.now() - (rangeMs[filterTimeRange] as number) : null;

  // Apply all active filters to the full summary set
  const filteredSummary = syncedSummary.filter(s => {
    const platform = normalizePlatform(s.platform || s.broker) || '';
    if (filterPlatform.length && !filterPlatform.includes(platform)) return false;
    if (filterProtocol.length && !filterProtocol.includes(s.protocol || '')) return false;
    if (filterArch.length && !filterArch.includes(s.architecture || '')) return false;
    if (filterDataFormat.length && !filterDataFormat.includes(dataFormatOf(s))) return false;
    if (timeCutoff != null) {
      // Prefer endedAt (real run end) → startedAt → lastSampleAt → raw timestamp.
      // metrics-api now populates endedAt/startedAt via min/max ts aggs.
      const raw = s.endedAt ?? s.startedAt ?? s.lastSampleAt ?? s.timestamp ?? s['@timestamp'];
      if (raw != null && raw !== '') {
        const t = typeof raw === 'number' ? raw : new Date(raw).getTime();
        if (isFinite(t) && t < timeCutoff) return false;
      }
    }
    return true;
  });

  // Total count of active filter selections across all filter groups.
  // Time range counts if not 'all' (the default '24h' DOES count so the
  // user sees there is an active filter hiding older data).
  const activeFilters = filterPlatform.length + filterProtocol.length + filterArch.length + filterDataFormat.length + (filterTimeRange !== 'all' ? 1 : 0);
  const clearFilters = () => {
    setFilterPlatform([]); setFilterProtocol([]); setFilterArch([]);
    setFilterDataFormat([]); setFilterTimeRange('all');
  };

  // Compute per-run scores for the filtered set.
  // `percentileMap` is used as a fallback when the server summary lacks
  // p50Latency/p99Latency fields (see the percentile-fetching effect above).
  // computeScores prefers s.p50Latency if present, falls back to map[runId].
  const scoreMap = computeScores(filteredSummary, percentileMap, dataFormatOf);

  // Sort filtered scenarios by score descending - best first
  // Key uses runId first (new per-run grouping), fallback to scenarioId (legacy)
  const sorted = [...filteredSummary].sort((a, b) =>
    (scoreMap.get(b.runId || b.scenarioId) ?? 0) - (scoreMap.get(a.runId || a.scenarioId) ?? 0)
  );
  // The top-sorted item is the overall winner
  const best = sorted[0];

  // Prepare chart data - each chart is independently sorted by its own metric
  // so that the best performer for THAT metric always appears at the top.

  // Latency chart: ascending (lower = better)
  const latData = [...filteredSummary]
    .sort((a, b) => (a.avgLatency ?? 9999) - (b.avgLatency ?? 9999))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgLatency ?? 0 }));

  // Throughput chart: descending (higher = better)
  const tputData = [...filteredSummary]
    .sort((a, b) => (b.avgThroughput ?? 0) - (a.avgThroughput ?? 0))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgThroughput ?? 0 }));

  // Error rate chart: ascending (lower = better)
  const errData = [...filteredSummary]
    .sort((a, b) => (a.avgErrorRate ?? 0) - (b.avgErrorRate ?? 0))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgErrorRate ?? 0 }));

  // Show skeleton loading state while data is being fetched
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
      {/* Educational glossary panel - collapsed by default */}
      <MetricGlossary />

      {/* Fair-comparison methodology panel - documents the contract enforced
          by the load-generator (fire-and-forget, warm-up, pull-vs-push). */}
      <FairComparisonPanel />

      {/* Filter bar */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        {/* Time range filter - primary filter to hide old runs. Default 24h
            prevents the table from showing weeks of test data. */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Periode
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { v: '1h' as const, l: 'Ultima hora' },
              { v: '24h' as const, l: 'Ultimes 24h' },
              { v: '7d' as const, l: 'Ultims 7 dies' },
              { v: 'all' as const, l: 'Tot' },
            ]).map(opt => (
              <Chip
                key={opt.v}
                label={opt.l}
                active={filterTimeRange === opt.v}
                color="#06b6d4"
                onClick={() => setFilterTimeRange(opt.v)}
              />
            ))}
          </div>
        </div>

        {/* Data format filter - always visible (primary filter, most commonly used) */}
        {availDataFormats.length > 0 && (
          <div style={{ marginBottom: filtersOpen || availDataFormats.length > 0 ? 14 : 0, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
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

        {/* Divider + toggle button for secondary filters (protocol, platform, arch) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: availDataFormats.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: availDataFormats.length > 0 ? 14 : 0 }}>
          <button
            onClick={() => setFiltersOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}
          >
            <IconFilter />
            Més filtres (Protocol, Plataforma, Arquitectura)
            {/* Show active secondary filter count as a badge */}
            {(filterPlatform.length + filterProtocol.length + filterArch.length) > 0 && (
              <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 17, height: 17, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {filterPlatform.length + filterProtocol.length + filterArch.length}
              </span>
            )}
            <IconChevron open={filtersOpen} />
          </button>

          {/* Right side: filter count + clear + refresh buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Show filtered count when a filter is active */}
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

        {/* Secondary filters - collapsible (protocol, platform, architecture) */}
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

      {/* Empty state: no runs have been recorded in Elasticsearch yet */}
      {syncedSummary.length === 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 64 }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><IconBarChart /></div>
          <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>Encara no hi ha resultats</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            Executa escenaris per veure les comparatives aqui.{' '}
            <a href="/escenaris" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Anar a Escenaris</a>
          </div>
        </div>
      )}

      {/* Empty state: runs exist but all are filtered out by the active filters */}
      {filteredSummary.length === 0 && syncedSummary.length > 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Cap resultat coincideix amb els filtres actuals.</div>
        </div>
      )}

      {filteredSummary.length > 0 && (
        <>
          {/* Summary stat cards: run count + best performer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 20 }}>
            {/* Run count card */}
            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#3b82f614', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, fontFamily: 'var(--font)' }}>
                {filteredSummary.length}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Escenaris comparats</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{filteredSummary.length} escenari{filteredSummary.length !== 1 ? 's' : ''} - puntuacio format-aware</div>
              </div>
            </div>

            {/* Best scenario card - highlighted with a subtle green gradient */}
            {best && (
              <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(34,197,94,0.04) 100%)', borderColor: 'rgba(34,197,94,0.25)' }}>
                {/* Score ring uses runId || scenarioId to match the scoreMap key */}
                <ScoreRing score={scoreMap.get(best.runId || best.scenarioId) ?? 0} size={52} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: '#f59e0b' }}><IconAward /></span>
                    <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Millor escenari (multi-factor)</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                    {nameMap[best.scenarioId] || best.scenarioId?.slice(0, 16) || '-'}
                  </div>
                  {/* Badges showing best scenario's metadata */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                    {best.protocol && <span style={{ ...S.badge(PROTOCOL_COLORS[best.protocol] || '#16a34a'), fontSize: 10 }}>{best.protocol}</span>}
                    {best.architecture && <span style={{ ...S.badge(ARCHITECTURE_COLORS[best.architecture] || '#2563eb'), fontSize: 10 }}>{best.architecture}</span>}
                    {(() => { const p = normalizePlatform(best.platform || best.broker); return p ? <span style={{ ...S.badge(PLATFORM_COLORS[p] || '#d97706'), fontSize: 10 }}>{p}</span> : null; })()}
                    {(() => { const df = dataFormatOf(best); return <span style={{ ...S.badge(DATA_FORMAT_COLORS[df] || '#64748b'), fontSize: 10 }}>{DATA_FORMAT_LABELS[df] || df}</span>; })()}
                    {(() => {
                      const dm = deliveryModelOf(best);
                      if (!dm) return null;
                      const meta = DELIVERY_MODEL_META[dm];
                      return <span style={{ ...S.badge(meta.color), fontSize: 10 }}>{meta.label}</span>;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metric bar charts - always horizontal layout */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Rendiment Metric</div>
            {/* Latency and throughput side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ ...S.card }}>
                <HBarChart data={latData} title="Latència mitjana (ms)" unit="ms" color="#f59e0b" lowerIsBetter />
              </div>
              <div style={{ ...S.card }}>
                <HBarChart data={tputData} title="Throughput mitja (msg/s)" unit="" color="#22c55e" lowerIsBetter={false} />
              </div>
            </div>
            {/* Error rate full-width below */}
            <div style={{ ...S.card, marginBottom: 20 }}>
              <HBarChart data={errData} title="Taxa d'error mitjana (%)" unit="%" color="#ef4444" lowerIsBetter />
            </div>
          </div>

          {/* Full comparison table */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Taula comparativa completa</span>
              <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>{sorted.length} escenaris - puntuacio format-aware (0-100)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {/*
                Compact table CSS: overrides default cell padding with tighter values.
                The !important is needed to override Backstage's base table styles.
                7px vertical, 8px horizontal gives a denser table without feeling cramped.
              */}
              <style>{`.cmp-tbl th,.cmp-tbl td{padding:7px 8px!important}`}</style>
              <table className="cmp-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={S.tableHeader}>
                    <th style={S.th}>Escenari</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>Puntuació</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Lat. avg</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>P50</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>P95</th>
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
                    const isBest = i === 0; // First row = highest score = best
                    const sc = scenarioMap[s.scenarioId];
                    // Prefer metadata from the summary doc (stored at run time),
                    // fall back to the scenario definition for older data
                    const arch = s.architecture || sc?.architecture || '';
                    const proto = s.protocol || sc?.protocol || '';
                    const platform = normalizePlatform(s.platform || s.broker || sc?.platform || sc?.broker);
                    const platColor = PLATFORM_COLORS[platform] || 'var(--text-secondary)';
                    const df = dataFormatOf(s);
                    const dfColor = DATA_FORMAT_COLORS[df] || '#64748b';

                    // P50/P95/P99 resolution order:
                    //   1. Server-side aggregation (s.p50Latency / s.p95Latency / s.p99Latency)
                    //   2. Client-side fallback (percentileMap[runId]) - populated
                    //      by the effect that fetches raw metrics when the server
                    //      summary is missing percentile fields.
                    //   3. null -> renders as "-" in the table.
                    const pm = percentileMap[s.runId] || percentileMap[s.scenarioId];
                    const p50Val = s.p50Latency ?? pm?.p50 ?? null;
                    const p95Val = s.p95Latency ?? pm?.p95 ?? null;
                    const p99Val = s.p99Latency ?? pm?.p99 ?? null;
                    // Are we still loading the client-side fallback for this row?
                    const percentilesLoading =
                      s.p50Latency == null && s.p95Latency == null && s.p99Latency == null && !pm && !!s.runId;

                    // Use runId || scenarioId as scoreMap key (matches computeScores)
                    const score = scoreMap.get(s.runId || s.scenarioId) ?? 0;
                    const errRate = s.avgErrorRate ?? 0;

                    return (
                      <tr key={i} style={{ ...S.tableRow, background: isBest ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                        {/* Scenario name + data format sub-label */}
                        <td style={{ ...S.td, fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isBest && <span style={{ color: '#f59e0b', flexShrink: 0 }}><IconTrophy /></span>}
                            <div title={nameMap[s.scenarioId] || s.scenarioId} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nameMap[s.scenarioId] || s.scenarioId?.slice(0, 12) || '-'}
                            </div>
                          </div>
                          {/* Data format shown as a colored sub-label below the scenario name */}
                          <div style={{ fontSize: 10, color: dfColor, fontWeight: 600, marginTop: 2 }}>{DATA_FORMAT_LABELS[df] || df}</div>
                        </td>

                        {/* Score column - circular ring visualization */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <ScoreRing score={score} size={32} />
                          </div>
                        </td>

                        {/* Average latency - amber color to match the latency chart */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f59e0b' }}>
                          {s.avgLatency != null ? <>{s.avgLatency.toFixed(2)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-disabled)' }}>ms</span></> : '-'}
                        </td>

                        {/* P50 - cyan color. Shows "..." while the client-side
                            fallback fetches raw metrics, then the value. */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#3b82f6' }}>
                          {p50Val != null
                            ? <>{p50Val.toFixed(2)}<span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>ms</span></>
                            : <span style={{ color: 'var(--text-disabled)' }}>{percentilesLoading ? '...' : '-'}</span>}
                        </td>

                        {/* P95 - violet (common-worst-case indicator). Same fallback
                            semantics as P50/P99. */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8b5cf6' }}>
                          {p95Val != null
                            ? <>{p95Val.toFixed(2)}<span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>ms</span></>
                            : <span style={{ color: 'var(--text-disabled)' }}>{percentilesLoading ? '...' : '-'}</span>}
                        </td>

                        {/* P99 - purple (worst-case indicator). Same fallback
                            semantics as P50. */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#7c3aed' }}>
                          {p99Val != null
                            ? <>{p99Val.toFixed(2)}<span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>ms</span></>
                            : <span style={{ color: 'var(--text-disabled)' }}>{percentilesLoading ? '...' : '-'}</span>}
                        </td>

                        {/* Throughput - green to match the throughput chart */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#22c55e' }}>
                          {s.avgThroughput?.toFixed(1) ?? '-'}
                        </td>

                        {/* Error rate - red when above 0.1% threshold (score penalty applies) */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: errRate > 0.1 ? '#ef4444' : 'var(--text-secondary)' }}>
                          {s.avgErrorRate?.toFixed(3) ?? '-'}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-disabled)' }}>%</span>
                        </td>

                        {/* Sample count - how many metric data points contributed to this aggregate */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)' }}>
                          {s.count ?? '-'}
                        </td>

                        {/* Architecture badge */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {arch ? <span style={{ ...S.badge(ARCHITECTURE_COLORS[arch] || '#2563eb'), fontSize: 11 }}>{arch}</span>
                            : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </td>

                        {/* Protocol badge */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {proto ? <span style={{ ...S.badge(PROTOCOL_COLORS[proto] || '#16a34a'), fontSize: 11 }}>{proto}</span>
                            : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </td>

                        {/* Platform badge + delivery-model sub-label.
                            Delivery model (pull/push) is shown as a small
                            sub-label below the platform, keeping the column
                            count unchanged and avoiding horizontal overflow. */}
                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {platform ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{platform}</span>
                            : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                          {(() => {
                            const dm = deliveryModelOf(s);
                            if (!dm) return null;
                            const meta = DELIVERY_MODEL_META[dm];
                            return (
                              <div style={{ marginTop: 3, display: 'flex', justifyContent: 'center' }}>
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: meta.bg, color: meta.color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                  {meta.label}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Table footer: scoring methodology note */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-disabled)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Puntuació 0–100 normalitzada — pesos adaptats al format de dades (financer: error ×40%, vídeo: throughput ×40%, IoT: throughput ×30%)</span>
              <span>P50/P95/P99: calculats de les metriques en brut - <span style={{ fontStyle: 'italic' }}>-</span> = sense dades suficients</span>
              <span>
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: DELIVERY_MODEL_META.pull.bg, color: DELIVERY_MODEL_META.pull.color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>pull</span>
                <span style={{ margin: '0 4px' }}>/</span>
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: DELIVERY_MODEL_META.push.bg, color: DELIVERY_MODEL_META.push.color, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>push</span>
                <span style={{ marginLeft: 6 }}>= model de lliurament (pull afegeix ~1 ms de fetch-wait, intrínsec al protocol)</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// RunCard - scenario card for the Live tab picker
// ---------------------------------------------------------------------------

/**
 * RunCard - selectable card representing an active or pending benchmark run.
 *
 * Rendered in a horizontal scrollable row at the top of LiveTab.
 * Shows run status (running = green pulsing dot, pending = amber),
 * scenario name, and metadata badges (protocol, architecture, platform, format).
 *
 * Change: dataFormat badge is now shown for ALL formats (including 'default').
 * Previously it had a `run.dataFormat !== 'default'` condition that hid the
 * badge for the default format. Removed so users always see what format is
 * being used, even when it is the default.
 *
 * @param run      - Run object from the orchestrator /runs endpoint
 * @param selected - Whether this card is the currently selected run
 * @param onClick  - Called when the card is clicked to select this run
 */
const RunCard = ({
  run, selected, onClick,
}: {
  run: any; selected: boolean; onClick: () => void;
}) => {
  const isRunning = run.status === 'running';
  const isCompleted = run.status === 'completed';
  const platform = normalizePlatform(run.platform || run.broker);
  const platColor = PLATFORM_COLORS[platform] || '#7c3aed';
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        // Highlighted border when selected - uses accent color
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
        // Outer glow ring when selected for extra visual feedback
        boxShadow: selected ? '0 0 0 3px rgba(37,99,235,0.12)' : 'var(--shadow-sm)',
      }}
    >
      {/* Status dot + scenario name.
          Three states:
            - running   → green pulsing
            - completed → grey (static, final-state view)
            - pending   → amber (queued) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
          background: isRunning ? '#22c55e' : isCompleted ? '#94a3b8' : '#f59e0b',
          boxShadow: isRunning ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
          animation: isRunning ? 'pulseDot 1.8s ease infinite' : 'none',
          display: 'inline-block',
        }} />
        {/* Two-line clamp for long scenario names */}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
          {run.scenarioName || run.id?.slice(0, 14) || '-'}
        </span>
      </div>

      {/* Metadata badges */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {run.protocol && <span style={{ ...S.badge(PROTOCOL_COLORS[run.protocol] || '#16a34a'), fontSize: 10 }}>{run.protocol}</span>}
        {run.architecture && <span style={{ ...S.badge(ARCHITECTURE_COLORS[run.architecture] || '#2563eb'), fontSize: 10 }}>{run.architecture}</span>}
        {platform && <span style={{ ...S.badge(platColor), fontSize: 10 }}>{platform}</span>}
        {/*
          Data format badge: shown for ALL formats (including 'default').
          Previously had a `run.dataFormat !== 'default'` guard that hid
          the badge when format was 'default'. Removed so users always
          see what data format is being benchmarked.
        */}
        {run.dataFormat && (
          <span style={{ ...S.badge(DATA_FORMAT_COLORS[run.dataFormat] || '#64748b'), fontSize: 10 }}>{DATA_FORMAT_LABELS[run.dataFormat] || run.dataFormat}</span>
        )}
        {/* Delivery model badge (pull/push) — documents the protocol family
            so users understand residual latency differences between brokers. */}
        {(() => {
          const dm = deliveryModelOf(run);
          if (!dm) return null;
          const meta = DELIVERY_MODEL_META[dm];
          return <span style={{ ...S.badge(meta.color), fontSize: 10 }}>{meta.label}</span>;
        })()}
      </div>

      {/* Status text label below badges */}
      <div style={{ marginTop: 8, fontSize: 11, color: isRunning ? '#22c55e' : isCompleted ? '#94a3b8' : '#f59e0b', fontWeight: 600 }}>
        {isRunning ? 'En execucio' : isCompleted ? 'Finalitzat' : 'Pendent'}
      </div>
    </button>
  );
};

// ---------------------------------------------------------------------------
// LiveTab - real-time metrics view
// ---------------------------------------------------------------------------

/**
 * LiveTab - polls the orchestrator and metrics API to show live benchmark data.
 *
 * Data flow:
 *   1. fetchActive() polls /orchestrator/runs every 5 seconds to get active
 *      and pending runs. This is the ONLY place the orchestrator is used as
 *      a data source (the History tab no longer uses it).
 *   2. When a run is selected, a 3-second polling interval fetches
 *      /metrics?runId=<id> to get the latest raw metric data points.
 *      The runId filter is strict - no fallback to scenarioId - to ensure
 *      we only display data from the currently selected run, not historical
 *      data from previous runs of the same scenario.
 *   3. Client-side computePercentile() computes P50/P99 from the live sample
 *      array (since the live endpoint returns raw points, not aggregations).
 *
 * Auto-selection logic:
 *   - If no run is selected and runs become available, auto-select the first one.
 *   - If the selected run disappears (finished/stopped), auto-select the new first.
 *
 * Chart colors used in live charts:
 *   ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444','#06b6d4']
 * This is a professional fixed palette rather than random colors, ensuring
 * consistent color associations across page reloads.
 */
const LiveTab = () => {
  // List of active/pending runs from the orchestrator
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  // ID of the currently selected run (drives metrics polling)
  const [selectedRunId, setSelectedRunId] = useState('');
  // Raw metric data points for the selected run
  const [metrics, setMetrics] = useState<any[]>([]);
  // Whether the metrics polling interval is active
  const [polling, setPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pollError, setPollError] = useState('');

  // -------------------------------------------------------------------------
  // Chart window selector.
  //
  // When a benchmark runs for a long time, the live chart accumulates
  // hundreds or thousands of samples. At that point the SVG line becomes
  // a dense blob where individual variations are invisible - the chart
  // becomes useless.
  //
  // Fix: a windowSize selector that limits which samples are plotted.
  // The user picks from 50 / 100 / 200 / 500 / all. The default is 100,
  // which gives a clean readable chart while still showing recent history.
  // Setting to "all" plots the entire sample array (old behaviour).
  //
  // Applies ONLY to the chart rendering and summary stat cards. The raw
  // metrics table at the bottom still shows all samples.
  // -------------------------------------------------------------------------
  const [chartWindow, setChartWindow] = useState<number | 'all'>(100);

  /**
   * Fetches active and pending runs from the orchestrator.
   * Wrapped in useCallback so it can be used as an interval callback
   * without causing re-render loops.
   */
  const fetchActive = useCallback(async () => {
    try {
      const data = await fetch(`${ORCHESTRATOR}/runs`).then(r => r.json());
      if (Array.isArray(data)) setActiveRuns(data.filter((r: any) => r.status === 'running' || r.status === 'pending'));
    } catch (_) { }
  }, []);

  // Poll orchestrator for active runs every 5 seconds
  useEffect(() => {
    fetchActive();
    const i = setInterval(fetchActive, 5000);
    return () => clearInterval(i);
  }, [fetchActive]);

  // Auto-select logic: pick first available run ONLY when nothing is
  // selected. We intentionally DO NOT auto-switch when the currently-
  // selected run completes: the user must still see its final snapshot
  // (including the "status:completed" doc posted by load-generator on
  // SIGTERM / natural end-of-run). If we auto-switched, the polling
  // effect cleanup would wipe the metrics array and the user would
  // never see the run's endgame.
  //
  // When the selected run leaves activeRuns we keep polling /metrics?
  // runId=X for a short grace window (handled in the polling effect)
  // so the "completed" snapshot is captured, then the view is frozen.
  useEffect(() => {
    if (!selectedRunId && activeRuns.length > 0) setSelectedRunId(activeRuns[0].id);
  }, [activeRuns, selectedRunId]);

  // True once the selected run has left activeRuns — drives the
  // "Finalitzat" banner and the grace-window polling behaviour.
  const selectedRunFinished = !!selectedRunId && !activeRuns.find(r => r.id === selectedRunId);

  // Metrics polling: resets and restarts when selectedRunId changes.
  //
  // No defensive timestamp filter is needed because runId is unique per
  // execution (orchestrator generates a fresh randomUUID for every run,
  // see packages/benchmark-orchestrator/src/index.ts). That means
  // /metrics?runId=X returns ONLY this run's docs — there is no stale
  // data to filter out. The previous "first-poll baseline trick" was
  // dropping the genuine first 5-10 seconds of every run; removed.
  useEffect(() => {
    if (!selectedRunId) {
      setMetrics([]);
      setPolling(false);
      return;
    }

    setMetrics([]);
    setPolling(true);
    setPollError('');

    const poll = async () => {
      try {
        const data = await fetch(`${METRICS_BASE}/metrics?runId=${selectedRunId}`).then(r => r.json()).catch(() => null);
        if (!Array.isArray(data)) return;
        // Store everything the backend returns for this runId. Since the
        // runId is unique, every doc belongs to this run.
        setMetrics(data);
        setLastUpdate(new Date());
        setPollError('');
      } catch (e: any) { setPollError(e.message); }
    };

    poll(); // Immediate first fetch
    const i = setInterval(poll, 3000);
    return () => { clearInterval(i); setPolling(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRunId]);

  // Grace-window polling after run completion:
  //
  // When a run leaves activeRuns, the load-generator is shutting down and
  // will POST one last snapshot (status:'completed') within ~2 seconds.
  // We keep polling every 3s for ~15s to catch that final doc, then stop.
  // This guarantees the Live view shows the SAME final numbers that the
  // History tab will show (both read the last snapshot of the run).
  useEffect(() => {
    if (!selectedRunFinished || !selectedRunId) return;
    let cancelled = false;
    let ticks = 0;
    const TICK_MS = 3000;
    const MAX_TICKS = 6; // ~18s grace window
    const tick = async () => {
      if (cancelled || ticks++ >= MAX_TICKS) return;
      try {
        const data = await fetch(`${METRICS_BASE}/metrics?runId=${selectedRunId}`).then(r => r.json()).catch(() => null);
        if (Array.isArray(data) && !cancelled) {
          setMetrics(data);
          setLastUpdate(new Date());
        }
      } catch (_) { }
      if (!cancelled && ticks < MAX_TICKS) setTimeout(tick, TICK_MS);
    };
    setTimeout(tick, TICK_MS);
    return () => { cancelled = true; };
  }, [selectedRunFinished, selectedRunId]);

  // No client-side filter needed: every doc returned belongs to this
  // runId, so we render them all. This fixes the bug where the first
  // 5-10 seconds of every run were silently dropped.
  const filteredMetrics = metrics;

  // Apply the chart window: when not "all", only the last N samples are
  // plotted. This keeps the chart readable as the sample count grows.
  const windowedMetrics = chartWindow === 'all'
    ? filteredMetrics
    : filteredMetrics.slice(-chartWindow);

  // Extract metric arrays from the windowed data points, handling both field name variants
  // (the API may return 'latency' or 'avgLatency' depending on document structure)
  const lat = windowedMetrics.map(m => m.latency ?? m.avgLatency ?? 0);
  const tput = windowedMetrics.map(m => m.throughput ?? m.avgThroughput ?? 0);
  const err = windowedMetrics.map(m => m.errorRate ?? m.avgErrorRate ?? 0);

  // Helpers for computing summary statistics from the current metric arrays
  const avg = (a: number[]) => a.length ? (a.reduce((s, v) => s + v, 0) / a.length).toFixed(2) : '-';
  // Client-side percentile computation for live data (no server aggregation available here)
  const p50v = (a: number[]) => computePercentile(a, 50)?.toFixed(2) ?? '-';
  const p99v = (a: number[]) => computePercentile(a, 99)?.toFixed(2) ?? '-';

  return (
    <div>
      {/* Scenario picker card - shows all active/pending runs */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (activeRuns.length > 0 || selectedRunFinished) ? 14 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Escenari en execucio
          </div>
          {/* Status indicator:
              - Green pulsing: actively polling an active run → "En directe"
              - Amber static:  selected run just finished, view frozen → "Finalitzat"
              - Grey static:   no run selected / no data → "Inactiu" */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(() => {
              const live = polling && activeRuns.length > 0 && !selectedRunFinished;
              const finished = selectedRunFinished;
              const color = live ? '#22c55e' : finished ? '#f59e0b' : '#94a3b8';
              const label = live ? 'En directe' : finished ? 'Finalitzat' : 'Inactiu';
              return (
                <>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color,
                    display: 'inline-block',
                    boxShadow: live ? '0 0 8px #22c55e80' : 'none',
                    animation: live ? 'pulseDot 2s ease infinite' : 'none',
                  }} />
                  <span style={{ fontSize: 13, color, fontWeight: 600 }}>{label}</span>
                </>
              );
            })()}
            {lastUpdate && (
              <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
                - actualitzat {lastUpdate.toLocaleTimeString('ca-ES')}
              </span>
            )}
          </div>
        </div>

        {/* Run picker - horizontal scrollable row of RunCards.
            When the selected run has just finished we synthesize a virtual
            card at the end (status:'completed') so the user can still see
            which run their frozen metrics belong to. The card is
            non-selectable once removed from activeRuns — clicking it is a
            no-op; clicking another (real) active card switches away. */}
        {activeRuns.length === 0 && !selectedRunFinished ? (
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
            {selectedRunFinished && (() => {
              // Build a synthetic "finished" RunCard from the last metrics
              // doc so users see the metadata of the run whose final state
              // is currently frozen on screen.
              const last = metrics[metrics.length - 1] || {};
              const ghost = {
                id: selectedRunId,
                status: 'completed',
                scenarioName: last.scenarioId ? `(finalitzat)` : '(finalitzat)',
                protocol: last.protocol,
                architecture: last.architecture,
                platform: last.platform || last.broker,
                broker: last.broker,
                dataFormat: last.dataFormat,
                deliveryModel: last.deliveryModel,
              };
              return <RunCard key={`ghost-${selectedRunId}`} run={ghost} selected onClick={() => { }} />;
            })()}
          </div>
        )}

        {/* Error banner - shown when metrics fetch fails */}
        {pollError && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--error)', borderRadius: 6, fontSize: 12, color: 'var(--error)' }}>
            Error en carregar metriques: {pollError}
          </div>
        )}
      </div>

      {/* Empty state: no active runs AND no just-finished run to freeze-view.
          When a run has just finished (selectedRunFinished) we skip the
          empty state and render the full metrics layout so the user sees
          the frozen final numbers while the grace-window polling captures
          the load-generator's "status:completed" snapshot. */}
      {activeRuns.length === 0 && !selectedRunFinished ? (
        <div style={{ ...S.card, textAlign: 'center', padding: 72 }}>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}><IconSignal /></div>
          <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Cap execucio activa</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 20px' }}>
            Inicia un escenari des de la pagina <strong>Escenaris</strong> i aqui apareiran les metriques en temps real: latencia, throughput, P50 i P99.
          </div>
          <a href="/escenaris" style={{ ...S.btnPrimary as React.CSSProperties, textDecoration: 'none', display: 'inline-flex' }}>
            Anar a Escenaris
          </a>
        </div>
      ) : (
        <>
          {/* Summary stat cards (4 columns: samples, latency avg, throughput avg, error avg) */}
          <div aria-live="polite" aria-atomic="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'Mostres rebudes', v: String(filteredMetrics.length), c: '#3b82f6' },
              { l: 'Latencia avg (ms)', v: `${avg(lat)}ms`, c: '#f59e0b' },
              { l: 'Throughput avg', v: avg(tput), c: '#22c55e' },
              { l: 'Error rate avg (%)', v: `${avg(err)}%`, c: '#ef4444' },
            ].map(c => (
              <div key={c.l} style={{ ...S.card, textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.c, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>{c.v}</div>
                <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.l}</div>
              </div>
            ))}
          </div>

          {/* P50 + P99 cards - only shown after collecting enough samples for meaningful percentiles */}
          {filteredMetrics.length >= 5 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { l: 'P50 Latencia (mediana)', v: `${p50v(lat)}ms`, c: '#3b82f6', desc: '50% dels missatges arriben en menys d\'aquest temps' },
                { l: 'P99 Latencia (cua llarga)', v: `${p99v(lat)}ms`, c: '#7c3aed', desc: '99% dels missatges arriben en menys d\'aquest temps (pitjor cas practic)' },
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

          {/* Chart window selector - lets the user zoom into recent samples
              when the dataset grows large. Sits above the charts as a small
              pill-button group. The label shows the effective sample count
              (actual windowed length vs total collected) so users understand
              the scope. */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Finestra del grafic
              <span style={{ marginLeft: 8, color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 0 }}>
                ({windowedMetrics.length} de {filteredMetrics.length} mostres)
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { label: 'Ultimes 50', value: 50 as number | 'all' },
                { label: 'Ultimes 100', value: 100 },
                { label: 'Ultimes 200', value: 200 },
                { label: 'Ultimes 500', value: 500 },
                { label: 'Totes', value: 'all' as number | 'all' },
              ] as { label: string; value: number | 'all' }[]).map(opt => {
                const active = chartWindow === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setChartWindow(opt.value)}
                    style={{
                      ...S.chip(active, 'var(--accent)'),
                      fontSize: 11, padding: '4px 10px',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live sparkline charts - one per metric, 3-column grid.
              Data arrays are sliced to `chartWindow` above to keep the
              chart readable at high sample counts. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              { data: lat, color: '#f59e0b', label: 'Latencia (ms)', unit: 'ms' },
              { data: tput, color: '#22c55e', label: 'Throughput (msg/s)', unit: '' },
              { data: err, color: '#ef4444', label: 'Error rate (%)', unit: '%' },
            ].map(c => (
              <div key={c.label} style={{ ...S.card }}>
                <LiveLineChart data={c.data} color={c.color} label={c.label} unit={c.unit} />
              </div>
            ))}
          </div>

          {/* Recent metrics table - all samples in reverse chronological order */}
          {filteredMetrics.length > 0 && (
            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-secondary)' }}><IconPulse /></span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ultimes mesures</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-disabled)' }}>
                  {filteredMetrics.length} punts - actualitzacio cada 3s
                </span>
              </div>
              {/* Scrollable table body - capped at 480px height to avoid page overflow */}
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={S.tableHeader}>
                      {['Hora', 'Latencia (ms)', 'Throughput', 'Error (%)'].map(h => (
                        <th key={h} style={{ ...S.th, textAlign: h === 'Hora' ? 'left' : 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Reverse order: newest metrics at top */}
                    {[...filteredMetrics].reverse().map((m, i) => (
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

// ---------------------------------------------------------------------------
// ResultatsPage - root page component
// ---------------------------------------------------------------------------

/**
 * ResultatsPage - the top-level page component for the Results section.
 *
 * Renders a two-tab layout:
 *   - "En directe" (Live): real-time metrics for active benchmark runs
 *   - "Historial i comparatives" (History): aggregated historical comparison
 *
 * Tab state is local - switching tabs does not reset the sub-component state
 * because React keeps mounted components in the tree (conditional rendering
 * with && means components ARE unmounted on tab switch; this is intentional
 * to reset live polling when switching away from the Live tab).
 *
 * GLOBAL_CSS (from theme) injects the shimmer keyframe animation and other
 * shared styles needed by child components.
 *
 * The page title is set via document.title on mount for better browser tab UX.
 */
export const ResultatsPage = () => {
  const [tab, setTab] = useState<'live' | 'historial'>('live');

  // Update browser tab title when the page mounts
  useEffect(() => { document.title = 'Resultats | APIs Asíncrones'; }, []);

  /**
   * Generates tab button styles based on active state.
   * Active tab: accent color + bottom border underline indicator.
   * Inactive tab: muted text + transparent border (maintains layout height).
   */
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
      {/* Inject shared global CSS (shimmer animation, fadeUp, pulseDot, etc.) */}
      <style>{GLOBAL_CSS}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Resultats</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
          Metriques en temps real i comparatives d'arquitectures asincrones
        </p>
      </div>

      {/* Tab navigation bar - uses ARIA roles for accessibility */}
      <div role="tablist" aria-label="Vistes de resultats" style={{ borderBottom: '1px solid var(--border)', marginBottom: 24, display: 'flex' }}>
        <button role="tab" aria-selected={tab === 'live'} style={tabBtn(tab === 'live')} onClick={() => setTab('live')}>      <IconPulse /> En directe</button>
        <button role="tab" aria-selected={tab === 'historial'} style={tabBtn(tab === 'historial')} onClick={() => setTab('historial')}><IconClock /> Historial i comparatives</button>
      </div>

      {/* Tab panel - only the active tab is rendered (unmounts inactive tab) */}
      <div role="tabpanel" aria-label={tab === 'live' ? 'En directe' : 'Historial i comparatives'}>
        {tab === 'live' && <LiveTab />}
        {tab === 'historial' && <HistorialTab />}
      </div>
    </div>
  );
};

export default ResultatsPage;
