/*
 * ExecucionsPage.tsx
 * AsyncBench - Backstage plugin for async API benchmarking
 *
 * This page shows all benchmark executions (runs) managed by the orchestrator service.
 * It is split into two sections:
 *   1. "En execució / Pendents" - live runs that are currently running or queued
 *   2. "Historial" - finished runs (completed, cancelled, error)
 *
 * Key responsibilities:
 *   - Poll the orchestrator API every 8 seconds to keep the run list fresh
 *   - Allow the user to stop individual runs or all running runs at once
 *   - Allow the user to delete individual runs, bulk-selected runs, or all finished runs
 *   - Show a confirmation modal before any destructive or semi-destructive action
 *   - Display rich metadata badges: architecture, protocol, platform, data format, status
 *
 * Design decisions:
 *   - A single ConfirmModal instance is reused for all confirmation dialogs. Its appearance
 *     (button text and color) is controlled by `confirmLabel` and `danger` props so that
 *     the "stop" action does NOT look like a delete action (red button reserved for deletes).
 *   - Runs are fetched in a single GET /runs request and split client-side into live/finished,
 *     avoiding two separate polling loops.
 *   - Scenario metadata (dataFormat, etc.) is fetched once from the scenario service and
 *     cached in a map so rows can show the format even when the run record omits it.
 *   - All colors and fonts come from CSS variables defined in the design system
 *     (var(--font) = IBM Plex Sans, var(--font-mono) = JetBrains Mono).
 *   - Dark-mode OLED background is #09090b, applied via [data-theme="dark"] on <html>.
 */

import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import { S, GLOBAL_CSS } from '../../theme'; // S = reusable React style objects, GLOBAL_CSS = keyframe animations etc.

/* ---------------------------------------------------------------------------
 * API base paths - routed through the Backstage proxy so the browser never
 * talks directly to internal cluster services.
 * ---------------------------------------------------------------------------*/
const ORCHESTRATOR   = '/api/proxy/benchmark-orchestrator';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
// Metrics API serves the persistent run history from Elasticsearch. We need it
// here because the orchestrator keeps runs in memory only — after a pod restart
// its /runs list is empty, even though the runs are still in ES. Without this
// fallback the Execucions page shows 0 rows while the Historial/Resultats tab
// shows 163 — a jarring inconsistency for the user.
const METRICS_BASE   = '/api/proxy/metrics-api';

/* ---------------------------------------------------------------------------
 * STATUS_CONFIG
 * Maps each orchestrator run status string to the visual token set used in
 * the status badge: a foreground color, a translucent background, and the
 * Catalan display label.
 *
 * "cancelled" is rendered identically to "completed" on purpose: from the
 * user's perspective a run that was stopped by hand and one that ran to
 * completion are both "finished" — they produced samples, they live in
 * Historial, they count the same for comparison. Surfacing a separate
 * "Aturat" bucket only created confusion (and an empty tab when cancels
 * didn't cleanly flush). The internal 'cancelled' string is still kept in
 * the run record so the orchestrator/metrics pipeline can tell them apart.
 * ---------------------------------------------------------------------------*/
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: 'Pendent' },
  running:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'En execució' },
  completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Completat' },
  cancelled: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Completat' },
  error:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'Error' },
};

/* ---------------------------------------------------------------------------
 * PLATFORM_COLORS
 * Maps normalized platform/broker names to a distinguishing accent color.
 * Used for the platform badge in each run row.
 * ---------------------------------------------------------------------------*/
const PLATFORM_COLORS: Record<string, string> = {
  'Kafka':       '#ef4444',
  'Confluent':   '#3b82f6',
  'RabbitMQ':    '#f59e0b',
  'NATS Server': '#22c55e',
  'Pulsar':      '#a78bfa',
};

/*
 * normalizePlatform
 * The orchestrator may return platform names in different cases or with
 * abbreviated aliases (e.g. "nats" instead of "NATS Server"). This function
 * normalizes them to the canonical form used in PLATFORM_COLORS so the badge
 * always renders with the correct color regardless of how the API reports them.
 */
