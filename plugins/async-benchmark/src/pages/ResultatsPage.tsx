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
import { useTranslation } from '../i18n';
import { S } from '../theme';
import { MetricsDetailDrawer } from '../components/MetricsDetailDrawer';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';
import { TutorialButton } from '../components/TutorialOverlay';
import { GuideItemCard, GuidePanel } from '../components/GuidePanel';
import { EDUCATION } from '../shared/content/education';
import { getLiveMessageCount } from '../shared/metrics/liveMetrics';
import { aggregateScenarioHistory, getRunMeasureCount, getRunMessageCount, getRunSentCount, getScenarioMeasureCount } from '../shared/results/historyMetrics';
import { buildScenarioHistoryDetail } from '../shared/results/scenarioDetail';

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

const LOCALE_BY_LANGUAGE: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-US',
};

const getLocale = (language: string) => LOCALE_BY_LANGUAGE[language] || 'ca-ES';

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

const formatDateTime = (iso: string | undefined, locale: string) =>
  !iso ? '-' : new Date(iso).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

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
  'NATS': '#22c55e',
};

const VISIBLE_PROTOCOLS = ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'WS', 'NATS'];

const isVisibleHistoricalItem = (item: any): boolean => {
  const protocol = String(item.protocol || '');
  if (protocol && !VISIBLE_PROTOCOLS.includes(protocol)) return false;
  const platform = String(item.platform || item.broker || '').toLowerCase();
  return !platform.includes('pulsar');
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
  };
  return map[p.toLowerCase()] ?? p;
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
type ScoreMetricKey = 'lat' | 'p50' | 'p99' | 'tput' | 'err';
type ScoreWeights = Record<ScoreMetricKey, number>;
type ScoreMetricRecord = Record<ScoreMetricKey, number>;
type ScoreMetricValues = Record<ScoreMetricKey, number | null>;
type ScoreMetricBounds = Record<ScoreMetricKey, { min: number; max: number }>;

type ScoreBreakdown = {
  score: number;
  compositePercent: number;
  penalty: number;
  weights: ScoreWeights;
  normalized: ScoreMetricRecord;
  contributions: ScoreMetricRecord;
  finalContributions: ScoreMetricRecord;
  values: ScoreMetricValues;
  bounds: ScoreMetricBounds;
  dataFormat: string;
};

const SCORE_METRIC_KEYS: ScoreMetricKey[] = ['lat', 'p50', 'p99', 'tput', 'err'];

const FORMAT_WEIGHTS: Record<string, ScoreWeights> = {
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
): Map<string, ScoreBreakdown> => {
  const n = items.length;
  if (n === 0) return new Map();

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

  const bounds: ScoreMetricBounds = {
    lat: { min: minLat, max: maxLat },
    p50: { min: minP50, max: maxP50 },
    p99: { min: minP99, max: maxP99 },
    tput: { min: minTp, max: maxTp },
    err: { min: minErr, max: maxErr },
  };

  const buildBreakdown = (
    s: any,
    normalized: ScoreMetricRecord,
    values: ScoreMetricValues,
  ): ScoreBreakdown => {
    const fmt = dataFormatOf(s);
    const weights = FORMAT_WEIGHTS[fmt] ?? FORMAT_WEIGHTS['default'];
    const penalty = getErrorPenalty(fmt, s.avgErrorRate ?? 0);
    const contributions = SCORE_METRIC_KEYS.reduce((acc, key) => {
      acc[key] = normalized[key] * weights[key] * 100;
      return acc;
    }, {} as ScoreMetricRecord);
    const finalContributions = SCORE_METRIC_KEYS.reduce((acc, key) => {
      acc[key] = contributions[key] * penalty;
      return acc;
    }, {} as ScoreMetricRecord);
    const compositePercent = SCORE_METRIC_KEYS.reduce((sum, key) => sum + contributions[key], 0);
    const score = Math.round(SCORE_METRIC_KEYS.reduce((sum, key) => sum + finalContributions[key], 0));
    return {
      score: Math.max(0, Math.min(100, score)),
      compositePercent,
      penalty,
      weights,
      normalized,
      contributions,
      finalContributions,
      values,
      bounds,
      dataFormat: fmt,
    };
  };

  // Special case: a single visible scenario has no peer group to normalize
  // against, so each metric receives the full value of its configured weight.
  if (n === 1) {
    const s = items[0];
    const normalized: ScoreMetricRecord = { lat: 1, p50: 1, p99: 1, tput: 1, err: 1 };
    const values: ScoreMetricValues = {
      lat: getLat(s),
      p50: getP50(s),
      p99: getP99(s),
      tput: getTput(s),
      err: getErr(s),
    };
    return new Map([[s.runId || s.scenarioId, buildBreakdown(s, normalized, values)]]);
  }

  const map = new Map<string, ScoreBreakdown>();
  items.forEach(s => {
    // Normalize each metric: lower latency/errors = higher normalized score
    const values: ScoreMetricValues = {
      lat: getLat(s),
      p50: getP50(s),
      p99: getP99(s),
      tput: getTput(s),
      err: getErr(s),
    };
    const normalized: ScoreMetricRecord = {
      lat: safeDivide(values.lat, minLat, maxLat, false),
      p50: safeDivide(values.p50, minP50, maxP50, false),
      p99: safeDivide(values.p99, minP99, maxP99, false),
      tput: safeDivide(values.tput, minTp, maxTp, true),
      err: safeDivide(values.err, minErr, maxErr, false),
    };

    // Key by runId when available (per-run scoring), fallback to scenarioId for legacy data
    map.set(s.runId || s.scenarioId, buildBreakdown(s, normalized, values));
  });
  return map;
};

const getScoreValue = (breakdown?: ScoreBreakdown): number => breakdown?.score ?? 0;

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


/** Compact upward marker indicating the top-performing scenario. */
const IconTrophy = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>;

/**
 * Animated chevron arrow that rotates 180deg when open=true.
 * Used in collapsible sections (MetricGlossary, secondary filters).
 */
const IconChevron = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>;

/** Check-circle icon used in the "best scenario" summary card (neutral, professional). */
const IconAward = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;

/** Small funnel filter icon used in the secondary filters toggle button. */
const IconFilter = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;

/** Small search icon used in live/history quick-search inputs. */
const SearchIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;

 /**
  * Guia de resultats.
 * Explica missatges, mesures i puntuació amb el mateix format que la resta de guies.
 */
const METRIC_GLOSSARY_STORAGE_KEY = 'asyncbenchmark:metricGlossary:open';

