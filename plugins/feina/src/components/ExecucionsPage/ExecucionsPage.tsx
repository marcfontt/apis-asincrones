import { useEffect, useState, useCallback } from 'react';
import React from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const ORCHESTRATOR   = '/api/proxy/benchmark-orchestrator';
const SCENARIOS_BASE = '/api/proxy/scenario-service';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: 'Pendent' },
  running:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'En execució' },
  completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Completat' },
  cancelled: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',label: 'Cancel·lat' },
  error:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'Error' },
};

const PLATFORM_COLORS: Record<string, string> = {
  'Kafka':       '#ef4444',
  'Confluent':   '#3b82f6',
  'RabbitMQ':    '#f59e0b',
  'NATS Server': '#22c55e',
  'Pulsar':      '#a78bfa',
};

const normalizePlatform = (p?: string): string => {
  if (!p) return '';
  const map: Record<string, string> = {
    'kafka':       'Kafka',
    'confluent':   'Confluent',
    'rabbitmq':    'RabbitMQ',
    'nats server': 'NATS Server',
    'nats':        'NATS Server',
    'pulsar':      'Pulsar',
  };
  return map[p.toLowerCase()] ?? p;
};

const DATA_FORMAT_LABELS: Record<string, string> = {
  'default':   'Per defecte',
  'video-4k':  'Vídeo 4K',
  'video-8k':  'Vídeo 8K',
  'financial': 'Financer',
  'iot':       'IoT',
};

const DATA_FORMAT_COLORS: Record<string, string> = {
  'default':   '#64748b',
  'video-4k':  '#8b5cf6',
  'video-8k':  '#7c3aed',
  'financial': '#0ea5e9',
  'iot':       '#10b981',
};

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

const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA':  '#2563eb',
  'QBA':  '#9333ea',
  'LCA':  '#16a34a',
  'EMA':  '#dc2626',
  'SEA':  '#d97706',
};

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
const StopIcon    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
const TrashIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const TrashAllIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const ActivityIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const ListIcon    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const EmptyIcon   = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const WarnIcon    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const CheckboxIcon = (checked: boolean) => checked
  ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--accent)"/><path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  : <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/></svg>;
const IndetermIcon = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/></svg>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDuration = (start: string, end?: string) => {
  if (!start) return '-';
  const ms = new Date(end || new Date().toISOString()).getTime() - new Date(start).getTime();
  if (ms < 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const formatTime = (iso: string) =>
  !iso ? '-' : new Date(iso).toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

// Robust fallback for "Iniciat" - try every known field name from the API
const getStartTime = (r: any): string =>
  r.startedAt || r.started_at || r.createdAt || r.created_at || r.timestamp || '';

// ── ConfirmModal ───────────────────────────────────────────────────────────────
const ConfirmModal = ({
  open, title, message, onConfirm, onCancel, confirmLabel = 'Eliminar', danger = true,
}: {
  open: boolean; title: string; message: React.ReactNode;
  onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; danger?: boolean;
}) => {
  if (!open) return null;
  return (
    <div
      role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />

      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 28px 24px', maxWidth: 420, width: '100%', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.15s ease' }}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <div style={{ flexShrink: 0, padding: 10, borderRadius: 10, background: danger ? 'rgba(220,38,38,0.08)' : 'var(--accent-soft)', display: 'flex' }}>
            <WarnIcon />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ ...S.btn }}>Cancel·lar</button>
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