const normalizePlatform = (p?: string): string => {
  if (!p) return '';
  // Lookup table keyed by lowercase so the comparison is case-insensitive
  const map: Record<string, string> = {
    'kafka':       'Kafka',
    'confluent':   'Confluent',
    'rabbitmq':    'RabbitMQ',
    'nats server': 'NATS Server',
    'nats':        'NATS Server', // short alias used by some scenario configs
    'pulsar':      'Pulsar',
  };
  // If the value is not in the map, fall back to the original string unchanged
  return map[p.toLowerCase()] ?? p;
};

/* ---------------------------------------------------------------------------
 * DATA_FORMAT_LABELS / DATA_FORMAT_COLORS
 * Added to give human-readable Catalan labels and distinct colors to each
 * data format used in benchmark scenarios (video streams, financial ticks,
 * IoT sensor data, etc.).
 * These values are displayed as badges in the "Format" column of each run row.
 * The format can come from the run record itself (r.dataFormat) or fall back
 * to the scenario definition fetched from the scenario service (sc.dataFormat).
 * If neither is present, the key 'default' is used.
 * ---------------------------------------------------------------------------*/
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

/* ---------------------------------------------------------------------------
 * PROTOCOL_COLORS
 * Maps async protocol names to colors for the "Protocol" badge column.
 * ---------------------------------------------------------------------------*/
const PROTOCOL_COLORS: Record<string, string> = {
  'Kafka':  '#ef4444',
  'AMQP':   '#f97316',
  'MQTT':   '#eab308',
  'gRPC':   '#8b5cf6',
  'WS':     '#3b82f6',
  'SSE':    '#06b6d4',
  'NATS':   '#22c55e',
  'CoAP':   '#10b981',
};

/* ---------------------------------------------------------------------------
 * ARCHITECTURE_COLORS
 * Maps architecture pattern acronyms to colors for the "Arquitectura" badge.
 * EDA = Event-Driven, QBA = Queue-Based, LCA = Log-Centric, etc.
 * ---------------------------------------------------------------------------*/
const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA':  '#2563eb',
  'QBA':  '#9333ea',
  'LCA':  '#16a34a',
  'EMA':  '#dc2626',
  'SEA':  '#d97706',
};

/*
 * SK_STYLE
 * Shared inline style for skeleton loading placeholder blocks.
 * Uses a shimmer gradient animation (defined in GLOBAL_CSS) to indicate
 * that content is loading. Each block uses `animationDelay` to stagger
 * the shimmer across rows for a more natural loading feel.
 */
const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

/* ---------------------------------------------------------------------------
 * SVG Icon components
 * Defined inline as tiny function components to avoid an external icon library
 * dependency. Each icon is 12-14px and uses currentColor for theming so it
 * inherits the surrounding text color automatically.
 * ---------------------------------------------------------------------------*/
// Magnifying glass - used on the history search input
const SearchIcon  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
// Filled square - standard "stop" symbol for stopping a run
const StopIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
// Trash bin outline - delete a single run record
const TrashIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
// Trash bin with extra lines inside - used for "delete all" to visually differ from single delete
const TrashAllIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
// Circular arrows - manual refresh button
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
// Activity / EKG waveform - used as the icon for the live executions table
const ActivityIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
// Bulleted list - used as the icon for the history table
const ListIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
// Empty-state waveform icon - dimmed, shown when a table has no rows
const EmptyIcon   = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
// Warning triangle with exclamation - shown inside the confirmation modal header
const WarnIcon    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
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