const MetricGlossary = () => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(METRIC_GLOSSARY_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    try { window.localStorage.setItem(METRIC_GLOSSARY_STORAGE_KEY, String(open)); } catch { /* ignore */ }
  }, [open]);
  const guide = EDUCATION.resultsGuide;
  const fmtLabel: Record<string, string> = {
    'default': 'Per defecte', 'financial': 'Financer', 'video-4k': 'Vídeo 4K', 'video-8k': 'Vídeo 8K', 'iot': 'IoT',
  };
  const metricLabel: Record<string, string> = { lat: 'Lat. avg', p50: 'P50', p99: 'P99', tput: 'Throughput', err: 'Error %' };
  const metricColor: Record<string, string> = { lat: '#f59e0b', p50: '#3b82f6', p99: '#7c3aed', tput: '#22c55e', err: '#ef4444' };

  return (
    <GuidePanel
      title={guide.title}
      subtitle={t('resultats.glossary.shortSubtitle')}
      open={open}
      onToggle={() => setOpen(o => !o)}
      showLabel={t('scenarios.guide.show')}
      hideLabel={t('scenarios.guide.hide')}
      marginBottom={16}
    >
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Com interpretar aquesta pàgina</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {guide.intro}
            </div>
          </div>

          <div style={{ marginTop: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Glossari ràpid</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {guide.terminology.map(item => (
                <GuideItemCard key={item.title} title={item.title} text={item.description} color={item.accent} />
              ))}
            </div>
          </div>

          {/* Metric definitions */}
          <div style={{ marginTop: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Mètriques que veus a la taula</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
              {guide.metricDefinitions.map(item => (
                <GuideItemCard key={item.title} title={item.title} text={item.description} color={item.accent} />
              ))}
            </div>
          </div>

          {/* Scoring guide */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Com funciona la puntuació</div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.7, fontWeight: 700, marginBottom: 8 }}>
                La puntuació ordena els escenaris visibles; no és una nota absoluta vàlida fora dels filtres actuals.
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {guide.scoringPrinciples.map(point => (
                  <div key={point} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', marginTop: 6, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{point}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-disabled)', lineHeight: 1.6 }}>
                {guide.thresholds}
              </div>
            </div>
          </div>

          {/* Per-format weight table */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pesos per format de dades</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)' }}>
                    <th style={{ ...S.th, textAlign: 'left', padding: '6px 10px' }}>Format</th>
                    {(['lat', 'p50', 'p99', 'tput', 'err'] as const).map(k => (
                      <th key={k} style={{ ...S.th, textAlign: 'center', padding: '6px 8px', color: metricColor[k] }}>{metricLabel[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(FORMAT_WEIGHTS).map(([fmt, w]) => (
                    <tr key={fmt} style={S.tableRow}>
                      <td style={{ ...S.td, fontWeight: 600, padding: '5px 10px' }}>{fmtLabel[fmt] || fmt}</td>
                      {(['lat', 'p50', 'p99', 'tput', 'err'] as const).map(k => (
                        <td key={k} style={{ ...S.td, textAlign: 'center', padding: '5px 8px', fontFamily: 'var(--font-mono)', color: metricColor[k] }}>
                          {Math.round(w[k] * 100)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
    </GuidePanel>
  );
};

// ---------------------------------------------------------------------------
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
                  {isWinner && <span style={{ color: 'var(--accent)', marginRight: 4 }}><IconTrophy /></span>}
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

const SCORE_METRIC_COLORS: Record<ScoreMetricKey, string> = {
  lat: '#f59e0b',
  p50: '#3b82f6',
  p99: '#8b5cf6',
  tput: '#22c55e',
  err: '#ef4444',
};

const SCORE_METRIC_LABEL_KEYS: Record<ScoreMetricKey, string> = {
  lat: 'resultats.score.metrics.lat',
  p50: 'resultats.score.metrics.p50',
  p99: 'resultats.score.metrics.p99',
  tput: 'resultats.score.metrics.tput',
  err: 'resultats.score.metrics.err',
};

const formatScorePercent = (value: number, decimals = 0): string =>
  `${value.toFixed(decimals)}%`;

const formatScoreFactor = (value: number): string =>
  value.toFixed(2);

const formatMetricValue = (key: ScoreMetricKey, value: number | null): string => {
  if (value == null) return '-';
  if (key === 'tput') return `${value.toFixed(1)} msg/s`;
  if (key === 'err') return `${value.toFixed(3)}%`;
  return `${value.toFixed(2)} ms`;
};

const sameCollectionSignature = (prev: any[], next: any[]) => {
  if (prev.length !== next.length) return false;
  const signature = (item: any) => [
    item.id,
    item.name,
    item.runId,
    item.scenarioId,
    item.status,
    item.updatedAt,
    item.endedAt,
    item.count,
    item.avgLatency,
    item.avgThroughput,
    item.avgErrorRate,
  ].join('|');
  for (let index = 0; index < prev.length; index += 1) {
    if (signature(prev[index]) !== signature(next[index])) return false;
  }
  return true;
};

const ScoreBreakdownPanel = ({
  breakdown,
  t,
}: {
  breakdown: ScoreBreakdown | null;
  t: (key: string) => string;
}) => {
  if (!breakdown) return null;
  const penaltyPercent = breakdown.penalty * 100;

  return (
    <div style={{ ...S.card, marginTop: 14, background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <ScoreRing score={breakdown.score} size={46} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
            {t('resultats.score.title')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {t('resultats.score.formula')}
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.55fr 0.7fr 1.15fr',
            gap: 10,
            padding: '8px 10px',
            background: 'var(--bg-card)',
            color: 'var(--text-disabled)',
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>{t('resultats.score.metric')}</span>
          <span style={{ textAlign: 'right' }}>{t('resultats.score.weight')}</span>
          <span style={{ textAlign: 'right' }}>{t('resultats.score.normalized')}</span>
          <span style={{ textAlign: 'right' }}>{t('resultats.score.calculation')}</span>
        </div>
        {SCORE_METRIC_KEYS.map((key, index) => {
          const color = SCORE_METRIC_COLORS[key];
          const weightedContribution = breakdown.contributions[key];
          const contribution = breakdown.finalContributions[key];
          const weightPercent = breakdown.weights[key] * 100;
          return (
            <div
              key={key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 0.55fr 0.7fr 1.15fr',
                gap: 10,
                alignItems: 'center',
                padding: '10px',
                borderTop: '1px solid var(--border)',
                background: index % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-card)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {t(SCORE_METRIC_LABEL_KEYS[key])}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {formatMetricValue(key, breakdown.values[key])}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {formatScorePercent(weightPercent)}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {formatScorePercent(breakdown.normalized[key] * 100, 1)}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 800, color }}>
                  {formatScoreFactor(breakdown.normalized[key])} x {formatScorePercent(weightPercent)} = {formatScorePercent(weightedContribution, 1)}
                </div>
                {breakdown.penalty < 1 && (
                  <div style={{ marginTop: 3, fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)' }}>
                    x {formatScorePercent(penaltyPercent, 0)} = {formatScorePercent(contribution, 1)}
                  </div>
                )}
                <div style={{ marginTop: 4, height: 5, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, contribution))}%`, height: '100%', background: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>{t('resultats.score.base')}</div>
          <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 900 }}>{formatScorePercent(breakdown.compositePercent, 1)}</div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>{t('resultats.score.penalty')}</div>
          <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 900 }}>{formatScorePercent(penaltyPercent, 0)}</div>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>{t('resultats.score.final')}</div>
          <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 900 }}>{breakdown.score}/100</div>
        </div>
      </div>
    </div>
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
  const { t, language } = useTranslation();
  const locale = getLocale(language);
  // Raw summary data from /metrics/summary (Elasticsearch aggregations)
  const [summary, setSummary] = useState<any[]>([]);
  // Scenario definitions from /scenarios (for display names and metadata)
  const [scenarios, setScenarios] = useState<any[]>([]);
  // Known runs from the orchestrator (/runs). Used to intersect the ES
  // summary and hide orphans from Elasticsearch that no longer correspond
  // to a run the orchestrator remembers. When the list is empty (orchestrator
  // unreachable OR freshly restarted with no new runs) we fall back to
  // showing raw ES data; better stale history than none.
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
  const [historySearch, setHistorySearch] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const hasLoadedHistoryRef = useRef(false);

  // Controls visibility of the secondary filters (protocol/platform/arch)
  const [filtersOpen, setFiltersOpen] = useState(false);

  /**
   * Fetches both summary and scenario data in parallel.
   * Gracefully handles API errors by defaulting to empty arrays,
   * so a broken scenarios endpoint doesn't prevent history from loading.
   */
  const fetchData = useCallback(async () => {
    const firstLoad = !hasLoadedHistoryRef.current;
    if (firstLoad) setLoading(true);
    try {
      const [sumRes, scRes] = await Promise.all([
        fetch(`${METRICS_BASE}/metrics/summary`).then(r => r.json()).catch(() => []),
        fetch(`${SCENARIOS_BASE}/scenarios`).then(r => r.json()).catch(() => []),
      ]);
      const nextSummary = Array.isArray(sumRes) ? sumRes : [];
      const nextScenarios = Array.isArray(scRes) ? scRes : [];
      setSummary(prev => (sameCollectionSignature(prev, nextSummary) ? prev : nextSummary));
      setScenarios(prev => (sameCollectionSignature(prev, nextScenarios) ? prev : nextScenarios));
    } catch (_) { }
    hasLoadedHistoryRef.current = true;
    if (firstLoad) setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Periodic background refresh so new runs appear without user action.
  // Interval of 30s balances freshness against backend load.
  useEffect(() => {
    const id = window.setInterval(() => { fetchData(); }, 30000);
    return () => window.clearInterval(id);
  }, [fetchData]);

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

  // History is sourced only from persisted metrics. This guarantees that only
  // executed scenarios with stored summary documents appear in this tab.
  const syncedSummary = summary.filter(s => !!s.scenarioId && isVisibleHistoricalItem(s));

  /**
   * Resolves the data format for a summary item.
   * Prefers the format stored in the metrics document itself (set at run time),
   * falls back to the scenario definition, then defaults to 'default'.
   */
  const dataFormatOf = (s: any): string =>
    s.dataFormat || scenarioMap[s.scenarioId]?.dataFormat || 'default';

  // Derive unique filter option values from the full (unfiltered) summary set
  const availPlatforms = [...new Set(syncedSummary.map((s: any) => normalizePlatform(s.platform || s.broker) || '').filter(Boolean))];
  const availProtocols = [...new Set(syncedSummary.map((s: any) => s.protocol || '').filter((value: string) => Boolean(value) && VISIBLE_PROTOCOLS.includes(value)))];
  const availArchs = [...new Set(syncedSummary.map((s: any) => s.architecture || '').filter(Boolean))];
  const availDataFormats = [...new Set(syncedSummary.map(dataFormatOf).filter(Boolean))];

  /**
   * Toggles a value in a filter list - adds if not present, removes if present.
   * Used by Chip onClick handlers.
   */
  const toggle = (list: string[], set: (v: string[]) => void, val: string) =>
    set(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  // Apply all active filters to the full summary set
  const filteredSummary = syncedSummary.filter(s => {
    const platform = normalizePlatform(s.platform || s.broker) || '';
    if (!isVisibleHistoricalItem(s)) return false;
    if (filterPlatform.length && !filterPlatform.includes(platform)) return false;
    if (filterProtocol.length && !filterProtocol.includes(s.protocol || '')) return false;
    if (filterArch.length && !filterArch.includes(s.architecture || '')) return false;
    if (filterDataFormat.length && !filterDataFormat.includes(dataFormatOf(s))) return false;
    if (historySearch.trim()) {
      const query = historySearch.trim().toLowerCase();
      const scenarioName = String(nameMap[s.scenarioId] || s.scenarioId || '').toLowerCase();
      const protocol = String(s.protocol || '').toLowerCase();
      const architecture = String(s.architecture || '').toLowerCase();
      const dataFormat = String(dataFormatLabel(dataFormatOf(s))).toLowerCase();
      if (![scenarioName, platform.toLowerCase(), protocol, architecture, dataFormat].some(value => value.includes(query))) {
        return false;
      }
    }
    return true;
  });

  // Total count of active filter selections across all filter groups.
  const activeFilters = filterPlatform.length + filterProtocol.length + filterArch.length + filterDataFormat.length + (historySearch.trim() ? 1 : 0);
  const clearFilters = () => {
    setFilterPlatform([]); setFilterProtocol([]); setFilterArch([]);
    setFilterDataFormat([]);
    setHistorySearch('');
  };

  const scenarioHistory = aggregateScenarioHistory(filteredSummary);
  const totalScenarioHistory = aggregateScenarioHistory(syncedSummary);
  const totalMeasures = scenarioHistory.reduce((sum, s) => sum + getScenarioMeasureCount(s), 0);
  const totalRuns = filteredSummary.length;

  // Compute per-scenario scores for the filtered set.
  // `percentileMap` is used as a fallback when the server summary lacks
  // p50Latency/p99Latency fields (see the percentile-fetching effect above).
  const scoreMap = computeScores(scenarioHistory, percentileMap, dataFormatOf);

  // Sort filtered scenarios by score descending - best first.
  const sorted = [...scenarioHistory].sort((a, b) =>
    getScoreValue(scoreMap.get(b.runId || b.scenarioId)) - getScoreValue(scoreMap.get(a.runId || a.scenarioId))
  );
  const best = sorted[0];
  const selectedScenarioSummary = sorted.find(item => item.scenarioId === selectedScenarioId) || null;
  const selectedScenarioRuns = selectedScenarioSummary
    ? filteredSummary.filter(item => item.scenarioId === selectedScenarioSummary.scenarioId)
    : [];
  const selectedScenarioDetail = selectedScenarioSummary
    ? buildScenarioHistoryDetail(
        selectedScenarioSummary,
        selectedScenarioRuns,
        nameMap[selectedScenarioSummary.scenarioId] || selectedScenarioSummary.scenarioId || '-',
      )
    : null;
  const selectedScenarioScoreBreakdown = selectedScenarioSummary
    ? scoreMap.get(selectedScenarioSummary.runId || selectedScenarioSummary.scenarioId) ?? null
    : null;
  const selectedScenarioScore = getScoreValue(selectedScenarioScoreBreakdown ?? undefined);
  const statusLabel = (status?: string): string => {
    if (!status) return '-';
    const key = `execucions.status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };
  const dataFormatLabel = (format?: string): string => {
    const normalized = format || 'default';
    const key = `resultats.dataFormatLabels.${normalized}`;
    const translated = t(key);
    return translated === key ? DATA_FORMAT_LABELS[normalized] || normalized : translated;
  };

  // Prepare chart data - each chart is independently sorted by its own metric
  // so that the best performer for THAT metric always appears at the top.
  const latData = [...scenarioHistory]
    .sort((a, b) => (a.avgLatency ?? 9999) - (b.avgLatency ?? 9999))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgLatency ?? 0 }));

  const tputData = [...scenarioHistory]
    .sort((a, b) => (b.avgThroughput ?? 0) - (a.avgThroughput ?? 0))
    .map(s => ({ label: nameMap[s.scenarioId] || s.scenarioId?.slice(0, 10) || '?', value: s.avgThroughput ?? 0 }));

  const errData = [...scenarioHistory]
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
      <MetricGlossary />

      {/* Filter bar */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        {/* Data format filter - always visible (primary filter, most commonly used) */}
        {availDataFormats.length > 0 && (
          <div style={{ marginBottom: filtersOpen || availDataFormats.length > 0 ? 14 : 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{t('resultats.history.filterFormat')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availDataFormats.map(f => (
                <Chip
                  key={f}
                  label={dataFormatLabel(f)}
                  active={filterDataFormat.includes(f)}
                  color={DATA_FORMAT_COLORS[f] || '#7c3aed'}
                  onClick={() => toggle(filterDataFormat, setFilterDataFormat, f)}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ color: 'var(--text-disabled)', display: 'flex' }}><IconFilter /></span>
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder={t('resultats.history.searchPlaceholder')}
              style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text-primary)' }}
            />
            {historySearch && (
              <button
                onClick={() => setHistorySearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, fontSize: 14, lineHeight: 1 }}
                aria-label={t('resultats.history.clearSearch')}
              >
                ×
              </button>
            )}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {filteredSummary.length} {t('resultats.history.visibleRuns')}
          </span>
        </div>

        {/* Divider + toggle button for secondary filters (protocol, platform, arch) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: availDataFormats.length > 0 ? '1px solid var(--border)' : 'none', paddingTop: availDataFormats.length > 0 ? 14 : 0 }}>
          <button
            onClick={() => setFiltersOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}
          >
            <IconFilter />
            {t('resultats.history.filterMore')}
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
            {scenarioHistory.length !== totalScenarioHistory.length && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('resultats.history.showing')} <strong>{scenarioHistory.length}</strong> {t('resultats.history.of')} {totalScenarioHistory.length} {t('resultats.history.scenarios')}
              </span>
            )}
            {activeFilters > 0 && (
              <button onClick={clearFilters} style={{ ...S.btn, fontSize: 12, padding: '4px 12px', color: 'var(--error)', borderColor: 'var(--error)' }}>
                {t('resultats.history.clearAll')}
              </button>
            )}
          </div>
        </div>

        {/* Secondary filters - collapsible (protocol, platform, architecture) */}
        {filtersOpen && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {availProtocols.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t('resultats.history.filterProtocol')}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {availProtocols.map(p => <Chip key={p} label={p} active={filterProtocol.includes(p)} color="#16a34a" onClick={() => toggle(filterProtocol, setFilterProtocol, p)} />)}
                </div>
              </div>
            )}
            {availPlatforms.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t('resultats.history.filterPlatform')}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {availPlatforms.map(p => <Chip key={p} label={p} active={filterPlatform.includes(p)} color={PLATFORM_COLORS[p] || '#d97706'} onClick={() => toggle(filterPlatform, setFilterPlatform, p)} />)}
                </div>
              </div>
            )}
            {availArchs.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{t('resultats.history.filterArchitecture')}</div>
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
          <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600 }}>{t('resultats.history.emptyTitle')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
            {t('resultats.history.emptyMessage')}{' '}
            <a href="/escenaris" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{t('resultats.history.emptyLink')}</a>
          </div>
        </div>
      )}

      {/* Empty state: runs exist but all are filtered out by the active filters */}
      {scenarioHistory.length === 0 && syncedSummary.length > 0 && (
        <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{t('resultats.history.emptyFilter')}</div>
        </div>
      )}

      {scenarioHistory.length > 0 && (
        <>
          {/* Summary stat cards: scenario count + run count + total samples + best performer */}
          <div style={{ display: 'grid', gridTemplateColumns: best ? '1fr 1fr 1fr 2fr' : '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#3b82f614', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, fontFamily: 'var(--font)' }}>
                {scenarioHistory.length}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('resultats.history.statsExecuted')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{scenarioHistory.length} {t('resultats.history.scenarios')}</div>
              </div>
            </div>

            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#22c55e14', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, fontFamily: 'var(--font)' }}>
                {totalRuns}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('resultats.history.statsRuns')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{totalRuns} {totalRuns !== 1 ? t('resultats.history.runs') : t('resultats.history.run')}</div>
              </div>
            </div>

            <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f59e0b14', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 800, fontFamily: 'var(--font)' }}>
                {totalMeasures}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('resultats.history.statsMeasures')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('resultats.history.statsTelemetryVisible')}</div>
              </div>
            </div>

            {/* Best scenario card - highlighted with a subtle green gradient */}
            {best && (
              <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(34,197,94,0.04) 100%)', borderColor: 'rgba(34,197,94,0.25)' }}>
                {/* Score ring uses runId || scenarioId to match the scoreMap key */}
                <ScoreRing score={getScoreValue(scoreMap.get(best.runId || best.scenarioId))} size={52} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: 'var(--accent)' }}><IconAward /></span>
                    <span style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{t('resultats.history.statsBest')}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                    {nameMap[best.scenarioId] || best.scenarioId?.slice(0, 16) || '-'}
                  </div>
                  {/* Badges showing best scenario's metadata */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                    {best.protocol && <span style={{ ...S.badge(PROTOCOL_COLORS[best.protocol] || '#16a34a'), fontSize: 10 }}>{best.protocol}</span>}
                    {best.architecture && <span style={{ ...S.badge(ARCHITECTURE_COLORS[best.architecture] || '#2563eb'), fontSize: 10 }}>{best.architecture}</span>}
                    {(() => { const p = normalizePlatform(best.platform || best.broker); return p ? <span style={{ ...S.badge(PLATFORM_COLORS[p] || '#d97706'), fontSize: 10 }}>{p}</span> : null; })()}
                    {(() => { const df = dataFormatOf(best); return <span style={{ ...S.badge(DATA_FORMAT_COLORS[df] || '#64748b'), fontSize: 10 }}>{dataFormatLabel(df)}</span>; })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/*
            Grafiques de rendiment.
            Cadascuna rep una `key` derivada de la configuracio actual de
            filtres. Aixi quan l'usuari toca un xip de filtre, React desmunta
            i remunta el component instantaniament: les barres s'actualitzen
            de forma immediata en comptes de quedar-se aturades fins al
            seguent cicle de polling. Tambe inclouem la mida del dataset
            perque qualsevol canvi (afegir un escenari nou, esborrar-ne un)
            forci el remount.
          */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{t('resultats.history.sectionMetrics')}</div>
            {(() => {
              const claveGrafiques =
                `${filterPlatform.join(',')}|${filterProtocol.join(',')}|` +
                `${filterArch.join(',')}|${filterDataFormat.join(',')}|` +
                `${historySearch.trim()}|${scenarioHistory.length}`;
              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div style={{ ...S.card }}>
                      <HBarChart key={`lat-${claveGrafiques}`} data={latData} title={t('resultats.history.chartLatency')} unit="ms" color="#f59e0b" lowerIsBetter />
                    </div>
                    <div style={{ ...S.card }}>
                      <HBarChart key={`tput-${claveGrafiques}`} data={tputData} title={t('resultats.history.chartThroughput')} unit="" color="#22c55e" lowerIsBetter={false} />
                    </div>
                  </div>
                  <div style={{ ...S.card, marginBottom: 20 }}>
                    <HBarChart key={`err-${claveGrafiques}`} data={errData} title={t('resultats.history.chartError')} unit="%" color="#ef4444" lowerIsBetter />
                  </div>
                </>
              );
            })()}
          </div>

          {/*
            Comparativa visual "millor vs seleccionat".
            Quan l'usuari clica una fila a la taula i NO es la millor,
            mostrem un bloc gran que compara cara a cara les tres mètriques
            principals amb el codi simple: dues barres horitzontals i el
            percentatge de diferència. Aixi qualsevol persona, fins i tot
            sense formacio tecnica, veu d'un cop d'ull per què A es millor que B.

            Logica que apliquem (deliberadament senzilla, nivell junior):
              - Pintem dues barres per cada metrica
              - Calculem la diferencia en % respecte a la barra mes alta
              - Coloregem la guanyadora amb verd, la perdedora amb gris
              - Indiquem amb fletxa qui es millor (segons si la metrica
                "menor es millor" -- latencia, error -- o "major es millor"
                -- throughput)
          */}
          {best && selectedScenarioSummary && best.scenarioId !== selectedScenarioSummary.scenarioId && (() => {
            const nomA = nameMap[best.scenarioId] || best.scenarioId || 'Millor';
            const nomB = nameMap[selectedScenarioSummary.scenarioId] || selectedScenarioSummary.scenarioId || 'Seleccionat';

            // Helper simple per pintar una metrica.
            // Reb: titol, valor de A, valor de B, unitats i si "menor es millor".
            // Retorna un bloc <div> amb les dues barres + diferencia.
            const pintarMetrica = (
              titol: string,
              valorA: number | null | undefined,
              valorB: number | null | undefined,
              unitat: string,
              menorEsMillor: boolean,
            ) => {
              // Si falten dades, mostrem un placeholder per no enganyar.
              if (valorA == null || valorB == null) {
                return (
                  <div style={{ padding: 12, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      {titol}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Encara no hi ha prou dades per comparar.</div>
                  </div>
                );
              }

              const numA = Number(valorA);
              const numB = Number(valorB);
              // Decidim qui guanya
              const guanyaA = menorEsMillor ? numA <= numB : numA >= numB;
              // Maxim per fer barres proporcionals
              const maxim = Math.max(numA, numB, 0.0001);
              const pctA = (numA / maxim) * 100;
              const pctB = (numB / maxim) * 100;
              // Diferencia en percentatge respecte al perdedor
              const referencia = guanyaA ? numB : numA;
              const diff = referencia === 0 ? 0 : Math.abs((numA - numB) / referencia) * 100;
              const colorBo = '#22c55e';
              const colorMal = '#94a3b8';
              const colorA = guanyaA ? colorBo : colorMal;
              const colorB = guanyaA ? colorMal : colorBo;

              return (
                <div style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {titol}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {menorEsMillor ? 'menor és millor' : 'major és millor'}
                    </div>
                  </div>

                  {/* Barra A */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 110, fontSize: 12, fontWeight: guanyaA ? 700 : 500, color: guanyaA ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nomA}>
                      {guanyaA ? '🏆 ' : ''}{nomA}
                    </div>
                    <div style={{ flex: 1, height: 22, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${pctA}%`, height: '100%', background: colorA, borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: colorA }}>
                      {numA.toFixed(2)}{unitat}
                    </div>
                  </div>

                  {/* Barra B */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 110, fontSize: 12, fontWeight: !guanyaA ? 700 : 500, color: !guanyaA ? 'var(--text-primary)' : 'var(--text-secondary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nomB}>
                      {!guanyaA ? '🏆 ' : ''}{nomB}
                    </div>
                    <div style={{ flex: 1, height: 22, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{ width: `${pctB}%`, height: '100%', background: colorB, borderRadius: 4, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: colorB }}>
                      {numB.toFixed(2)}{unitat}
                    </div>
                  </div>

                  {/* Diferencia en text pla, fàcil de llegir */}
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Diferència: <strong style={{ color: '#22c55e' }}>{diff.toFixed(1)}%</strong>{' '}
                    {guanyaA ? `a favor de ${nomA}` : `a favor de ${nomB}`}.
                  </div>
                </div>
              );
            };

            return (
              <div style={{ ...S.card, marginBottom: 16, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                      Comparativa cara a cara
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {nomA} vs {nomB}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5, maxWidth: 540 }}>
                      Tria qualsevol fila de la taula per comparar-la amb el millor escenari. Els valors es pinten amb barres proporcionals; el guanyador surt en verd amb un trofeu.
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedScenarioId('')}
                    style={{ ...S.btn, fontSize: 12 }}
                  >
                    Tancar comparativa
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
                  {pintarMetrica('Latència mitjana', best.avgLatency, selectedScenarioSummary.avgLatency, ' ms', true)}
                  {pintarMetrica('Throughput', best.avgThroughput, selectedScenarioSummary.avgThroughput, ' msg/s', false)}
                  {pintarMetrica("Taxa d'error", best.avgErrorRate, selectedScenarioSummary.avgErrorRate, ' %', true)}
                </div>
              </div>
            );
          })()}

          {/* Metric glossary - collapsible reference panel */}

          {/* Full comparison table */}
          <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{t('resultats.history.tableTitle')}</span>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4 }}>{t('resultats.history.tableHint')}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>{sorted.length} {t('resultats.history.scenariosExecuted')}</span>
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
                    <th style={S.th}>{t('resultats.history.tableScenario')}</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>{t('resultats.history.tableScore')}</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>{t('resultats.history.tableAvgLatency')}</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>P50</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>P95</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>P99</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Throughput</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Error %</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>{t('resultats.history.tableMeasures')}</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>{t('resultats.history.tableArchitectureShort')}</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>{t('resultats.history.tableProtocol')}</th>
                    <th style={{ ...S.th, textAlign: 'center' }}>{t('resultats.history.tablePlatform')}</th>
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
                    const score = getScoreValue(scoreMap.get(s.runId || s.scenarioId));
                    const errRate = s.avgErrorRate ?? 0;
                    const isSelected = selectedScenarioId === s.scenarioId;

                    return (
                      <tr
                        key={i}
                        onClick={() => setSelectedScenarioId(prev => prev === s.scenarioId ? '' : s.scenarioId)}
                        style={{
                          ...S.tableRow,
                          background: isSelected
                            ? 'rgba(37,99,235,0.06)'
                            : isBest ? 'rgba(34,197,94,0.04)' : 'transparent',
                          borderLeft: `3px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {/* Scenario name + data format sub-label */}
                        <td style={{ ...S.td, fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isBest && <span style={{ color: 'var(--accent)', flexShrink: 0 }}><IconTrophy /></span>}
                            <div title={nameMap[s.scenarioId] || s.scenarioId} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nameMap[s.scenarioId] || s.scenarioId?.slice(0, 12) || '-'}
                            </div>
                          </div>
                          {/* Data format shown as a colored sub-label below the scenario name */}
                          <div style={{ fontSize: 10, color: dfColor, fontWeight: 600, marginTop: 2 }}>{dataFormatLabel(df)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2 }}>{s.runCount} {s.runCount !== 1 ? t('resultats.history.runs') : t('resultats.history.run')}</div>
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

                        {/* Total telemetry measures accumulated across all executions of the scenario */}
                        <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)' }}>
                          {getScenarioMeasureCount(s) || '-'}
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

                        {/* Platform badge */}
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

          </div>

          {selectedScenarioDetail && (
            <MetricsDetailDrawer
              open={!!selectedScenarioDetail}
              onClose={() => setSelectedScenarioId('')}
              eyebrow={t('resultats.drawer.title')}
              title={selectedScenarioDetail.scenarioName}
              monoId={selectedScenarioDetail.scenarioId || undefined}
              subtitle={t('resultats.drawer.subtitle')}
              accent={PLATFORM_COLORS[normalizePlatform(selectedScenarioDetail.platform)] || 'var(--accent)'}
              badges={[
                { label: `${selectedScenarioDetail.runCount} ${t('resultats.history.runs')}`, color: '#3b82f6' },
                ...(selectedScenarioDetail.architecture ? [{ label: selectedScenarioDetail.architecture, color: ARCHITECTURE_COLORS[selectedScenarioDetail.architecture] || '#2563eb' }] : []),
                ...(selectedScenarioDetail.protocol ? [{ label: selectedScenarioDetail.protocol, color: PROTOCOL_COLORS[selectedScenarioDetail.protocol] || '#16a34a' }] : []),
                ...(selectedScenarioDetail.platform ? [{ label: normalizePlatform(selectedScenarioDetail.platform), color: PLATFORM_COLORS[normalizePlatform(selectedScenarioDetail.platform)] || '#64748b' }] : []),
                { label: dataFormatLabel(selectedScenarioDetail.dataFormat), color: DATA_FORMAT_COLORS[selectedScenarioDetail.dataFormat] || '#64748b' },
              ]}
              stats={[
                {
                  label: t('resultats.drawer.statMeasures'),
                  value: selectedScenarioDetail.totalMeasures,
                  helper: t('resultats.drawer.statMeasuresHelper'),
                  color: '#22c55e',
                },
                {
                  label: t('resultats.drawer.statReceived'),
                  value: selectedScenarioDetail.totalMessagesReceived,
                  helper: t('resultats.drawer.statReceivedHelper'),
                  color: '#3b82f6',
                },
                {
                  label: t('resultats.drawer.statSent'),
                  value: selectedScenarioDetail.totalMessagesSent,
                  helper: t('resultats.drawer.statSentHelper'),
                  color: '#f59e0b',
                },
                {
                  label: t('resultats.drawer.statScore'),
                  value: selectedScenarioScore,
                  helper: t('resultats.drawer.statScoreHelper'),
                  color: 'var(--text-primary)',
                },
              ]}
              sections={[
                {
                  title: t('resultats.drawer.sectionAggregate'),
                  items: [
                    { label: t('resultats.drawer.avgLatency'), value: selectedScenarioDetail.avgLatency != null ? `${Number(selectedScenarioDetail.avgLatency).toFixed(2)} ms` : '-' },
                    { label: t('resultats.drawer.avgThroughput'), value: selectedScenarioDetail.avgThroughput != null ? `${Number(selectedScenarioDetail.avgThroughput).toFixed(2)} msg/s` : '-' },
                    { label: t('resultats.drawer.errorRate'), value: selectedScenarioDetail.avgErrorRate != null ? `${Number(selectedScenarioDetail.avgErrorRate).toFixed(3)} %` : '-' },
                    { label: t('resultats.drawer.latestRun'), value: selectedScenarioDetail.latestRunId ? <code style={{ fontFamily: 'var(--font-mono)' }}>{selectedScenarioDetail.latestRunId}</code> : '-' },
                  ],
                },
                {
                  title: t('resultats.drawer.sectionWindow'),
                  items: [
                    { label: t('resultats.drawer.firstStart'), value: formatDateTime(selectedScenarioDetail.firstStartedAt, locale) },
                    { label: t('resultats.drawer.latestStart'), value: formatDateTime(selectedScenarioDetail.latestStartedAt, locale) },
                    { label: t('resultats.drawer.latestEnd'), value: formatDateTime(selectedScenarioDetail.latestEndedAt, locale) },
                    { label: t('resultats.drawer.scenarioId'), value: <code style={{ fontFamily: 'var(--font-mono)' }}>{selectedScenarioDetail.scenarioId}</code> },
                  ],
                },
                {
                  title: t('resultats.drawer.sectionLatestRun'),
                  items: [
                    { label: 'P50', value: selectedScenarioDetail.latestRun?.p50Latency != null ? `${Number(selectedScenarioDetail.latestRun.p50Latency).toFixed(2)} ms` : '-' },
                    { label: 'P95', value: selectedScenarioDetail.latestRun?.p95Latency != null ? `${Number(selectedScenarioDetail.latestRun.p95Latency).toFixed(2)} ms` : '-' },
                    { label: 'P99', value: selectedScenarioDetail.latestRun?.p99Latency != null ? `${Number(selectedScenarioDetail.latestRun.p99Latency).toFixed(2)} ms` : '-' },
                    { label: t('resultats.drawer.colMeasures'), value: selectedScenarioDetail.latestRun ? getScenarioMeasureCount(selectedScenarioDetail.latestRun) : '-' },
                  ],
                },
              ]}
            >
              <ScoreBreakdownPanel breakdown={selectedScenarioScoreBreakdown} t={t} />

              {/*
                Detall per execució individual.
                L'usuari volia veure cada execució que ha contribuit a
                l'agregat (no nomes el resum). Aquesta taula llista cada
                run amb la seva data, durada, latencia i errors. Aixi
                pot saber d'on surten els nombres de la fila superior.
              */}
              {selectedScenarioDetail.runs && selectedScenarioDetail.runs.length > 0 && (
                <div style={{ marginTop: 14, ...S.card }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {t('resultats.drawer.runsTitle')} ({selectedScenarioDetail.runs.length})
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.55 }}>
                    {t('resultats.drawer.runsDescription')}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-disabled)', fontWeight: 700 }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>{t('resultats.drawer.colRunId')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('resultats.drawer.colStatus')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('resultats.drawer.colStart')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('resultats.drawer.colDuration')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('resultats.drawer.colMeasures')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('resultats.drawer.colMessages')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>P50</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>P95</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>P99</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('resultats.drawer.avgLatency')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('resultats.drawer.avgThroughput')}</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Error %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedScenarioDetail.runs.map((run: any) => {
                          const started = run.startedAt ? Date.parse(run.startedAt) : 0;
                          const ended = run.endedAt ? Date.parse(run.endedAt) : 0;
                          const duration = started && ended && ended >= started ? `${Math.round((ended - started) / 1000)} s` : '-';
                          const sent = getRunSentCount(run);
                          const recv = getRunMessageCount(run);
                          const failed = run.status === 'failed' || run.status === 'error';
                          return (
                            <tr key={run.runId || run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                                {String(run.runId || run.id || '').slice(0, 12)}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: failed ? 'var(--error)' : 'var(--text-secondary)', fontWeight: 700 }}>
                                {statusLabel(run.status)}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {run.startedAt ? new Date(run.startedAt).toLocaleString(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {duration}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {getRunMeasureCount(run).toLocaleString(locale)}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {recv.toLocaleString(locale)} / {sent.toLocaleString(locale)}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {run.p50Latency != null ? `${Number(run.p50Latency).toFixed(2)} ms` : '-'}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {run.p95Latency != null ? `${Number(run.p95Latency).toFixed(2)} ms` : '-'}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {run.p99Latency != null ? `${Number(run.p99Latency).toFixed(2)} ms` : '-'}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {run.avgLatency != null ? `${Number(run.avgLatency).toFixed(2)} ms` : '-'}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                                {run.avgThroughput != null ? `${Number(run.avgThroughput).toFixed(1)} msg/s` : '-'}
                              </td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: run.avgErrorRate > 0 ? 'var(--error)' : 'var(--text-secondary)' }}>
                                {run.avgErrorRate != null ? `${Number(run.avgErrorRate).toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </MetricsDetailDrawer>
          )}
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
  run, selected, onClick, dataFormatLabel, statusLabel,
}: {
  run: any;
  selected: boolean;
  onClick: () => void;
  dataFormatLabel: (format?: string) => string;
  statusLabel: (status?: string) => string;
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
          <span style={{ ...S.badge(DATA_FORMAT_COLORS[run.dataFormat] || '#64748b'), fontSize: 10 }}>{dataFormatLabel(run.dataFormat)}</span>
        )}
      </div>

      {/* Status text label below badges */}
      <div style={{ marginTop: 8, fontSize: 11, color: isRunning ? '#22c55e' : isCompleted ? '#94a3b8' : '#f59e0b', fontWeight: 600 }}>
        {statusLabel(run.status)}
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
  const { t, language } = useTranslation();
  const locale = getLocale(language);
  // List of active/pending runs from the orchestrator
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  // ID of the currently selected run (drives metrics polling)
  const [selectedRunId, setSelectedRunId] = useState('');
  // Quick search over active runs (scenario name, platform, protocol, format...)
  const [liveSearch, setLiveSearch] = useState('');
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
  const liveDataFormatLabel = (format?: string): string => {
    const normalized = format || 'default';
    const key = `resultats.dataFormatLabels.${normalized}`;
    const translated = t(key);
    return translated === key ? DATA_FORMAT_LABELS[normalized] || normalized : translated;
  };
  const liveStatusLabel = (status?: string): string => {
    if (!status) return '-';
    const key = `execucions.status.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

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
  const visibleActiveRuns = activeRuns.filter((run: any) => {
    if (!liveSearch.trim()) return true;
    const query = liveSearch.trim().toLowerCase();
    const haystack = [
      run.scenarioName,
      run.scenarioId,
      normalizePlatform(run.platform || run.broker),
      run.protocol,
      run.architecture,
      liveDataFormatLabel(run.dataFormat || 'default'),
    ]
      .map(value => String(value || '').toLowerCase())
      .join(' ');
    return haystack.includes(query);
  });

  useEffect(() => {
    if (!selectedRunId && visibleActiveRuns.length > 0) setSelectedRunId(visibleActiveRuns[0].id);
  }, [visibleActiveRuns, selectedRunId]);

  useEffect(() => {
    const runFinished = !!selectedRunId && !activeRuns.find((run: any) => run.id === selectedRunId);
    if (runFinished) return;
    if (visibleActiveRuns.length > 0 && !visibleActiveRuns.find((run: any) => run.id === selectedRunId)) {
      setSelectedRunId(visibleActiveRuns[0].id);
    }
  }, [activeRuns, visibleActiveRuns, selectedRunId]);

  // True once the selected run has left activeRuns; drives the
  // "Finalitzat" banner and the grace-window polling behaviour.
  const selectedRunFinished = !!selectedRunId && !activeRuns.find(r => r.id === selectedRunId);

  // Metrics polling: resets and restarts when selectedRunId changes.
  //
  // No defensive timestamp filter is needed because runId is unique per
  // execution (orchestrator generates a fresh randomUUID for every run,
  // see packages/benchmark-orchestrator/src/index.ts). That means
  // /metrics?runId=X returns ONLY this run's docs; there is no stale
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
  const livePointCount = filteredMetrics.length;
  const liveMessageCount = getLiveMessageCount(filteredMetrics);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (visibleActiveRuns.length > 0 || selectedRunFinished) ? 14 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('resultats.live.runningScenario')}
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
              const label = live ? t('resultats.tabLive') : finished ? t('resultats.live.finishedBanner') : t('resultats.live.inactive');
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
                {t('resultats.live.lastUpdated')} {lastUpdate.toLocaleTimeString(locale)}
              </span>
            )}
          </div>
        </div>

        {activeRuns.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px' }}>
              <span style={{ color: 'var(--text-disabled)', display: 'flex' }}><SearchIcon /></span>
              <input
                type="text"
                value={liveSearch}
                onChange={e => setLiveSearch(e.target.value)}
                placeholder={t('resultats.live.searchPlaceholder')}
                style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text-primary)' }}
              />
              {liveSearch && (
                <button
                  onClick={() => setLiveSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, fontSize: 14, lineHeight: 1 }}
                  aria-label={t('resultats.history.clearSearch')}
                >
                  ×
                </button>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {visibleActiveRuns.length} {t('resultats.history.of')} {activeRuns.length} {t('resultats.live.visible')}
            </span>
          </div>
        )}

        {/* Run picker - horizontal scrollable row of RunCards.
            When the selected run has just finished we synthesize a virtual
            card at the end (status:'completed') so the user can still see
            which run their frozen metrics belong to. The card is
            non-selectable once removed from activeRuns; clicking it is a
            no-op; clicking another (real) active card switches away. */}
        {activeRuns.length === 0 && !selectedRunFinished ? (
          <div style={{ color: 'var(--text-disabled)', fontSize: 14 }}>{t('resultats.live.empty')}</div>
        ) : activeRuns.length > 0 && visibleActiveRuns.length === 0 ? (
          <div style={{ color: 'var(--text-disabled)', fontSize: 14 }}>{t('resultats.live.emptySearch')}</div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {visibleActiveRuns.map(r => (
              <RunCard
                key={r.id}
                run={r}
                selected={r.id === selectedRunId}
                onClick={() => setSelectedRunId(r.id)}
                dataFormatLabel={liveDataFormatLabel}
                statusLabel={liveStatusLabel}
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
              return <RunCard key={`ghost-${selectedRunId}`} run={ghost} selected onClick={() => { }} dataFormatLabel={liveDataFormatLabel} statusLabel={liveStatusLabel} />;
            })()}
          </div>
        )}

        {/* Error banner - shown when metrics fetch fails */}
        {pollError && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--error)', borderRadius: 6, fontSize: 12, color: 'var(--error)' }}>
            Error en carregar mètriques: {pollError}
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
          <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>Cap execució activa</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 20px' }}>
            Inicia un escenari des de la pàgina <strong>Escenaris</strong> i aquí apareixeran les mètriques en temps real: latència, throughput, P50 i P99.
          </div>
          <a href="/escenaris" style={{ ...S.btnPrimary as React.CSSProperties, textDecoration: 'none', display: 'inline-flex' }}>
            Anar a Escenaris
          </a>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            El comptador superior mostra missatges acumulats del run seleccionat. Els gràfics i la taula inferior mostren mesures de telemetria publicades cada 3 segons. Quan canvies d&apos;execució, tant els missatges com les mesures tornen a començar des de zero per a aquell run.
          </div>

          {/* Summary stat cards (4 columns: samples, latency avg, throughput avg, error avg) */}
          <div aria-live="polite" aria-atomic="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'Missatges rebuts', v: String(liveMessageCount), c: '#3b82f6' },
              { l: 'Latència mitjana (ms)', v: `${avg(lat)}ms`, c: '#f59e0b' },
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
                { l: 'P50 Latència (mediana)', v: `${p50v(lat)}ms`, c: '#3b82f6', desc: '50% dels missatges arriben en menys d\'aquest temps' },
                { l: 'P99 Latència (cua llarga)', v: `${p99v(lat)}ms`, c: '#7c3aed', desc: '99% dels missatges arriben en menys d\'aquest temps (pitjor cas practic)' },
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
              Finestra de mesures
              <span style={{ marginLeft: 8, color: 'var(--text-secondary)', textTransform: 'none', letterSpacing: 0 }}>
                ({windowedMetrics.length} de {livePointCount} mesures)
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
              { data: lat, color: '#f59e0b', label: 'Latència (ms)', unit: 'ms' },
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
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Últimes mesures</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-disabled)' }}>
                  {livePointCount} mesures - actualització cada 3s
                </span>
              </div>
              {/* Scrollable table body - capped at 480px height to avoid page overflow */}
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
                    {/* Reverse order: newest metrics at top */}
                    {[...filteredMetrics].reverse().map((m, i) => (
                      <tr key={i} style={S.tableRow}>
                        <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)' }}>
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString(locale) : '-'}
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
  const { t } = useTranslation();
  const [tab, setTab] = useState<'live' | 'historial'>('live');

  // Update browser tab title when the page mounts
  useEffect(() => { document.title = t('resultats.pageTitle'); }, [t]);

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
      <GlobalBenchmarkStyles />

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Resultats</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Metriques en temps real i comparatives d'arquitectures asincrones
          </p>
        </div>
        <TutorialButton page="resultats" />
      </div>

      <section style={{ ...S.card, marginBottom: 22, padding: '14px 18px', borderLeft: '3px solid var(--accent)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 5 }}>
          Abans de comparar
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          La puntuació només ordena els resultats visibles. Si canvies filtres, pot canviar. Mira també latència, throughput i errors.
        </p>
      </section>

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
