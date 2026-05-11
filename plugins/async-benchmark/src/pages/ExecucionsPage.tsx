/*
 * Pagina d'execucions.
 *
 * Mostra dues llistes:
 * 1. Runs pendents o en curs.
 * 2. Runs acabats, aturats o fallits.
 *
 * La part important es no perdre context mentre arriben dades noves. Per aixo
 * el detall obert es guarda per id i el refresc nomes canvia l'estat quan hi ha
 * dades noves de veritat.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { getLanguage, useTranslation } from '../i18n';
import { S } from '../theme';
import { MetricsDetailDrawer } from '../components/MetricsDetailDrawer';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';
import { TutorialButton } from '../components/TutorialOverlay';
import { GuideItemCard, GuidePanel } from '../components/GuidePanel';
import { FilterPanel, FilterSelect } from '../components/FilterPanel';
import { getRunMeasureCount, getRunMessageCount, getRunSentCount } from '../shared/results/historyMetrics';

// Totes les crides passen pel proxy de Backstage.
const ORCHESTRATOR   = '/api/proxy/benchmark-orchestrator';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
// Metrics API guarda l'historial persistent. L'orquestrador pot perdre runs si
// es reinicia, pero les mostres continuen existint a l'historial.
const METRICS_BASE   = '/api/proxy/metrics-api';

const LOCALE_BY_LANGUAGE: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-US',
};

const getCurrentLocale = () => LOCALE_BY_LANGUAGE[getLanguage()] || 'ca-ES';

// Configuracio visual de cada estat. "Aturada" queda separada de "Completat"
// perque pot tenir dades parcials, pero no es una prova acabada.
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', label: 'Pendent' },
  running:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'En execució' },
  completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Completat' },
  cancelled: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Aturada' },
  failed:    { color: '#ef4444', bg: 'rgba(239,68,68,0.16)',  label: 'Error' },
  error:     { color: '#ef4444', bg: 'rgba(239,68,68,0.16)',  label: 'Error' },
};

// L'API ha fet servir "failed" i "error" en moments diferents.
const isFailedRun = (r: { status?: string } | null | undefined): boolean => {
  if (!r || !r.status) return false;
  return r.status === 'failed' || r.status === 'error';
};

const buildRunsSignature = (items: any[]): string =>
  items
    .map(item => [
      item.id || item.runId || '',
      item.status || '',
      item.updatedAt || item.updated_at || item.completedAt || item.completed_at || item.endedAt || item.ended_at || '',
      item.pointCount ?? item.measureCount ?? '',
    ].join(':'))
    .sort()
    .join('|');

const sameMetricPoints = (prev: any[], next: any[]): boolean => {
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (
      String(a.id || a.timestamp || a.ts || i) !== String(b.id || b.timestamp || b.ts || i) ||
      String(a.updatedAt || a.updated_at || '') !== String(b.updatedAt || b.updated_at || '')
    ) {
      return false;
    }
  }
  return true;
};

// Colors dels badges de plataforma.
const PLATFORM_COLORS: Record<string, string> = {
  'Kafka':       '#ef4444',
  'Confluent':   '#3b82f6',
  'RabbitMQ':    '#f59e0b',
  'NATS Server': '#22c55e',
};


// Pesos que expliquen d'on surt la puntuacio del detall.
const METRIC_WEIGHTS: Record<string, { weight: number; label: string; unit: string; direction: 'lower' | 'higher' }> = {
  p99Latency:   { weight: 0.35, label: 'Latència P99',   unit: 'ms',    direction: 'lower'  },
  throughput:   { weight: 0.30, label: 'Throughput',      unit: 'msg/s', direction: 'higher' },
  errorRate:    { weight: 0.20, label: "Taxa d'error",    unit: '%',     direction: 'lower'  },
  cpuUsage:     { weight: 0.08, label: 'CPU',             unit: '%',     direction: 'lower'  },
  memoryUsage:  { weight: 0.07, label: 'Memòria',         unit: 'MB',    direction: 'lower'  },
};

// Normalitza noms curts com "nats" per poder pintar sempre el badge correcte.
const normalizePlatform = (p?: string): string => {
  if (!p) return '';
  const map: Record<string, string> = {
    'kafka':       'Kafka',
    'confluent':   'Confluent',
    'rabbitmq':    'RabbitMQ',
    'nats server': 'NATS Server',
    'nats':        'NATS Server', // short alias used by some scenario configs
  };
  return map[p.toLowerCase()] ?? p;
};

// Etiquetes i colors dels formats que apareixen a la taula.
const DATA_FORMAT_LABELS: Record<string, string> = {
  'default':   'Per defecte',
  'video-4k':  'Video 4K',
  'video-8k':  'Video 8K',
  'financial': 'Financer',
  'iot':       'IoT',
};

const DATA_FORMAT_COLORS: Record<string, string> = {
  'default':   '#64748b', // neutral slate - no special semantics
  'video-4k':  '#8b5cf6', // purple - high-bandwidth video
  'video-8k':  '#7c3aed', // darker purple - even higher bandwidth
  'financial': '#0ea5e9', // sky blue - financial data
  'iot':       '#10b981', // green - IoT sensor streams
};

// Colors dels badges de protocol.
const PROTOCOL_COLORS: Record<string, string> = {
  'Kafka':  '#ef4444',
  'AMQP':   '#f97316',
  'MQTT':   '#eab308',
  'gRPC':   '#8b5cf6',
  'WS':     '#3b82f6',
  'NATS':   '#22c55e',
};

const VISIBLE_PROTOCOLS = ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'WS', 'NATS'];

// Colors dels badges d'arquitectura.
const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA':  '#2563eb',
  'QBA':  '#9333ea',
  'LCA':  '#16a34a',
  'EMA':  '#dc2626',
  'SEA':  '#d97706',
};

// Placeholder visual mentre carreguen les dades.
const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

// Icones petites sense dependencia externa.
const SearchIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const StopIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.2"/><path d="M3 12a9 9 0 0 1 15.5-6.2"/><path d="M18 3v5h-5"/><path d="M6 21v-5h5"/></svg>;
const TrashIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const TrashAllIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const ActivityIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const ListIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const EmptyIcon   = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const WarnIcon    = ({ color = 'var(--error)' }: { color?: string }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
/*
 * CheckboxIcon
 * Returns one of two SVG elements depending on the checked state.
 * Called as a function (not a JSX component) so it can be used inline
 * without introducing an extra React element wrapper.
 */
const CheckboxIcon = (checked: boolean) => checked
  ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--accent)"/><path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  : <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/></svg>;
/*
 * IndetermIcon
 * Shown in the select-all header checkbox when some (but not all) rows are
 * selected - the standard "indeterminate" state for bulk selection UIs.
 */
const IndetermIcon = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/></svg>;

// Utility helpers

/*
 * formatDuration
 * Converts a start ISO timestamp (and optional end timestamp) into a compact
 * human-readable duration string.
 * - For active runs, `end` is omitted so the current time is used, giving a
 *   live elapsed-time counter when the component re-renders on each poll.
 * - Bucketed into ms / s / m+s to stay readable at any scale.
 */