/* ---------------------------------------------------------------------------
 * Utility helpers
 * ---------------------------------------------------------------------------*/

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
  !iso ? '-' : new Date(iso).toLocaleString('ca-ES', {
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

/* ---------------------------------------------------------------------------
 * ConfirmModal
 *
 * A reusable confirmation dialog rendered as a fixed overlay.
 * It is intentionally generic so that a single instance in ExecucionsPage can
 * handle all confirmation scenarios just by swapping the props stored in
 * `confirmState`.
 *
 * Props:
 *   - open         : whether the modal is visible
 *   - title        : heading text
 *   - message      : body content (ReactNode to allow bold/links)
 *   - onConfirm    : called when the user clicks the confirm button
 *   - onCancel     : called when the user clicks Cancel or the backdrop
 *   - confirmLabel : text for the confirm button (default "Eliminar")
 *   - danger       : controls button color - true = red (var(--error)),
 *                    false = accent (var(--accent)) for non-destructive actions
 *
 * Design change: originally the confirm button was always labelled "Eliminar"
 * and always red. This was misleading for the "stop all" action because
 * stopping a run does NOT delete data. The `confirmLabel` and `danger` props
 * were added so the same modal component can be used for both delete (red,
 * "Eliminar") and stop (accent, "Atura") flows without code duplication.
 * ---------------------------------------------------------------------------*/
const ConfirmModal = ({
  open, title, message, onConfirm, onCancel, confirmLabel = 'Eliminar', danger = true,
}: {
  open: boolean; title: string; message: React.ReactNode;
  onConfirm: () => void; onCancel: () => void;
  /* confirmLabel: overrides the button text - defaults to "Eliminar" for backwards compat */
  confirmLabel?: string;
  /* danger: when false the confirm button uses the accent color instead of red */
  danger?: boolean;
}) => {
  // Return nothing when closed to keep it out of the DOM entirely
  if (!open) return null;
  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onCancel} /* clicking outside the panel closes the modal */
    >
      {/* Semi-transparent backdrop with blur to dim the page behind the dialog */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />

      {/* Dialog panel - stopPropagation prevents the outer onClick from closing it */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.15s ease' }}
      >
        {/* Icon + Title row - icon background switches between red and accent based on `danger` */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{ flexShrink: 0, padding: 10, borderRadius: 10, background: danger ? 'rgba(220,38,38,0.08)' : 'var(--accent-soft)', display: 'flex' }}>
            <WarnIcon />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ ...S.btn }}>Cancel·lar</button>
          {/* Confirm button color: red for destructive deletes, accent for non-destructive stops */}
          <button
            onClick={onConfirm}
            style={{ ...S.btnPrimary, background: danger ? 'var(--error)' : 'var(--accent)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------------
 * RunTable
 *
 * A generic table component that renders a list of benchmark run objects.
 * It is reused for both the live runs section and the history section,
 * controlled by the `showStop` prop.
 *
 * Props:
 *   - data            : array of run objects to display
 *   - title           : section heading text
 *   - showStop        : true = live table (shows stop buttons, hides delete + checkboxes);
 *                       false = history table (shows delete buttons and checkboxes)
 *   - icon            : section heading icon (ReactNode)
 *   - totalCount      : total unfiltered count, shown next to the filtered count
 *   - searchValue     : controlled search input value (history table only)
 *   - onSearchChange  : callback to update search value (history table only)
 *   - onCancel        : called when the user clicks the stop button on a live run
 *   - onRequestDelete : called when the user clicks the delete button on a finished run
 *   - onBulkDelete    : called with an array of IDs when bulk-deleting selected rows
 *   - onDeleteAll     : called when the user clicks "Eliminar tot" in the history header
 *   - cancellingId    : ID of the run currently being cancelled (disables its button)
 *   - deletingIds     : Set of IDs currently being deleted (fades their rows)
 *   - scenarioMap     : map of scenarioId -> scenario object for metadata fallback
 *   - selectedIds     : Set of run IDs currently selected for bulk action
 *   - onToggleSelect  : called when a single row's checkbox is toggled
 *   - onToggleAll     : called when the header checkbox is toggled
 * ---------------------------------------------------------------------------*/
const RunTable = ({
  data, title, showStop, icon, totalCount,
  searchValue, onSearchChange,
  onCancel, onRequestDelete, onBulkDelete, onDeleteAll,
  cancellingId, deletingIds, scenarioMap,
  selectedIds, onToggleSelect, onToggleAll,
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
}) => {
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
            {data.length}{totalCount !== undefined && totalCount !== data.length ? ` / ${totalCount}` : ''} registre{data.length !== 1 ? 's' : ''}
          </span>
          {/* Search input - only rendered for the history table (when onSearchChange is provided) */}
          {onSearchChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-subtle)', border: `1px solid ${searchValue ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, padding: '3px 9px', minWidth: 180, transition: 'border-color 0.15s' }}>
              <span style={{ color: searchValue ? 'var(--accent)' : 'var(--text-disabled)', display: 'flex', flexShrink: 0 }}><SearchIcon /></span>
              <input
                type="text"
                placeholder="Cerca a l'historial..."
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
                <TrashIcon /> Eliminar seleccionats
              </button>
            </div>
          )}

          {/* "Delete all" button - only shown in the history table (showStop=false) and when rows exist */}
          {!showStop && data.length > 0 && (
            <button
              onClick={onDeleteAll}
              style={{ ...S.btn, fontSize: 12, padding: '4px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.25)', gap: 4 }}
            >
              <TrashAllIcon /> Eliminar tot
            </button>
          )}

        </div>
      </div>

      {/* Empty state - shown when data array is empty (e.g. no active runs) */}
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
                {/* Select-all checkbox - only rendered in the history table */}
                {!showStop && (
                  <th style={{ ...S.th, width: 40, textAlign: 'center', paddingLeft: 16, paddingRight: 8 }}>
                    <button
                      onClick={() => onToggleAll(selectableIds, allSelected)}
                      style={{ background: 'none', border: 'none', cursor: selectableIds.length > 0 ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectableIds.length > 0 ? 1 : 0.3 }}
                      disabled={selectableIds.length === 0}
                      title={allSelected ? 'Deseleccionar tot' : 'Seleccionar tot'}
                    >
                      {/* Show indeterminate icon if some but not all rows are selected */}
                      {someSelected ? <IndetermIcon /> : CheckboxIcon(allSelected)}
                    </button>
                  </th>
                )}
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
                // Resolve the status config - fall back to a neutral style for unknown statuses
                const st        = STATUS_CONFIG[r.status] || { color: '#94a3b8', bg: 'transparent', label: r.status };
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

                return (
                  <tr
                    key={r.id || i}
                    onMouseEnter={() => setHoveredRow(i)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      ...S.tableRow,
                      // Selected rows get a subtle red tint; hovered rows get the default hover bg
                      background: isSelected
                        ? 'rgba(239,68,68,0.04)'
                        : hoveredRow === i ? 'var(--bg-hover)' : 'transparent',
                      // Fade the row while a delete request is in-flight to give instant feedback
                      opacity: isDeleting ? 0.45 : 1,
                      transition: 'background var(--transition), opacity 0.2s ease',
                    }}
                  >
                    {/* Row-level checkbox - only in history table; active rows are not selectable */}
                    {!showStop && (
                      <td style={{ ...S.td, width: 40, paddingLeft: 16, paddingRight: 8, textAlign: 'center' }}>
                        {!isActive && (
                          <button
                            onClick={() => onToggleSelect(r.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={isSelected ? 'Deseleccionar' : 'Seleccionar'}
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
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block', animation: 'pulseDot 1.5s ease infinite' }} />}
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
                            onClick={() => onCancel(r)}
                            disabled={cancellingId === r.id}
                            title="Aturar execució"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '4px 9px', borderRadius: 6, border: 'none',
                              background: 'var(--error)', color: '#fff',
                              cursor: cancellingId === r.id ? 'not-allowed' : 'pointer',
                              fontSize: 11, fontWeight: 600,
                              opacity: cancellingId === r.id ? 0.6 : 1,
                              fontFamily: 'var(--font)',
                            }}
                          >
                            {/* Show "..." while the cancel request is in-flight */}
                            <StopIcon /> {cancellingId === r.id ? '...' : 'Stop'}
                          </button>
                        )}
                        {/* Delete button - only for finished rows (not active) */}
                        {!isActive && (
                          <button
                            onClick={() => onRequestDelete(r)}
                            disabled={isDeleting}
                            title="Eliminar registre"
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

/* ---------------------------------------------------------------------------
 * ExecucionsPage
 *
 * Top-level page component exported from this module.
 * Owns all data-fetching and mutation logic; passes callbacks down to RunTable.
 * ---------------------------------------------------------------------------*/
export const ExecucionsPage = () => {
  // All benchmark run records from the orchestrator
  const [runs,          setRuns]          = useState<any[]>([]);
  // Scenario definitions fetched from the scenario service (for metadata fallback)
  const [scenarios,     setScenarios]     = useState<any[]>([]);
  // True while the initial (or manual refresh) fetch is in progress
  const [loading,       setLoading]       = useState(true);
  // ID of the run whose cancel request is currently in-flight (null = none)
  const [cancellingId,  setCancellingId]  = useState<string | null>(null);
  // Set of IDs whose delete requests are currently in-flight (for row fade-out)
  const [deletingIds,   setDeletingIds]   = useState<Set<string>>(new Set());
  // Current toast notification message (empty string = no toast shown)
  const [toast,         setToast]         = useState('');
  // Set of run IDs selected for bulk delete in the history table
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  // Current value of the history search input
  const [historySearch, setHistorySearch] = useState('');
  // Timestamp of the last successful data fetch (used for the "updated X seconds ago" label)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  // Seconds elapsed since lastRefreshed, incremented by a 1s interval
  const [secsAgo,       setSecsAgo]       = useState(0);

  /*
   * confirmState holds all the dynamic data for the shared ConfirmModal instance.
   * Instead of separate boolean flags for each action type, a single state object
   * is used so that only one modal can be open at a time, and the confirm handler
   * is always the exact function appropriate for the current action.
   *
   * confirmLabel and danger were added to allow the stop-all action to display
   * a non-red "Atura" button instead of the default red "Eliminar" button.
   * This matters because stopping is reversible (runs can be re-triggered) while
   * deleting is permanent.
   */
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmLabel?: string; // overrides the default "Eliminar" button label
    danger?: boolean;      // false = accent-colored button; true = red (default)
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Set the browser tab title once on mount
  useEffect(() => { document.title = 'Execucions | APIs Asíncrones'; }, []);

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

  // Build a lookup map from scenario ID to scenario object for O(1) access in render
  const scenarioMap: Record<string, any> = Object.fromEntries(scenarios.map(s => [s.id, s]));

  /*
   * fetchRuns
   * Wrapped in useCallback so the polling interval always calls the same
   * stable function reference, and so the effect below does not re-register
   * the interval on every render.
   */
  const fetchRuns = useCallback(() => {
    setLoading(true);
    // Fetch BOTH sources in parallel:
    //   1. Orchestrator /runs   -> source of truth for live/pending/just-finished runs,
    //                              but only holds them in memory (lost on pod restart).
    //   2. Metrics-API /summary -> persistent ES history, one row per runId.
    //
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

        const orchIds = new Set(orchRuns.map(r => r.id));
        // For each ES summary that is NOT already in the orchestrator list,
        // synthesize a completed run object. Unknown fields stay undefined —
        // the table renderer already handles missing badges gracefully.
        const synthetic = summary
          .filter((s: any) => s.runId && !orchIds.has(s.runId))
          .map((s: any) => ({
            id:            s.runId,
            scenarioId:    s.scenarioId,
            scenarioName:  s.scenarioId, // resolved to friendly name later via scenarioMap
            architecture:  s.architecture,
            protocol:      s.protocol,
            platform:      s.platform || s.broker,
            broker:        s.broker,
            dataFormat:    s.dataFormat,
            deliveryModel: s.deliveryModel,
            // ES-only runs are always historical. Accept the status recorded at run end;
            // if missing, assume 'completed' (a snapshot existed so the run happened).
            status:        s.status || 'completed',
            startedAt:     s.startedAt,
            completedAt:   s.endedAt,
            // Tag synthetic rows so delete/cancel can route to the right backend.
            _source:       'metrics',
          }));

        const merged = [...orchRuns, ...synthetic].sort((a, b) => {
          const at = a.startedAt ? Date.parse(a.startedAt) : 0;
          const bt = b.startedAt ? Date.parse(b.startedAt) : 0;
          return bt - at;
        });

        setRuns(merged);
        setLoading(false);
        setLastRefreshed(new Date()); // record when this fresh data arrived
        setSecsAgo(0);               // reset the elapsed-time counter
      })
      .catch(() => setLoading(false));
  }, []);

  // Start polling immediately on mount; clean up the interval on unmount
  useEffect(() => {
    fetchRuns();
    const i = setInterval(fetchRuns, 8000); // poll every 8 seconds
    return () => clearInterval(i);
  }, [fetchRuns]);

  /*
   * Ticker effect - increments secsAgo every second independently of the
   * poll interval. This gives a smooth "updated Xs ago" label without needing
   * to re-render the whole page on every tick (only the label re-renders).
   */
  useEffect(() => {
    const t = setInterval(() => setSecsAgo(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-dismiss toast notifications after 3.5 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------------------------------------------------------------------------
   * Local helpers
   * ---------------------------------------------------------------------------*/

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

  /* ---------------------------------------------------------------------------
   * Actions
   * ---------------------------------------------------------------------------*/

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
      showToast(`Execucio "${run.scenarioName || run.id.slice(0, 8)}" aturada.`);
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
    const name = run.scenarioName || run.id?.slice(0, 12) || 'aquesta execucio';
    setConfirmState({
      open: true,
      title: 'Eliminar execucio',
      message: (
        <>
          Segur que vols eliminar <strong>"{name}"</strong>?
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Aquesta accio no es pot desfer.</span>
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
      title: 'Eliminar seleccionats',
      message: (
        <>
          Segur que vols eliminar <strong>{ids.length} execucio{ids.length !== 1 ? 'ns' : ''}</strong>?
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Aquesta accio no es pot desfer.</span>
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
      title: 'Eliminar totes les execucions',
      message: (
        <>
          Segur que vols eliminar <strong>totes les {finished.length} execucions</strong> de l'historial?
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Les execucions en curs no s'eliminaran. Aquesta acció no es pot desfer.</span>
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

  /* ---------------------------------------------------------------------------
   * Selection helpers
   * ---------------------------------------------------------------------------*/

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

  /* ---------------------------------------------------------------------------
   * Derived data
   * ---------------------------------------------------------------------------*/

  // Split runs into live (needs stop button) and finished (needs delete + checkbox)
  const running      = runs.filter(r => r.status === 'running' || r.status === 'pending');
  const completedAll = runs.filter(r => r.status !== 'running' && r.status !== 'pending');

  /*
   * Apply the history search filter to finished runs.
   * The filter is client-side because the full list is already in memory,
   * and the orchestrator API does not expose a search endpoint.
   * Matched fields: scenario name, architecture, protocol, status label.
   */
  const completed    = historySearch.trim()
    ? completedAll.filter(r => {
        const q = historySearch.trim().toLowerCase();
        return (r.scenarioName || '').toLowerCase().includes(q)
            || (r.architecture || '').toLowerCase().includes(q)
            || (r.protocol     || '').toLowerCase().includes(q)
            || (r.status       || '').toLowerCase().includes(q);
      })
    : completedAll;

  /*
   * handleStopAll
   * Shows a confirmation modal to stop ALL currently running/pending executions.
   *
   * Key design decision: this uses confirmLabel='Atura' and danger=false so that
   * the confirm button is accent-colored (not red). This distinguishes "stop"
   * from "delete" - stopping pauses the runs and moves them to 'cancelled' state
   * but does NOT remove any data. The original label "Eliminar" was misleading
   * because it implied permanent data deletion.
   *
   * Uses cancellingId='__all__' as a sentinel value to disable all stop buttons
   * in the table while the batch cancel is in-flight, preventing double-clicks.
   */
  const handleStopAll = () => {
    if (running.length === 0) return; // guard: nothing to stop
    setConfirmState({
      open: true,
      title: 'Atura totes les execucions',
      confirmLabel: 'Atura',   // non-destructive label (was "Eliminar" - incorrect)
      danger: false,            // accent button, not red - stop is not a delete action
      message: (
        <>
          Segur que vols aturar <strong>{running.length} execucio{running.length !== 1 ? 'ns' : ''}</strong> en curs o pendents?
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Les execucions passaran a estat "Aturat".</span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        const ids = running.map((r: any) => r.id).filter(Boolean);
        // Use '__all__' sentinel so all stop buttons in the table are disabled
        setCancellingId('__all__');
        try {
          // Fire all cancel requests in parallel; ignore individual failures
          await Promise.allSettled(
            ids.map((id: string) => fetch(`${ORCHESTRATOR}/runs/${id}/cancel`, { method: 'POST' }))
          );
          showToast(`${ids.length} execucio${ids.length !== 1 ? 'ns' : ''} aturada${ids.length !== 1 ? 's' : ''}.`);
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
   * Confirmation is mandatory — the action is irreversible and destroys
   * benchmark history across ALL scenarios, not just the visible ones.
   */
  const handleResetAll = () => {
    setConfirmState({
      open: true,
      title: 'Reinicia tot',
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

  /* ---------------------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------------------*/
  return (
    <div style={{ ...S.page, maxWidth: 1280 }}>
      {/* Inject global keyframe animations (shimmer, fadeUp, pulseDot) */}
      <style>{GLOBAL_CSS}</style>

      {/* Single shared ConfirmModal instance - its content is swapped via confirmState */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
        confirmLabel={confirmState.confirmLabel} /* undefined falls back to "Eliminar" */
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
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Execucions</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Historial de benchmarks executats sobre el cluster AKS
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* "Atura tot" button - only shown when there are active runs to stop */}
            {running.length > 0 && (
              <button
                onClick={handleStopAll}
                title="Atura totes les execucions en curs o pendents"
                style={{ ...S.btn, fontSize: 13, borderColor: 'var(--error)', color: 'var(--error)', background: 'rgba(239,68,68,0.06)' }}
              >
                <StopIcon /> Atura tot ({running.length})
              </button>
            )}
            <button onClick={fetchRuns} style={{ ...S.btn, fontSize: 13 }}>
              <RefreshIcon /> Actualitzar
            </button>
            {runs.length > 0 && (
              <button
                onClick={handleResetAll}
                title="Esborra totes les execucions i mostres del cluster"
                style={{ ...S.btn, fontSize: 13, borderColor: 'var(--error)', color: 'var(--error)', background: 'rgba(239,68,68,0.06)' }}
              >
                Reinicia tot
              </button>
            )}
          </div>
          {/* "Last refreshed" label - hidden during loading to avoid showing stale time */}
          {lastRefreshed && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-disabled)' }}>
              {/* Inline clock icon - too small to warrant its own named component */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {/* Show "Actualitzat ara" in green for the first 5 seconds, then show elapsed time */}
              {secsAgo < 5
                ? <span style={{ color: 'var(--success)' }}>Actualitzat ara</span>
                : `Actualitzat fa ${secsAgo}s · auto cada 8s`}
            </div>
          )}
        </div>
      </div>

      {/* Stats bar - summary counts for each status category (hidden while loading) */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: runs.length,                                            color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: 'En execucio', value: running.length,                                         color: '#3b82f6',               bg: 'rgba(59,130,246,0.10)' },
            { label: 'Completats',  value: runs.filter(r => r.status === 'completed' || r.status === 'cancelled').length, color: 'var(--success)', bg: 'rgba(34,197,94,0.08)' },
            { label: 'Errors',      value: runs.filter(r => r.status === 'error').length,          color: 'var(--error)',          bg: 'rgba(239,68,68,0.08)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
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
            title="En execució / Pendents"
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
          />
          {/* History table - showStop=false enables checkboxes and delete buttons */}
          <RunTable
            data={completed}          /* filtered by search query */
            totalCount={completedAll.length} /* unfiltered count shown in the badge */
            title="Historial"
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
          />
        </>
      )}
    </div>
  );
};

export default ExecucionsPage;