// ── RunTable ───────────────────────────────────────────────────────────────────
const RunTable = ({
  data, title, showStop, icon,
  onCancel, onRequestDelete, onBulkDelete, onDeleteAll,
  cancellingId, deletingIds, scenarioMap,
  selectedIds, onToggleSelect, onToggleAll,
}: {
  data: any[]; title: string; showStop: boolean; icon: React.ReactNode;
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
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Only finished rows are selectable
  const selectableIds = data
    .filter(r => r.status !== 'running' && r.status !== 'pending')
    .map(r => r.id)
    .filter(Boolean);

  const selectedHere = selectableIds.filter(id => selectedIds.has(id));
  const allSelected  = selectableIds.length > 0 && selectedHere.length === selectableIds.length;
  const someSelected = selectedHere.length > 0 && !allSelected;

  return (
    <div style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
          {title}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Bulk action toolbar - only visible when something is selected */}
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

          {/* Delete all button - only for finished runs */}
          {!showStop && data.length > 0 && (
            <button
              onClick={onDeleteAll}
              style={{ ...S.btn, fontSize: 12, padding: '4px 10px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.25)', gap: 4 }}
            >
              <TrashAllIcon /> Eliminar tot
            </button>
          )}

          <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 10px', borderRadius: 10, fontWeight: 600 }}>
            {data.length} registre{data.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

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
                {/* Select-all checkbox header */}
                {!showStop && (
                  <th style={{ ...S.th, width: 40, textAlign: 'center', paddingLeft: 16, paddingRight: 8 }}>
                    <button
                      onClick={() => onToggleAll(selectableIds, allSelected)}
                      style={{ background: 'none', border: 'none', cursor: selectableIds.length > 0 ? 'pointer' : 'default', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: selectableIds.length > 0 ? 1 : 0.3 }}
                      disabled={selectableIds.length === 0}
                      title={allSelected ? 'Deseleccionar tot' : 'Seleccionar tot'}
                    >
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
                const st        = STATUS_CONFIG[r.status] || { color: '#94a3b8', bg: 'transparent', label: r.status };
                const isActive  = r.status === 'running' || r.status === 'pending';
                const platform  = normalizePlatform(r.platform || r.broker);
                const platColor = PLATFORM_COLORS[platform] || 'var(--text-secondary)';
                const sc        = scenarioMap[r.scenarioId];
                const df        = r.dataFormat || sc?.dataFormat || 'default';
                const dfLabel   = DATA_FORMAT_LABELS[df] || df;
                const dfColor   = DATA_FORMAT_COLORS[df] || '#64748b';
                const isSelected = selectedIds.has(r.id);
                const isDeleting = deletingIds.has(r.id);

                return (
                  <tr
                    key={r.id || i}
                    onMouseEnter={() => setHoveredRow(i)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      ...S.tableRow,
                      background: isSelected
                        ? 'rgba(239,68,68,0.04)'
                        : hoveredRow === i ? 'var(--bg-hover)' : 'transparent',
                      opacity: isDeleting ? 0.45 : 1,
                      transition: 'background var(--transition), opacity 0.2s ease',
                    }}
                  >
                    {/* Checkbox - only for finished rows */}
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

                    {/* Nom */}
                    <td style={{ ...S.td, fontWeight: 700, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.scenarioName || <span style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.scenarioId?.slice(0, 10) || '-'}</span>}
                    </td>

                    {/* Arquitectura */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.architecture
                        ? <span style={{ ...S.badge(ARCHITECTURE_COLORS[r.architecture] || '#2563eb'), fontSize: 11 }}>{r.architecture}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>

                    {/* Protocol */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {r.protocol
                        ? <span style={{ ...S.badge(PROTOCOL_COLORS[r.protocol] || '#16a34a'), fontSize: 11 }}>{r.protocol}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>

                    {/* Plataforma */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      {platform
                        ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{platform}</span>
                        : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                    </td>

                    {/* Format */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ ...S.badge(dfColor), fontSize: 11 }}>{dfLabel}</span>
                    </td>

                    {/* Estat */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color, display: 'inline-block', animation: 'pulseDot 1.5s ease infinite' }} />}
                        {st.label}
                      </span>
                    </td>

                    {/* Durada */}
                    <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {isActive
                        ? formatDuration(getStartTime(r))
                        : formatDuration(getStartTime(r), r.completedAt || r.completed_at || r.updatedAt || r.updated_at)}
                    </td>

                    {/* Iniciat - uses robust fallback chain */}
                    <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(getStartTime(r))}
                    </td>

                    {/* Accions */}
                    <td style={{ ...S.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
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
                            <StopIcon /> {cancellingId === r.id ? '...' : 'Stop'}
                          </button>
                        )}
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

// ── ExecucionsPage ─────────────────────────────────────────────────────────────
export const ExecucionsPage = () => {
  const [runs,          setRuns]          = useState<any[]>([]);
  const [scenarios,     setScenarios]     = useState<any[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [cancellingId,  setCancellingId]  = useState<string | null>(null);
  const [deletingIds,   setDeletingIds]   = useState<Set<string>>(new Set());
  const [toast,         setToast]         = useState('');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());

  // Confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => { document.title = 'Execucions | APIs Asíncrones'; }, []);

  // Fetch scenarios once for dataFormat lookup
  useEffect(() => {
    fetch(`${SCENARIOS_BASE}/scenarios`)
      .then(r => r.json())
      .then(d => setScenarios(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const scenarioMap: Record<string, any> = Object.fromEntries(scenarios.map(s => [s.id, s]));

  const fetchRuns = useCallback(() => {
    setLoading(true);
    fetch(`${ORCHESTRATOR}/runs`)
      .then(r => r.json())
      .then(data => { setRuns(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRuns();
    const i = setInterval(fetchRuns, 8000);
    return () => clearInterval(i);
  }, [fetchRuns]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Helpers ──
  const closeConfirm = () => setConfirmState(s => ({ ...s, open: false }));

  const showToast = (msg: string) => setToast(msg);

  const markDeleting = (id: string) =>
    setDeletingIds(prev => { const s = new Set(prev); s.add(id); return s; });

  const unmarkDeleting = (id: string) =>
    setDeletingIds(prev => { const s = new Set(prev); s.delete(id); return s; });

  // ── Actions ──
  const handleCancel = async (run: any) => {
    setCancellingId(run.id);
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs/${run.id}/cancel`, { method: 'POST' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      showToast(`Execució "${run.scenarioName || run.id.slice(0, 8)}" cancel·lada.`);
      fetchRuns();
    } catch (e: any) { showToast('Error en cancel·lar: ' + e.message); }
    finally { setCancellingId(null); }
  };

  // Opens confirmation before deleting one run
  const handleRequestDelete = (run: any) => {
    const name = run.scenarioName || run.id?.slice(0, 12) || 'aquesta execució';
    setConfirmState({
      open: true,
      title: 'Eliminar execució',
      message: (
        <>
          Segur que vols eliminar <strong>"{name}"</strong>?
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Aquesta acció no es pot desfer.</span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        markDeleting(run.id);
        try {
          await fetch(`${ORCHESTRATOR}/runs/${run.id}`, { method: 'DELETE' });
          setRuns(prev => prev.filter(r => r.id !== run.id));
          setSelectedIds(prev => { const s = new Set(prev); s.delete(run.id); return s; });
        } catch (e: any) { showToast('Error en eliminar: ' + e.message); }
        finally { unmarkDeleting(run.id); }
      },
    });
  };

  // Bulk delete selected runs
  const handleBulkDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmState({
      open: true,
      title: 'Eliminar seleccionats',
      message: (
        <>
          Segur que vols eliminar <strong>{ids.length} execució{ids.length !== 1 ? 'ns' : ''}</strong>?
          <br />
          <span style={{ color: 'var(--text-disabled)', fontSize: 12 }}>Aquesta acció no es pot desfer.</span>
        </>
      ),
      onConfirm: async () => {
        closeConfirm();
        ids.forEach(markDeleting);
        const results = await Promise.allSettled(
          ids.map(id => fetch(`${ORCHESTRATOR}/runs/${id}`, { method: 'DELETE' }))
        );
        const deleted = ids.filter((_, i) => results[i].status === 'fulfilled');
        setRuns(prev => prev.filter(r => !deleted.includes(r.id)));
        setSelectedIds(prev => {
          const s = new Set(prev);
          deleted.forEach(id => s.delete(id));
          return s;
        });
        ids.forEach(unmarkDeleting);
        if (deleted.length < ids.length) {
          showToast(`${deleted.length} de ${ids.length} eliminades. Algunes han fallat.`);
        }
      },
    });
  };

  // Delete all finished runs
  const handleDeleteAll = () => {
    const finished = runs.filter(r => r.status !== 'running' && r.status !== 'pending');
    if (finished.length === 0) return;
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
        const results = await Promise.allSettled(
          ids.map((id: string) => fetch(`${ORCHESTRATOR}/runs/${id}`, { method: 'DELETE' }))
        );
        const deleted = ids.filter((_: string, i: number) => results[i].status === 'fulfilled');
        setRuns(prev => prev.filter(r => !deleted.includes(r.id)));
        setSelectedIds(new Set());
        ids.forEach(unmarkDeleting);
        showToast(`${deleted.length} execucions eliminades.`);
      },
    });
  };

  // ── Selection helpers ──
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleToggleAll = (ids: string[], allSelected: boolean) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (allSelected) { ids.forEach(id => s.delete(id)); }
      else             { ids.forEach(id => s.add(id)); }
      return s;
    });
  };

  const running   = runs.filter(r => r.status === 'running' || r.status === 'pending');
  const completed = runs.filter(r => r.status !== 'running' && r.status !== 'pending');

  const SkRow = ({ delay = 0 }: { delay?: number }) => (
    <tr>
      {[40, 55, 30, 28, 32, 28, 40, 35, 38, 22].map((w, j) => (
        <td key={j} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${delay}s` }} />
        </td>
      ))}
    </tr>
  );

  return (
    <div style={{ ...S.page, maxWidth: 1280 }}>
      <style>{GLOBAL_CSS}</style>

      {/* Confirmation modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {/* Toast */}
      {toast && (
        <div
          role="alert" aria-live="polite"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease', fontFamily: 'var(--font)' }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Execucions</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Historial de benchmarks executats sobre el clúster AKS
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
            { label: 'Total',       value: runs.length,                                           color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: 'En execució', value: running.length,                                        color: '#3b82f6',               bg: 'rgba(59,130,246,0.10)' },
            { label: 'Completats',  value: completed.filter(r => r.status === 'completed').length, color: 'var(--success)',        bg: 'rgba(34,197,94,0.08)' },
            { label: 'Errors',      value: runs.filter(r => r.status === 'error').length,          color: 'var(--error)',          bg: 'rgba(239,68,68,0.08)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ ...SK_STYLE, height: 12, width: 140 }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <SkRow key={i} delay={i * 0.08} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <>
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
          <RunTable
            data={completed}
            title="Historial"
            showStop={false}
            icon={<ListIcon />}
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