const formatDuration = (start: string, end?: string) => {
  if (!start) return '-';
  const ms = new Date(end || new Date().toISOString()).getTime() - new Date(start).getTime();
  if (ms < 0) return '-'; // guard against clock skew or bad data
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

/*
 * formatTime
 * Formats an ISO datetime string to a compact Catalan locale date+time string
 * (DD/MM/YY HH:MM). Returns '-' for empty/null values so the cell is never blank.
 */
const formatTime = (iso: string) =>
  !iso ? '-' : new Date(iso).toLocaleString(getCurrentLocale(), {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

/*
 * getStartTime
 * The orchestrator API has used different field names for the run start
 * timestamp across schema versions (camelCase vs snake_case, "started" vs
 * "created"). This function tries each known field name in order so the UI
 * works correctly regardless of which API version is running.
 * Priority: startedAt > started_at > createdAt > created_at > timestamp
 */
const getStartTime = (r: any): string =>
  r.startedAt || r.started_at || r.createdAt || r.created_at || r.timestamp || '';

const formatDateTime = (iso?: string) =>
  !iso ? '-' : new Date(iso).toLocaleString(getCurrentLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatMetricNumber = (value: unknown, decimals = 2): string => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  return numericValue.toLocaleString(getCurrentLocale(), {
    maximumFractionDigits: decimals,
  });
};

const formatMetricWithUnit = (value: unknown, unit: string, decimals = 2): string => {
  const formattedValue = formatMetricNumber(value, decimals);
  return formattedValue === '-' ? 'Encara no disponible' : `${formattedValue} ${unit}`;
};

const getRunDataFormat = (run: any, scenarioMap: Record<string, any>) =>
  run.dataFormat || scenarioMap[run.scenarioId]?.dataFormat || 'default';

const isRunActive = (run: any): boolean =>
  run?.status === 'running' || run?.status === 'pending';

const getMetricTimestamp = (metric: any): string =>
  metric?.timestamp || metric?.createdAt || metric?.created_at || '';

const getLastMetricPoint = (metrics: any[]): any | null =>
  metrics.length > 0 ? metrics[metrics.length - 1] : null;

const enrichRunWithMetricPoints = (run: any, metrics: any[]): any => {
  const lastMetric = getLastMetricPoint(metrics);
  if (!lastMetric) {
    return run;
  }

  const firstMetric = metrics[0];
  const startedAt = getStartTime(run) || getMetricTimestamp(firstMetric);
  const completedAt =
    run.completedAt ||
    run.completed_at ||
    run.endedAt ||
    run.ended_at ||
    (isRunActive(run) ? '' : getMetricTimestamp(lastMetric));

  return {
    ...lastMetric,
    ...run,
    id: run.id || run.runId || lastMetric.runId,
    runId: run.runId || run.id || lastMetric.runId,
    scenarioId: run.scenarioId || lastMetric.scenarioId,
    architecture: run.architecture || lastMetric.architecture,
    protocol: run.protocol || lastMetric.protocol,
    platform: run.platform || lastMetric.platform || lastMetric.broker,
    broker: run.broker || lastMetric.broker,
    dataFormat: run.dataFormat || lastMetric.dataFormat,
    startedAt,
    completedAt,
    endedAt: run.endedAt || run.ended_at || completedAt,
    pointCount: metrics.length,
    measureCount: metrics.length,
    messagesSent: lastMetric.messagesSent ?? lastMetric.messages_sent ?? run.messagesSent ?? run.messages_sent,
    messagesRecv: lastMetric.messagesRecv ?? lastMetric.messages_recv ?? run.messagesRecv ?? run.messages_recv ?? run.count,
    count: lastMetric.messages_recv ?? lastMetric.messagesRecv ?? run.count,
    avgLatency: lastMetric.avgLatency ?? lastMetric.latency ?? run.avgLatency,
    avgThroughput: lastMetric.avgThroughput ?? lastMetric.throughput_stable ?? lastMetric.throughput ?? run.avgThroughput,
    avgErrorRate: lastMetric.avgErrorRate ?? lastMetric.errorRate ?? run.avgErrorRate,
    p50Latency: lastMetric.p50Latency ?? lastMetric.p50_latency_ms ?? run.p50Latency,
    p95Latency: lastMetric.p95Latency ?? lastMetric.p95_latency_ms ?? run.p95Latency,
    p99Latency: lastMetric.p99Latency ?? lastMetric.p99_latency_ms ?? run.p99Latency,
  };
};

// Guia curta de la pàgina. Els textos venen del diccionari per canviar d'idioma.
const ExecucionsGuide = ({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) => {
  const { t, tRaw } = useTranslation();
  const items = (tRaw('execucions.guide.items') as { title: string; text: string }[] | undefined) ?? [];
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

  return (
    <GuidePanel
      title={t('execucions.guide.title')}
      subtitle={t('execucions.guide.subtitle')}
      open={open}
      onToggle={onToggle}
      showLabel={t('scenarios.guide.show')}
      hideLabel={t('scenarios.guide.hide')}
      marginBottom={20}
    >
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        {items.map((item, index) => (
          <GuideItemCard key={item.title} title={item.title} text={item.text} color={colors[index % colors.length]} />
        ))}
      </div>
    </GuidePanel>
  );
};

/*
 * Modal de confirmacio compartit.
 *
 * El fem servir per aturar, esborrar i reiniciar. El color vermell queda per
 * accions destructives. Aturar una execucio usa color d'avis per deixar clar
 * que conserva les dades parcials que ja hagin arribat.
 */
const ConfirmModal = ({
  open, title, message, onConfirm, onCancel, confirmLabel = 'Esborra', danger = true,
}: {
  open: boolean; title: string; message: React.ReactNode;
  onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) => {
  // Quan esta tancat no cal deixar cap node al DOM.
  if (!open) return null;
  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onCancel}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />

      {/* Evita que clicar dins el panell tanqui el modal. */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.15s ease' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{ flexShrink: 0, padding: 10, borderRadius: 10, background: danger ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.10)', display: 'flex' }}>
            <WarnIcon color={danger ? 'var(--error)' : 'var(--warning)'} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ ...S.btn }}>Cancel·la</button>
          <button
            onClick={onConfirm}
            style={{ ...S.btnPrimary, background: danger ? 'var(--error)' : 'var(--warning)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/*
 * Taula de runs.
 *
 * S'usa dues vegades: una per runs actius i una per historial. La prop
 * showStop decideix si la fila mostra el boto d'aturar o les accions
 * d'historial.
 */
const RunTable = ({
  data, title, showStop, icon, totalCount,
  searchValue, onSearchChange,
  onCancel, onRequestDelete, onBulkDelete, onDeleteAll,
  cancellingId, deletingIds, scenarioMap,
  selectedIds, onToggleSelect, onToggleAll, selectedRunId, onSelectRun,
}: {
  data: any[]; title: string; showStop: boolean; icon: React.ReactNode;
  totalCount?: number;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onCancel: (run: any) => void;
  onRequestDelete: (run: any) => void;
  onBulkDelete: (ids: string[]) => void;
  onDeleteAll: () => void;
  cancellingId: string | null;
  deletingIds: Set<string>;
  scenarioMap: Record<string, any>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[], allSelected: boolean) => void;
  selectedRunId?: string | null;
  onSelectRun?: (run: any) => void;
}) => {
  const { t } = useTranslation();
  // Track which row the mouse is over to highlight it without global state
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  /*
   * Selectable rows are only finished runs (not running/pending).
   * Active runs cannot be bulk-deleted - they must be stopped first.
   * This prevents accidentally deleting runs that are still producing data.
   */
  const selectableIds = data
    .filter(r => r.status !== 'running' && r.status !== 'pending')
    .map(r => r.id)
    .filter(Boolean);

  // Derive checkbox header state from the intersection of selectable and selected IDs
  const selectedHere = selectableIds.filter(id => selectedIds.has(id));
  const allSelected  = selectableIds.length > 0 && selectedHere.length === selectableIds.length;
  const someSelected = selectedHere.length > 0 && !allSelected; // indeterminate state

  return (
    <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
      {/* Table header bar - contains title, row count, optional search, and action buttons */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
            {title}
          </span>
          {/* Row count badge - shows filtered/total when a search is active */}
          <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
            {data.length}{totalCount !== undefined && totalCount !== data.length ? ` / ${totalCount}` : ''} {data.length === 1 ? t('execucions.table.record') : t('execucions.table.records')}
          </span>
          {/* Search input - only rendered for the history table (when onSearchChange is provided) */}
          {onSearchChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-subtle)', border: `1px solid ${searchValue ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, padding: '3px 9px', minWidth: 180, transition: 'border-color 0.15s' }}>
              <span style={{ color: searchValue ? 'var(--accent)' : 'var(--text-disabled)', display: 'flex', flexShrink: 0 }}><SearchIcon /></span>
              <input
                type="text"
                placeholder="Cerca per escenari, plataforma, protocol o estat"
                value={searchValue || ''}
                onChange={e => onSearchChange(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font)', width: '100%' }}
              />
              {/* Clear button - only shown when there is an active search query */}
              {searchValue && (
                <button onClick={() => onSearchChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, display: 'flex', fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Bulk-action toolbar - only visible when at least one row is selected */}
          {selectedHere.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.20)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--error)' }}>
                {selectedHere.length} seleccionat{selectedHere.length !== 1 ? 's' : ''}
              </span>
              <div style={{ width: 1, height: 14, background: 'rgba(239,68,68,0.25)' }} />
              <button
                onClick={() => onBulkDelete(selectedHere)}
                style={{ ...S.btn, fontSize: 12, padding: '3px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.30)', gap: 4 }}
              >
                <TrashIcon /> {t('execucions.table.btnDeleteSelected')}
              </button>
            </div>
          )}

          {/* "Delete all" button - only shown in the history table (showStop=false) and when rows exist */}
          {!showStop && data.length > 0 && (
            <button
              onClick={onDeleteAll}
              style={{ ...S.btn, fontSize: 12, padding: '4px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.25)', gap: 4 }}
            >
              <TrashAllIcon /> {t('execucions.table.btnDeleteAll')}
            </button>
          )}

        </div>
      </div>

      {/* Empty state - shown when data array is empty (e.g. no active runs) */}
      {data.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <EmptyIcon />
          <p style={{ color: 'var(--text-disabled)', margin: 0, fontSize: 14 }}>{t('execucions.table.empty')}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={S.tableHeader}>
                {/* Select-all checkbox - only rendered in the history table */}
                {!showStop && (
                  <th style={{ ...S.th, width: 40, textAlign: 'center', paddingLeft: 16, paddingRight: 8 }}>
                    <button
                      onClick={() => onToggleAll(selectableIds, allSelected)}
                      style={{ background: 'none', border: 'none', cursor: selectableIds.length > 0 ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectableIds.length > 0 ? 1 : 0.3 }}
                      disabled={selectableIds.length === 0}
                      title={allSelected ? t('execucions.table.deselectAll') : t('execucions.table.selectAll')}
                    >
                      {/* Show indeterminate icon if some but not all rows are selected */}
                      {someSelected ? <IndetermIcon /> : CheckboxIcon(allSelected)}
                    </button>
                  </th>
                )}
                <th style={S.th}>{t('execucions.table.colScenario')}</th>
                <th style={{ ...S.th, textAlign: 'center' }}>{t('execucions.table.colArchitecture')}</th>
                <th style={{ ...S.th, textAlign: 'center' }}>{t('execucions.table.colProtocol')}</th>
                <th style={{ ...S.th, textAlign: 'center' }}>{t('execucions.table.colPlatform')}</th>
                <th style={{ ...S.th, textAlign: 'center' }}>{t('execucions.table.colFormat')}</th>
                <th style={{ ...S.th, textAlign: 'center' }}>{t('execucions.table.colStatus')}</th>
                <th style={{ ...S.th, textAlign: 'right' }}>{t('execucions.table.colDuration')}</th>
                <th style={{ ...S.th, textAlign: 'right' }}>{t('execucions.table.colStarted')}</th>
                <th style={{ ...S.th, textAlign: 'center', width: 90 }}>{t('execucions.table.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => {
                // Resolve the status config - fall back to a neutral style for unknown statuses
                const baseStatus = STATUS_CONFIG[r.status] || { color: '#94a3b8', bg: 'transparent', label: r.status };
                const st        = { ...baseStatus, label: t(`execucions.status.${r.status}`) !== `execucions.status.${r.status}` ? t(`execucions.status.${r.status}`) : baseStatus.label };
                // Active runs get the live pulsing dot in their status badge
                const isActive  = r.status === 'running' || r.status === 'pending';
                // Normalize the platform name so PLATFORM_COLORS lookup works reliably
                const platform  = normalizePlatform(r.platform || r.broker);
                const platColor = PLATFORM_COLORS[platform] || 'var(--text-secondary)';
                // Look up the scenario definition for metadata fallback (e.g. dataFormat)
                const sc        = scenarioMap[r.scenarioId];
                /*
                 * Data format resolution order:
                 *   1. r.dataFormat - value embedded in the run record by the orchestrator
                 *   2. sc.dataFormat - value from the scenario definition (fetched separately)
                 *   3. 'default' - fallback when neither source has the field
                 * This two-source approach handles both old run records (which pre-date the
                 * dataFormat field on runs) and new runs where it is always present.
                 */
                const df        = r.dataFormat || sc?.dataFormat || 'default';
                const dfLabel   = DATA_FORMAT_LABELS[df] || df; // human-readable label
                const dfColor   = DATA_FORMAT_COLORS[df] || '#64748b'; // badge accent color
                const isSelected = selectedIds.has(r.id);
                const isDeleting = deletingIds.has(r.id); // fades the row during async delete
                const isDetailSelected = selectedRunId === r.id;
                // Si la run ha fallat, ressaltem la fila amb fons vermell suau
                // i una linia esquerra vermella ben visible. Aixo crida l'atencio
                // immediata a errors sense haver de mirar la columna "Estat".
                const failed = isFailedRun(r);

                return (
                  <tr
                    key={r.id || i}
                    onMouseEnter={() => setHoveredRow(i)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => onSelectRun?.(r)}
                    style={{
                      ...S.tableRow,
                      // Prioritat de fons: error > seleccio > detall obert > hover
                      background: failed
                        ? 'rgba(239,68,68,0.10)'
                        : isSelected
                          ? 'rgba(239,68,68,0.04)'
                          : isDetailSelected
                            ? 'rgba(37,99,235,0.06)'
                            : hoveredRow === i ? 'var(--bg-hover)' : 'transparent',
                      opacity: isDeleting ? 0.45 : 1,
                      transition: 'background var(--transition), opacity 0.2s ease',
                      // Linia esquerra de 3px: vermella si error, blava si seleccionat al detall
                      borderLeft: `3px solid ${failed ? '#ef4444' : isDetailSelected ? 'var(--accent)' : 'transparent'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Row-level checkbox - only in history table; active rows are not selectable */}
                    {!showStop && (
                      <td style={{ ...S.td, width: 40, paddingLeft: 16, paddingRight: 8, textAlign: 'center' }}>
                        {!isActive && (
                          <button
                            onClick={event => { event.stopPropagation(); onToggleSelect(r.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={isSelected ? t('execucions.table.deselect') : t('execucions.table.select')}
                          >
                            {CheckboxIcon(isSelected)}
                          </button>
                        )}
                      </td>
                    )}

                    {/* Scenario name - resolves via scenarioMap for synthetic (ES-only) rows
                        where `scenarioName` was set to the raw scenarioId during merge.
                        Falls back to a truncated ID if neither the run nor the scenario
                        definition provides a friendly name. */}
                    <td style={{ ...S.td, fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(sc?.name || (r.scenarioName && r.scenarioName !== r.scenarioId ? r.scenarioName : null))
                        ?? <span style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.scenarioId?.slice(0, 10) || r.id?.slice(0, 10) || '-'}</span>}
                    </td>

                    {/* Architecture badge - uses ARCHITECTURE_COLORS for color, defaults to blue */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.architecture
                        ? <span style={{ ...S.badge(ARCHITECTURE_COLORS[r.architecture] || '#2563eb'), fontSize: 11 }}>{r.architecture}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>

                    {/* Protocol badge */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.protocol
                        ? <span style={{ ...S.badge(PROTOCOL_COLORS[r.protocol] || '#16a34a'), fontSize: 11 }}>{r.protocol}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>

                    {/* Platform badge - uses normalized name for consistent color lookup */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {platform
                        ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{platform}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>

                    {/* Data format badge - always renders (falls back to 'Per defecte') */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ ...S.badge(dfColor), fontSize: 11 }}>{dfLabel}</span>
                    </td>

                    {/* Status badge - active runs show a pulsing dot to signal live activity */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}30`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, display: 'inline-block', animation: isActive ? 'pulseDot 1.5s ease infinite' : 'none', boxShadow: `0 0 0 2px ${st.color}22` }} />
                        {st.label}
                      </span>
                    </td>

                    {/* Duration - for active runs computes live elapsed time; for finished runs uses end timestamp */}
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {isActive
                        ? formatDuration(getStartTime(r)) // end=undefined -> uses current time
                        : formatDuration(getStartTime(r), r.completedAt || r.completed_at || r.updatedAt || r.updated_at)}
                    </td>

                    {/* Start time - uses getStartTime() for field-name robustness across API versions */}
                    <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(getStartTime(r))}
                    </td>

                    {/* Actions column - stop button for active runs, delete button for finished runs */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        {/* Stop button - only for active runs in the live table */}
                        {showStop && isActive && (
                          <button
                            onClick={event => { event.stopPropagation(); onCancel(r); }}
                            disabled={cancellingId === r.id}
                            title={t('execucions.table.btnStop')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 9px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.32)',
                              background: 'rgba(245,158,11,0.12)', color: '#d97706',
                              cursor: cancellingId === r.id ? 'not-allowed' : 'pointer',
                              fontSize: 11, fontWeight: 800,
                              opacity: cancellingId === r.id ? 0.6 : 1,
                              fontFamily: 'var(--font)',
                            }}
                          >
                            {/* Show "..." while the cancel request is in-flight */}
                            <StopIcon /> {cancellingId === r.id ? '...' : t('execucions.table.btnStop')}
                          </button>
                        )}
                        {/* Delete button - only for finished rows (not active) */}
                        {!isActive && (
                          <button
                            onClick={event => { event.stopPropagation(); onRequestDelete(r); }}
                            disabled={isDeleting}
                            title={t('execucions.table.btnDelete')}
                            style={{
                              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                              padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                              color: 'var(--error)', opacity: isDeleting ? 0.5 : 1,
                              transition: 'border-color var(--transition), background var(--transition)',
                            }}
                          >
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

// Component principal: carrega dades, aplica filtres i obre el detall.
export const ExecucionsPage = () => {
  const { t } = useTranslation();
  // Runs que mostra la pagina. Poden venir de l'orquestrador o de l'historial.
  const [runs,          setRuns]          = useState<any[]>([]);
  // Escenaris carregats per completar nom, format i altres camps si el run no els porta.
  const [scenarios,     setScenarios]     = useState<any[]>([]);
  // Carrega inicial o refresc manual.
  const [loading,       setLoading]       = useState(true);
  // Run que s'esta aturant ara mateix.
  const [cancellingId,  setCancellingId]  = useState<string | null>(null);
  // Runs que s'estan esborrant.
  const [deletingIds,   setDeletingIds]   = useState<Set<string>>(new Set());
  // Missatge temporal de feedback.
  const [toast,         setToast]         = useState('');
  // Seleccio per esborrar diversos runs de l'historial.
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  // Cerca propia de la taula d'historial.
  const [historySearch, setHistorySearch] = useState('');
  // Cerca comuna aplicada a runs actius i historial.
  const [runSearch,     setRunSearch]     = useState('');
  const [refreshing,    setRefreshing]    = useState(false);
  const [refreshError,  setRefreshError]  = useState('');
  const hasLoadedRunsRef = useRef(false);
  const runsSignatureRef = useRef('');
  const [filterPlatform, setFilterPlatform] = useState<string[]>([]);
  const [filterProtocol, setFilterProtocol] = useState<string[]>([]);
  const [filterArchitecture, setFilterArchitecture] = useState<string[]>([]);
  const [filterDataFormat, setFilterDataFormat] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterScenario, setFilterScenario] = useState<string[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunMetrics, setSelectedRunMetrics] = useState<any[]>([]);
  const [selectedRunMetricsLoading, setSelectedRunMetricsLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // Hora de l'ultima actualitzacio correcta.
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // Quan una execucio s'atura, el generador pot trigar uns segons a guardar
  // l'ultima mostra. Mantenim un refresc curt per recollir aquest tancament.
  const [postRunRefreshUntil, setPostRunRefreshUntil] = useState(0);

  // Un sol modal de confirmacio evita tenir estats separats per cada accio.
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmLabel?: string; // overrides the default "Esborra" button label
    danger?: boolean;      // false = accent-colored button; true = red (default)
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Set the browser tab title once on mount
  useEffect(() => { document.title = t('execucions.pageTitle'); }, [t]);

  /*
   * Fetch scenario definitions once on mount (no polling needed - scenarios
   * rarely change). Used to populate scenarioMap so run rows can show the
   * dataFormat even when the run record itself does not carry that field.
   */
  useEffect(() => {
    fetch(`${SCENARIOS_BASE}/scenarios`)
      .then(r => r.json())
      .then(d => setScenarios(Array.isArray(d) ? d : []))
      .catch(() => {}); // non-critical - format badges will fall back to 'default'
  }, []);

  // Build a lookup map from scenario ID to scenario object for O(1) access in render.
  // Memoized so it only re-computes when scenarios actually change, not on every runs poll.
  const scenarioMap: Record<string, any> = useMemo(
    () => Object.fromEntries(scenarios.map(s => [s.id, s])),
    [scenarios],
  );

  /*
   * fetchRuns
   * Wrapped in useCallback so the polling interval always calls the same
   * stable function reference, and so the effect below does not re-register
   * the interval on every render.
   */
  const fetchRuns = useCallback((showRefreshing = false) => {
    if (!hasLoadedRunsRef.current) {
      setLoading(true);
    }
    if (showRefreshing) {
      setRefreshing(true);
    }
    setRefreshError('');
    // Fetch BOTH sources in parallel:
    //   1. Orchestrator /runs   -> source of truth for live/pending/just-finished runs,
    //                              but only holds them in memory (lost on pod restart).
    //   2. Metrics-API /summary -> persistent ES history, one row per runId.

    // Merge strategy:
    //   - Orchestrator runs ALWAYS win when the runId exists in both lists
    //     (fresher status info: running/pending vs. completed).
    //   - ES-only rows are materialized into run-shaped objects so they appear
    //     in the history table alongside the orchestrator ones.
    //   - Result is sorted by startedAt desc so recent runs stay on top.
    Promise.all([
      fetch(`${ORCHESTRATOR}/runs`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${METRICS_BASE}/metrics/summary`).then(r => r.ok ? r.json() : []).catch(() => []),
    ])
      .then(([orchData, summaryData]) => {
        const orchRuns: any[] = Array.isArray(orchData) ? orchData : [];
        const summary:  any[] = Array.isArray(summaryData) ? summaryData : [];

        const summaryByRunId = new Map<string, any>();
        summary.forEach((s: any) => {
          if (s.runId) {
            summaryByRunId.set(String(s.runId), s);
          }
        });

        const enrichedOrchRuns = orchRuns.map(run => {
          const runId = run.id || run.runId;
          const metricsSummary = runId ? summaryByRunId.get(String(runId)) : undefined;

          if (!metricsSummary) {
            return run;
          }

          return {
            ...metricsSummary,
            ...run,
            id: runId,
            runId,
            scenarioId: run.scenarioId || metricsSummary.scenarioId,
            scenarioName: run.scenarioName || metricsSummary.scenarioName || metricsSummary.scenarioId,
            platform: run.platform || metricsSummary.platform || metricsSummary.broker,
            broker: run.broker || metricsSummary.broker,
            dataFormat: run.dataFormat || metricsSummary.dataFormat,
            startedAt: getStartTime(run) || metricsSummary.startedAt,
            completedAt: run.completedAt || run.completed_at || metricsSummary.endedAt,
            endedAt: metricsSummary.endedAt || run.completedAt || run.completed_at,
            _source: 'orchestrator+metrics',
          };
        });

        const orchIds = new Set(enrichedOrchRuns.map(r => String(r.id || r.runId)));
        // For each ES summary that is NOT already in the orchestrator list,
        // synthesize a completed run object. Unknown fields stay undefined;
        // the table renderer already handles missing badges gracefully.
        const synthetic = summary
          .filter((s: any) => s.runId && !orchIds.has(String(s.runId)))
          .map((s: any) => ({
            ...s,
            id:            s.runId,
            scenarioId:    s.scenarioId,
            scenarioName:  s.scenarioId,
            platform:      s.platform || s.broker,
            broker:        s.broker,
            status:        s.status || 'completed',
            startedAt:     s.startedAt,
            completedAt:   s.endedAt,
            _source:       'metrics',
          }));

        const merged = [...enrichedOrchRuns, ...synthetic].sort((a, b) => {
          const at = getStartTime(a) ? Date.parse(getStartTime(a)) : 0;
          const bt = getStartTime(b) ? Date.parse(getStartTime(b)) : 0;
          return bt - at;
        });

        const nextSignature = buildRunsSignature(merged);
        if (runsSignatureRef.current !== nextSignature) {
          runsSignatureRef.current = nextSignature;
          setRuns(merged);
        }
        setLastRefreshed(new Date());
        hasLoadedRunsRef.current = true;
        setLoading(false);
        if (showRefreshing) {
          setRefreshing(false);
        }
      })
      .catch(() => {
        setRefreshError(t('execucions.toasts.errorRefresh'));
        if (!hasLoadedRunsRef.current) {
          setLoading(false);
        }
        if (showRefreshing) {
          setRefreshing(false);
        }
      });
  }, [t]);

  // Track whether any runs are active so the polling interval can be skipped
  // when all runs are finished (avoids unnecessary network traffic when idle).
  const hasActiveRuns = runs.some(r => r.status === 'running' || r.status === 'pending');
  const shouldKeepPolling = hasActiveRuns || Date.now() < postRunRefreshUntil;

  // Poll every 8 s while there are active runs. After stopping a run, keep a
  // short grace window so the final metrics can arrive without a manual refresh.
  useEffect(() => {
    fetchRuns(); // initial fetch on mount
    if (!shouldKeepPolling && hasLoadedRunsRef.current) {
      return undefined;
    }
    const i = window.setInterval(() => {
      fetchRuns();
      if (!hasActiveRuns && Date.now() >= postRunRefreshUntil) {
        window.clearInterval(i);
      }
    }, 8000);
    return () => window.clearInterval(i);
  }, [fetchRuns, hasActiveRuns, postRunRefreshUntil, shouldKeepPolling]);



  // Auto-dismiss toast notifications after 3.5 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (selectedRunId && !runs.find(run => run.id === selectedRunId)) {
      setSelectedRunId(null);
    }
  }, [runs, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRunMetrics([]);
      setSelectedRunMetricsLoading(false);
      return undefined;
    }

    let cancelled = false;
    const selectedRun = runs.find(run => run.id === selectedRunId);
    const shouldPollMetrics = isRunActive(selectedRun);

    const loadSelectedRunMetrics = async () => {
      setSelectedRunMetricsLoading(true);
      try {
        const response = await fetch(`${METRICS_BASE}/metrics?runId=${encodeURIComponent(selectedRunId)}`);
        const data = response.ok ? await response.json() : [];
        if (!cancelled) {
          const nextMetrics = Array.isArray(data) ? data : [];
          setSelectedRunMetrics(prev => (sameMetricPoints(prev, nextMetrics) ? prev : nextMetrics));
        }
      } catch {
        if (!cancelled) {
          setSelectedRunMetrics([]);
        }
      } finally {
        if (!cancelled) {
          setSelectedRunMetricsLoading(false);
        }
      }
    };

    loadSelectedRunMetrics();
    const interval = shouldPollMetrics ? window.setInterval(loadSelectedRunMetrics, 5000) : undefined;

    return () => {
      cancelled = true;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [selectedRunId, runs]);

  // Local helpers

  // Close the confirmation modal without triggering the action
  const closeConfirm = () => setConfirmState(s => ({ ...s, open: false }));

  // Display a toast notification to give feedback after async operations
  const showToast = (msg: string) => setToast(msg);

  // Add a run ID to the deleting set (triggers row fade-out)
  const markDeleting = (id: string) =>
    setDeletingIds(prev => { const s = new Set(prev); s.add(id); return s; });

  // Remove a run ID from the deleting set after the delete completes (or fails)
  const unmarkDeleting = (id: string) =>
    setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });

  // Actions

  /*
   * handleCancel
   * Sends a POST /runs/:id/cancel request to stop a single active run.
   * Sets cancellingId so the row's stop button shows "..." and is disabled.
   */
  const handleCancel = async (run: any) => {
    setCancellingId(run.id);
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs/${run.id}/cancel`, { method: 'POST' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      showToast(`Execució "${run.scenarioName || run.id.slice(0, 8)}" aturada.`);
      setPostRunRefreshUntil(Date.now() + 90000);
      fetchRuns(); // refresh the list so the status badge updates immediately
    } catch (e: any) { showToast('Error en cancel·lar: ' + e.message); }
    finally { setCancellingId(null); }
  };

  /*
   * handleRequestDelete
   * Shows a confirmation modal before deleting a single run.
   * The actual DELETE request only fires if the user confirms.
   * After confirmation the run is removed from local state immediately for
   * instant UI feedback (optimistic removal), without waiting for a re-poll.
   */
  const handleRequestDelete = (run: any) => {
    const name = run.scenarioName || run.id?.slice(0, 12) || 'aquesta execució';
    setConfirmState({
      open: true,
      title: 'Estàs segur que vols esborrar?',
      message: (
        <>
          Esborraràs el registre de <strong>"{name}"</strong> i les mostres associades a aquest run.
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Aquesta acció no es pot desfer.</span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        markDeleting(run.id); // start fade-out immediately
        try {
          // ES-only (synthetic) rows don't exist in orchestrator memory, so we
          // ask metrics-api to drop every doc with that runId. Orchestrator-tracked
          // rows go through orchestrator which itself owns the cleanup logic.
          const url = run._source === 'metrics'
            ? `${METRICS_BASE}/metrics/run/${run.id}`
            : `${ORCHESTRATOR}/runs/${run.id}`;
          await fetch(url, { method: 'DELETE' });
          // Remove from local state - no re-fetch needed for a single delete
          setRuns(prev => prev.filter(r => r.id !== run.id));
          setSelectedIds(prev => { const s = new Set(prev); s.delete(run.id); return s; });
        } catch (e: any) { showToast('Error en eliminar: ' + e.message); }
        finally { unmarkDeleting(run.id); }
      },
    });
  };

  /*
   * handleBulkDelete
   * Deletes multiple selected runs in parallel using Promise.allSettled.
   * allSettled is used instead of Promise.all so that a single failed delete
   * does not prevent the others from completing - partial success is handled
   * gracefully by showing a count of succeeded vs total.
   */
  const handleBulkDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmState({
      open: true,
      title: 'Estàs segur que vols esborrar?',
      message: (
        <>
          Esborraràs <strong>{ids.length} execució{ids.length !== 1 ? 'ns' : ''}</strong> seleccionada{ids.length !== 1 ? 's' : ''}.
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Aquesta acció no es pot desfer.</span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        ids.forEach(markDeleting); // fade all selected rows immediately
        // Route each delete to the backend that actually owns the record:
        //   _source === 'metrics' -> ES only, go through metrics-api
        //   otherwise             -> orchestrator (it will also clean up ES)
        const results = await Promise.allSettled(
          ids.map(id => {
            const target = runs.find(r => r.id === id);
            const url = target?._source === 'metrics'
              ? `${METRICS_BASE}/metrics/run/${id}`
              : `${ORCHESTRATOR}/runs/${id}`;
            return fetch(url, { method: 'DELETE' });
          })
        );
        // Only remove runs whose delete requests succeeded
        const deleted = ids.filter((_, i) => results[i].status === 'fulfilled');
        setRuns(prev => prev.filter(r => !deleted.includes(r.id)));
        setSelectedIds(prev => {
          const s = new Set(prev);
          deleted.forEach(id => s.delete(id));
          return s;
        });
        ids.forEach(unmarkDeleting);
        // Warn if any individual deletes failed
        if (deleted.length < ids.length) {
          showToast(`${deleted.length} de ${ids.length} eliminades. Algunes han fallat.`);
        }
      },
    });
  };

  /*
   * handleDeleteAll
   * Deletes every finished run in the current list (running/pending runs are
   * excluded - the message says so explicitly to avoid user confusion).
   * Like handleBulkDelete, uses Promise.allSettled for resilience.
   */
  const handleDeleteAll = () => {
    const finished = runs.filter(r => r.status !== 'running' && r.status !== 'pending');
    if (finished.length === 0) return; // guard: nothing to delete
    setConfirmState({
      open: true,
      title: 'Estàs segur que vols esborrar?',
      message: (
        <>
          Esborraràs <strong>totes les {finished.length} execucions</strong> de l'historial.
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Les execucions en curs no s'esborraran. Aquesta acció no es pot desfer.</span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        const ids = finished.map((r: any) => r.id).filter(Boolean);
        ids.forEach(markDeleting);
        // Same split as handleBulkDelete: metrics-api for ES-only rows,
        // orchestrator for everything it still remembers.
        const results = await Promise.allSettled(
          finished.map((r: any) => {
            const url = r._source === 'metrics'
              ? `${METRICS_BASE}/metrics/run/${r.id}`
              : `${ORCHESTRATOR}/runs/${r.id}`;
            return fetch(url, { method: 'DELETE' });
          })
        );
        const deleted = ids.filter((_: string, i: number) => results[i].status === 'fulfilled');
        setRuns(prev => prev.filter(r => !deleted.includes(r.id)));
        setSelectedIds(new Set()); // clear all selections since the rows are gone
        ids.forEach(unmarkDeleting);
        showToast(`${deleted.length} execucions eliminades.`);
      },
    });
  };

  // Selection helpers

  /*
   * handleToggleSelect
   * Toggles a single run ID in the selectedIds set.
   * Uses functional update to avoid stale closure issues.
   */
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  /*
   * handleToggleAll
   * Called by the header checkbox in RunTable.
   * If all selectable rows are already selected it deselects them all;
   * otherwise it adds all selectable IDs to the selection.
   * Only IDs belonging to the current table are affected - selections in
   * other tables (if any) are preserved.
   */
  const handleToggleAll = (ids: string[], allSelected: boolean) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (allSelected) { ids.forEach(id => s.delete(id)); }
      else             { ids.forEach(id => s.add(id)); }
      return s;
    });
  };

  // Derived data

  const getStatusGroup = (run: any): string => {
    if (isFailedRun(run)) return 'errors';
    if (run.status === 'running') return 'running';
    if (run.status === 'pending') return 'pending';
    if (run.status === 'completed') return 'completed';
    if (run.status === 'cancelled') return 'cancelled';
    return run.status || 'unknown';
  };

  const matchesGlobalFilters = (run: any) => {
    const dataFormat = getRunDataFormat(run, scenarioMap);
    const platformName = normalizePlatform(run.platform || run.broker || '');
    if (run.protocol && !VISIBLE_PROTOCOLS.includes(run.protocol)) return false;
    if (String(platformName || run.platform || run.broker || '').toLowerCase().includes('pulsar')) return false;
    const query = runSearch.trim().toLowerCase();
    const values = [
      String(scenarioMap[run.scenarioId]?.name || run.scenarioName || run.scenarioId || '').toLowerCase(),
      String(run.architecture || '').toLowerCase(),
      String(run.protocol || '').toLowerCase(),
      String(platformName || '').toLowerCase(),
      String(DATA_FORMAT_LABELS[dataFormat] || dataFormat || '').toLowerCase(),
      String(run.status || '').toLowerCase(),
    ];

    if (query && !values.some(value => value.includes(query))) return false;
    if (filterScenario.length && !filterScenario.includes(String(run.scenarioId || run.scenarioName || ''))) return false;
    if (filterPlatform.length && !filterPlatform.includes(platformName)) return false;
    if (filterProtocol.length && !filterProtocol.includes(run.protocol || '')) return false;
    if (filterArchitecture.length && !filterArchitecture.includes(run.architecture || '')) return false;
    if (filterDataFormat.length && !filterDataFormat.includes(dataFormat)) return false;
    if (filterStatus.length && !filterStatus.includes(getStatusGroup(run))) return false;
    return true;
  };

  const visibleRuns = runs.filter(matchesGlobalFilters);
  const runningAll = runs.filter(r => r.status === 'running' || r.status === 'pending');
  const completedBase = runs.filter(r => r.status !== 'running' && r.status !== 'pending');
  const running = visibleRuns.filter(r => r.status === 'running' || r.status === 'pending');
  const completedAll = visibleRuns.filter(r => r.status !== 'running' && r.status !== 'pending');

  // Filtrem per cerca lliure si l'usuari ha escrit alguna cosa al cercador.
  const completedFiltered = historySearch.trim()
    ? completedAll.filter(r => {
        const q = historySearch.trim().toLowerCase();
        const dataFormat = getRunDataFormat(r, scenarioMap);
        return (scenarioMap[r.scenarioId]?.name || r.scenarioName || '').toLowerCase().includes(q)
            || (r.architecture || '').toLowerCase().includes(q)
            || (r.protocol || '').toLowerCase().includes(q)
            || (normalizePlatform(r.platform || r.broker || '') || '').toLowerCase().includes(q)
            || (DATA_FORMAT_LABELS[dataFormat] || dataFormat || '').toLowerCase().includes(q)
            || (r.status || '').toLowerCase().includes(q);
      })
    : completedAll;

  // Ordenació: les execucions fallides primer (vermelles, urgents).
  // Després les normals per data descendent (última primer).
  // Això respon al feedback de l'usuari: vol veure els errors a dalt
  // de tot perquè destaquin i no passin desapercebuts.
  const completed = [...completedFiltered].sort((a: any, b: any) => {
    const aFailed = isFailedRun(a) ? 1 : 0;
    const bFailed = isFailedRun(b) ? 1 : 0;
    if (aFailed !== bFailed) return bFailed - aFailed;
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return tb - ta;
  });

  const selectedRunBase = selectedRunId ? runs.find(run => run.id === selectedRunId) || null : null;
  const selectedRun = selectedRunBase ? enrichRunWithMetricPoints(selectedRunBase, selectedRunMetrics) : null;
  const lastRefreshedTime = lastRefreshed
    ? lastRefreshed.toLocaleTimeString(getCurrentLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  const refreshLabel = refreshError
    ? <span style={{ color: 'var(--error)' }}>{refreshError}</span>
    : refreshing
      ? <span>{t('execucions.refresh.updating')}</span>
      : lastRefreshedTime
        ? `${t('execucions.refresh.latest')} ${lastRefreshedTime}${hasActiveRuns ? ` · ${t('execucions.refresh.automatic')}` : ''}`
        : t('execucions.refresh.pending');
  const activeFilterCount = filterScenario.length + filterPlatform.length + filterProtocol.length + filterArchitecture.length + filterDataFormat.length + filterStatus.length + (runSearch.trim() ? 1 : 0);
  const availableScenarioFilters = Array.from(new Map(
    runs
      .map(run => {
        const value = String(run.scenarioId || run.scenarioName || '');
        const label = scenarioMap[run.scenarioId]?.name || run.scenarioName || value;
        return value ? [value, label] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  ).entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ca', { sensitivity: 'base' }));
  const availablePlatforms = Array.from(new Set(runs.map(run => normalizePlatform(run.platform || run.broker || '')).filter(Boolean))).sort();
  const availableProtocols = Array.from(new Set(
    runs.map(run => run.protocol).filter((value): value is string => Boolean(value) && VISIBLE_PROTOCOLS.includes(value)),
  )).sort();
  const availableArchitectures = Array.from(new Set(runs.map(run => run.architecture).filter(Boolean))).sort();
  const availableDataFormats = Array.from(new Set(runs.map(run => getRunDataFormat(run, scenarioMap)).filter(Boolean))).sort();
  const availableStatusFilters = [
    { key: 'running', label: t('execucions.status.running'), color: '#3b82f6', count: runs.filter(r => r.status === 'running').length },
    { key: 'pending', label: t('execucions.status.pending'), color: '#f59e0b', count: runs.filter(r => r.status === 'pending').length },
    { key: 'completed', label: t('execucions.status.completed'), color: '#22c55e', count: runs.filter(r => r.status === 'completed').length },
    { key: 'cancelled', label: t('execucions.status.cancelled'), color: '#f59e0b', count: runs.filter(r => r.status === 'cancelled').length },
    { key: 'errors', label: t('execucions.status.failed'), color: '#ef4444', count: runs.filter(isFailedRun).length },
  ].filter(item => item.count > 0);

  /*
   * handleStopAll
   * Shows a confirmation modal to stop ALL currently running/pending executions.
   *
   * Key design decision: this uses confirmLabel='Atura' and danger=false so that
   * the confirm button is amber-colored (not red). This distinguishes "stop"
   * from "delete" - stopping pauses the runs and moves them to 'cancelled' state
   * but does NOT remove any data. The original label "Eliminar" was misleading
   * because it implied permanent data deletion.
   *
   * Uses cancellingId='__all__' as a sentinel value to disable all stop buttons
   * in the table while the batch cancel is in-flight, preventing double-clicks.
   */
  const handleStopAll = () => {
    if (runningAll.length === 0) return; // guard: nothing to stop
    setConfirmState({
      open: true,
      title: 'Estàs segur que vols aturar?',
      confirmLabel: 'Atura',   // non-destructive label (was "Eliminar" - incorrect)
      danger: false,            // accent button, not red - stop is not a delete action
      message: (
        <>
          Aturaràs <strong>{runningAll.length} execució{runningAll.length !== 1 ? 'ns' : ''}</strong> en curs o pendent{runningAll.length !== 1 ? 's' : ''}.
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Les execucions passaran a estat "Aturada" i conservaran les mostres que ja s'hagin guardat.</span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        const ids = runningAll.map((r: any) => r.id).filter(Boolean);
        // Use '__all__' sentinel so all stop buttons in the table are disabled
        setCancellingId('__all__');
        try {
          // Fire all cancel requests in parallel; ignore individual failures
          await Promise.allSettled(
            ids.map((id: string) => fetch(`${ORCHESTRATOR}/runs/${id}/cancel`, { method: 'POST' }))
          );
          showToast(`${ids.length} execució${ids.length !== 1 ? 'ns' : ''} aturada${ids.length !== 1 ? 's' : ''}.`);
          setPostRunRefreshUntil(Date.now() + 90000);
          fetchRuns(); // refresh to reflect the new 'cancelled' statuses
        } finally { setCancellingId(null); }
      },
    });
  };

  /*
   * handleResetAll
   * Danger action: wipes the orchestrator's in-memory run list AND the full
   * async-metrics index in Elasticsearch. After this returns, both
   * Execucions and Historial read as if the cluster had just been installed.
   * Confirmation is mandatory; the action is irreversible and destroys
   * benchmark history across ALL scenarios, not just the visible ones.
   */
  const handleResetAll = () => {
    setConfirmState({
      open: true,
      title: 'Estàs segur que vols reiniciar?',
      confirmLabel: 'Reinicia',
      danger: true,
      message: (
        <>
          Aquesta acció <strong>esborra totes les execucions i totes les mostres</strong> del cluster.
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>
            No es pot desfer. Historial i Execucions quedaran buits. Les execucions actives es cancel·laran.
          </span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        setCancellingId('__all__');
        try {
          const r = await fetch(`${ORCHESTRATOR}/runs/reset`, { method: 'POST' });
          if (!r.ok) {
            showToast(`Error reiniciant: HTTP ${r.status}`);
            return;
          }
          const body = await r.json().catch(() => ({}));
          showToast(`Reinici complet: ${body.metricsDeleted ?? 0} mostres eliminades.`);
          fetchRuns();
        } catch (e) {
          showToast(`Error reiniciant: ${(e as Error).message}`);
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  /*
   * SkRow (skeleton loading row)
   * Renders a single shimmer placeholder row for the loading state.
   * The column widths (as percentages of the cell) are approximate matches
   * to the real data widths to minimize layout shift when content loads.
   * `delay` staggers the animation start across rows for a wave effect.
   */
  const SkRow = ({ delay = 0 }: { delay?: number }) => (
    <tr>
      {[40, 55, 30, 28, 32, 28, 40, 35, 38, 22].map((w, j) => (
        <td key={j} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${delay}s` }} />
        </td>
      ))}
    </tr>
  );

  // Render
  return (
    <div style={{ ...S.page, maxWidth: 1280 }}>
      {/* Inject global keyframe animations (shimmer, fadeUp, pulseDot) */}
      <GlobalBenchmarkStyles />

      {/* Single shared ConfirmModal instance - its content is swapped via confirmState */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
        confirmLabel={confirmState.confirmLabel} /* undefined falls back to "Esborra" */
        danger={confirmState.danger}             /* undefined falls back to true (red)  */
      />

      {/* Toast notification - fixed to bottom-right, auto-dismissed after 3.5s */}
      {toast && (
        <div
          role="alert" aria-live="polite"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease', fontFamily: 'var(--font)' }}
        >
          {toast}
        </div>
      )}

      {/* Page header - title, subtitle, and top-right action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{t('nav.execucions')}</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            {t('execucions.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <TutorialButton page="execucions" />
            <a
              href="/resultats"
              style={{ ...S.btn, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'rgba(37,99,235,0.28)', color: 'var(--accent)', background: 'var(--accent-soft)', fontWeight: 700 }}
              title={t('execucions.actions.resultsTitle')}
            >
              <ListIcon /> {t('execucions.actions.results')}
            </a>
            <button
              onClick={() => fetchRuns(true)}
              disabled={refreshing && !loading}
              title={t('execucions.actions.refreshTitle')}
              style={{ ...S.btn, fontSize: 13 }}
            >
              <span style={{ display: 'inline-flex', animation: refreshing && !loading ? 'spin 0.8s linear infinite' : 'none' }}>
                <RefreshIcon />
              </span>
              {refreshing && !loading ? t('execucions.actions.refreshing') : t('execucions.actions.refresh')}
            </button>
            {/* "Atura tot" button - only shown when there are active runs to stop */}
            {runningAll.length > 0 && (
              <button
                onClick={handleStopAll}
                title={t('execucions.actions.stopAllTitle')}
                style={{ ...S.btn, fontSize: 13, borderColor: 'rgba(245,158,11,0.32)', color: '#d97706', background: 'rgba(245,158,11,0.10)', fontWeight: 700 }}
              >
                <StopIcon /> {t('execucions.actions.stopAll')} ({runningAll.length})
              </button>
            )}
            {runs.length > 0 && (
              <button
                onClick={handleResetAll}
                title={t('execucions.actions.resetAllTitle')}
                style={{ ...S.btn, fontSize: 13, borderColor: 'var(--error)', color: 'var(--error)', background: 'rgba(239,68,68,0.06)' }}
              >
                <RefreshIcon /> {t('execucions.actions.resetAll')}
              </button>
            )}
          </div>
          {/* "Last refreshed" label - hidden during loading to avoid showing stale time */}
          {!loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-disabled)' }}>
              {/* Inline clock icon - too small to warrant its own named component */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {/* Show "Actualitzat ara" in green for the first 5 seconds, then show elapsed time */}
              {refreshLabel}
            </div>
          )}
        </div>
      </div>

      {/* Resum curt: la resta d'estats ja es veuen als filtres i a la taula. */}
      {!loading && (
        <div style={{ display: 'flex', marginBottom: 24 }}>
          <div style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.24)', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 24, fontWeight: 850, fontFamily: 'var(--font-mono)', color: '#3b82f6', letterSpacing: '-0.02em' }}>
              {runs.filter(run => run.status === 'running').length}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 800 }}>{t('execucions.summary.runningNow')}</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('execucions.summary.runningHelp')}</span>
          </div>
        </div>
      )}

      {!loading && (
        <ExecucionsGuide
          open={guideOpen}
          onToggle={() => setGuideOpen(value => !value)}
        />
      )}

      {!loading && runs.length > 0 && (
        <FilterPanel
          title={t('execucions.filters.title')}
          activeFilterCount={activeFilterCount}
          visibleCount={visibleRuns.length}
          totalCount={runs.length}
          searchValue={runSearch}
          searchPlaceholder={t('execucions.filters.searchPlaceholder')}
          visibleLabel={(visible, total) => `${visible} ${t('catalog.filters.visibleOf')} ${total}`}
          clearSearchLabel={t('catalog.filters.clearSearch')}
          clearFiltersLabel={t('catalog.filters.clearAll')}
          onSearchChange={setRunSearch}
          onClearFilters={() => {
            setRunSearch('');
            setFilterScenario([]);
            setFilterPlatform([]);
            setFilterProtocol([]);
            setFilterArchitecture([]);
            setFilterDataFormat([]);
            setFilterStatus([]);
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <FilterSelect
              label={t('execucions.filters.status')}
              value={filterStatus[0] || 'all'}
              onChange={value => setFilterStatus(value === 'all' ? [] : [value])}
              options={[
                { value: 'all', label: t('execucions.filters.all') },
                ...availableStatusFilters.map(item => ({ value: item.key, label: `${item.label} (${item.count})` })),
              ]}
            />
            <FilterSelect
              label={t('execucions.filters.scenario')}
              value={filterScenario[0] || 'all'}
              onChange={value => setFilterScenario(value === 'all' ? [] : [value])}
              options={[
                { value: 'all', label: t('execucions.filters.all') },
                ...availableScenarioFilters,
              ]}
            />
            <FilterSelect
              label={t('execucions.filters.broker')}
              value={filterPlatform[0] || 'all'}
              onChange={value => setFilterPlatform(value === 'all' ? [] : [value])}
              options={[
                { value: 'all', label: t('execucions.filters.all') },
                ...availablePlatforms.map(value => ({ value, label: value })),
              ]}
            />
            <FilterSelect
              label={t('execucions.filters.protocol')}
              value={filterProtocol[0] || 'all'}
              onChange={value => setFilterProtocol(value === 'all' ? [] : [value])}
              options={[
                { value: 'all', label: t('execucions.filters.all') },
                ...availableProtocols.map(value => ({ value, label: value })),
              ]}
            />
            <FilterSelect
              label={t('execucions.filters.architecture')}
              value={filterArchitecture[0] || 'all'}
              onChange={value => setFilterArchitecture(value === 'all' ? [] : [value])}
              options={[
                { value: 'all', label: t('execucions.filters.all') },
                ...availableArchitectures.map(value => ({ value, label: value })),
              ]}
            />
            <FilterSelect
              label={t('execucions.filters.format')}
              value={filterDataFormat[0] || 'all'}
              onChange={value => setFilterDataFormat(value === 'all' ? [] : [value])}
              options={[
                { value: 'all', label: t('execucions.filters.all') },
                ...availableDataFormats.map(value => ({ value, label: DATA_FORMAT_LABELS[value] || value })),
              ]}
            />
          </div>
        </FilterPanel>
      )}

      {/* Main content area - skeleton while loading, two RunTables when ready */}
      {loading ? (
        /* Skeleton loading state - mimics the real table structure */
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ ...SK_STYLE, height: 12, width: 140 }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {/* Render 5 staggered skeleton rows to fill the loading state */}
              {Array.from({ length: 5 }).map((_, i) => <SkRow key={i} delay={i * 0.08} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Live runs table - showStop=true enables stop buttons and hides checkboxes */}
          <RunTable
            data={running}
            totalCount={runningAll.length}
            title={t('execucions.sections.activeTitle')}
            showStop={true}
            icon={<ActivityIcon />}
            onCancel={handleCancel}
            onRequestDelete={handleRequestDelete}
            onBulkDelete={handleBulkDelete}
            onDeleteAll={handleDeleteAll}
            cancellingId={cancellingId}
            deletingIds={deletingIds}
            scenarioMap={scenarioMap}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleAll={handleToggleAll}
            selectedRunId={selectedRunId}
            onSelectRun={run => setSelectedRunId(prev => prev === run.id ? null : run.id)}
          />
          {/* History table - showStop=false enables checkboxes and delete buttons */}
          <RunTable
            data={completed}          /* filtered by search query */
            totalCount={completedBase.length} /* unfiltered count shown in the badge */
            title={t('execucions.sections.historyTitle')}
            showStop={false}
            icon={<ListIcon />}
            searchValue={historySearch}
            onSearchChange={setHistorySearch}
            onCancel={handleCancel}
            onRequestDelete={handleRequestDelete}
            onBulkDelete={handleBulkDelete}
            onDeleteAll={handleDeleteAll}
            cancellingId={cancellingId}
            deletingIds={deletingIds}
            scenarioMap={scenarioMap}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleAll={handleToggleAll}
            selectedRunId={selectedRunId}
            onSelectRun={run => setSelectedRunId(prev => prev === run.id ? null : run.id)}
          />
        </>
      )}

      {selectedRun && (() => {
        const scenario = scenarioMap[selectedRun.scenarioId];
        const scenarioName =
          scenario?.name ||
          (selectedRun.scenarioName && selectedRun.scenarioName !== selectedRun.scenarioId
            ? selectedRun.scenarioName
            : selectedRun.scenarioId || selectedRun.id || '-');
        const platform = normalizePlatform(selectedRun.platform || selectedRun.broker || '');
        const dataFormat = getRunDataFormat(selectedRun, scenarioMap);
        const measureCount = getRunMeasureCount(selectedRun);
        const messageCount = getRunMessageCount(selectedRun);
        const sentCount = getRunSentCount(selectedRun);
        const statusConfig = STATUS_CONFIG[selectedRun.status] || { color: '#94a3b8', label: selectedRun.status || t('execucions.detail.unknown'), bg: 'transparent' };
        const status = {
          ...statusConfig,
          label: selectedRun.status ? t(`execucions.status.${selectedRun.status}`) : t('execucions.detail.unknown'),
        };
        const runStartedAt = getStartTime(selectedRun);
        const runEndedAt = selectedRun.completedAt || selectedRun.completed_at || selectedRun.endedAt || selectedRun.ended_at || selectedRun.updatedAt || selectedRun.updated_at || '';
        const firstMetric = selectedRunMetrics[0] || null;
        const lastMetric = getLastMetricPoint(selectedRunMetrics);
        const firstMetricAt = getMetricTimestamp(firstMetric);
        const lastMetricAt = getMetricTimestamp(lastMetric);
        const scenarioRunsForSelected = runs
          .filter(run => run.scenarioId && run.scenarioId === selectedRun.scenarioId)
          .sort((a, b) => {
            const at = getStartTime(a) ? Date.parse(getStartTime(a)) : 0;
            const bt = getStartTime(b) ? Date.parse(getStartTime(b)) : 0;
            return at - bt;
          });
        const runSequenceIndex = scenarioRunsForSelected.findIndex(run => run.id === selectedRun.id);
        const runSequenceLabel = runSequenceIndex >= 0
          ? `${runSequenceIndex + 1} de ${scenarioRunsForSelected.length}`
          : '-';
        const sourceLabel = selectedRun._source === 'metrics'
          ? t('execucions.detail.sourceMetrics')
          : selectedRun._source === 'orchestrator+metrics'
            ? t('execucions.detail.sourceBoth')
            : t('execucions.detail.sourceOrchestrator');
        const mostraAvisNatsVideo8k = isFailedRun(selectedRun) && platform === 'NATS Server' && dataFormat === 'video-8k';

        return (
          <MetricsDetailDrawer
            open={!!selectedRun}
            onClose={() => setSelectedRunId(null)}
            eyebrow={t('execucions.detail.eyebrow')}
            title={scenarioName}
            monoId={selectedRun.id || undefined}
            subtitle={selectedRunMetricsLoading
              ? t('execucions.detail.loadingSubtitle')
              : t('execucions.detail.subtitle')}
            accent={status.color}
            badges={[
              { label: status.label, color: status.color },
              ...(selectedRun.architecture ? [{ label: selectedRun.architecture, color: ARCHITECTURE_COLORS[selectedRun.architecture] || '#2563eb' }] : []),
              ...(selectedRun.protocol ? [{ label: selectedRun.protocol, color: PROTOCOL_COLORS[selectedRun.protocol] || '#16a34a' }] : []),
              ...(platform ? [{ label: platform, color: PLATFORM_COLORS[platform] || '#64748b' }] : []),
              { label: DATA_FORMAT_LABELS[dataFormat] || dataFormat, color: DATA_FORMAT_COLORS[dataFormat] || '#64748b' },
            ]}
            stats={[
              {
                label: t('execucions.detail.statMeasures'),
                value: measureCount,
                helper: selectedRunMetricsLoading ? t('execucions.detail.statMeasuresLoading') : t('execucions.detail.statMeasuresHelper'),
                color: '#22c55e',
              },
              {
                label: t('execucions.detail.statReceived'),
                value: messageCount,
                helper: t('execucions.detail.statReceivedHelper'),
                color: '#3b82f6',
              },
              {
                label: t('execucions.detail.statSent'),
                value: sentCount,
                helper: t('execucions.detail.statSentHelper'),
                color: '#f59e0b',
              },
              {
                label: t('execucions.detail.statDuration'),
                value: runStartedAt ? formatDuration(runStartedAt, runEndedAt || undefined) : '-',
                helper: t('execucions.detail.statDurationHelper'),
                color: 'var(--text-primary)',
              },
            ]}
            sections={[
              {
                title: t('execucions.detail.configuration'),
                items: [
                  { label: 'Run ID', value: <code style={{ fontFamily: 'var(--font-mono)' }}>{selectedRun.id || '-'}</code> },
                  { label: t('execucions.detail.scenario'), value: scenarioName },
                  { label: t('execucions.detail.repetition'), value: runSequenceLabel },
                  { label: t('execucions.detail.architecture'), value: selectedRun.architecture || '-' },
                  { label: t('execucions.detail.protocol'), value: selectedRun.protocol || '-' },
                  { label: t('execucions.detail.platform'), value: platform || '-' },
                  { label: t('execucions.detail.format'), value: DATA_FORMAT_LABELS[dataFormat] || dataFormat },
                ],
              },
              {
                title: t('execucions.detail.timeline'),
                items: [
                  { label: t('execucions.detail.start'), value: formatDateTime(runStartedAt) },
                  { label: t('execucions.detail.end'), value: formatDateTime(runEndedAt) },
                  { label: t('execucions.detail.firstSample'), value: formatDateTime(firstMetricAt) },
                  { label: t('execucions.detail.lastSample'), value: formatDateTime(lastMetricAt) },
                  { label: t('execucions.detail.source'), value: sourceLabel },
                  { label: t('execucions.detail.internalStatus'), value: selectedRun.status || '-' },
                ],
              },
              {
                title: t('execucions.detail.metricsAvailable'),
                items: [
                  { label: t('execucions.detail.latency'), value: formatMetricWithUnit(selectedRun.avgLatency, 'ms') },
                  { label: 'P50', value: formatMetricWithUnit(selectedRun.p50Latency, 'ms') },
                  { label: 'P95', value: formatMetricWithUnit(selectedRun.p95Latency, 'ms') },
                  { label: 'P99', value: formatMetricWithUnit(selectedRun.p99Latency, 'ms') },
                  { label: 'Throughput', value: formatMetricWithUnit(selectedRun.avgThroughput, 'msg/s') },
                  { label: t('execucions.detail.errorRate'), value: formatMetricWithUnit(selectedRun.avgErrorRate, '%', 3) },
                  { label: t('execucions.detail.errors'), value: selectedRun.errors != null ? formatMetricNumber(selectedRun.errors, 0) : t('execucions.detail.notAvailable') },
                ],
              },
              {
                title: t('execucions.detail.scoreDetail'),
                items: Object.entries(METRIC_WEIGHTS).map(([key, cfg]) => ({
                  label: `${cfg.label} (pes ${Math.round(cfg.weight * 100)}%)`,
                  value: <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {(selectedRun as any)[key] != null
                      ? `${Number((selectedRun as any)[key]).toLocaleString(getCurrentLocale(), { maximumFractionDigits: 2 })} ${cfg.unit} · ${cfg.direction === 'lower' ? t('execucions.detail.lowerBetter') : t('execucions.detail.higherBetter')}`
                      : t('execucions.detail.notAvailable')}
                  </span>,
                })),
              },
              ...((selectedRun.errorCode || selectedRun.errorDetail) ? [{
                title: t('execucions.detail.diagnosis'),
                items: [
                  { label: t('execucions.detail.code'), value: selectedRun.errorCode || '-' },
                  { label: t('execucions.detail.technicalDetail'), value: selectedRun.errorDetail || t('execucions.detail.noTechnicalDetail') },
                ],
              }] : []),
            ]}
          >
            {mostraAvisNatsVideo8k && (
              <div style={{ ...S.card, marginBottom: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--error)', marginBottom: 6 }}>
                  Error probable: NATS_MAX_PAYLOAD_EXCEEDED
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Video8K envia payloads d’aproximadament 2 MB. Si NATS està amb el límit per defecte d’1 MB, rebutja el missatge. Verifica que <code style={{ fontFamily: 'var(--font-mono)' }}>/varz</code> mostri <code style={{ fontFamily: 'var(--font-mono)' }}>"max_payload": 4194304</code> i aplica el chart amb <code style={{ fontFamily: 'var(--font-mono)' }}>config.merge.max_payload='&lt;&lt; 4MB &gt;&gt;'</code>.
                </div>
              </div>
            )}
            <div style={{ ...S.card, background: 'var(--bg-surface)', borderStyle: 'dashed' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {t('execucions.detail.interpretTitle')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {t('execucions.detail.interpretText')}
              </div>
            </div>
          </MetricsDetailDrawer>
        );
      })()}
    </div>
  );
};

export default ExecucionsPage;
