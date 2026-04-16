
import { useEffect, useState, useCallback } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const API_BASE     = '/api/proxy/scenario-service';
const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';

// ── Types ──────────────────────────────────────────────────────────────────────
type Scenario = {
  id?: string;
  name: string;
  architecture: string;
  protocol: string;
  platform?: string;
  broker?: string;
  duration?: number;
  rate?: number;
  payloadSize?: number;
  dataFormat?: string;
  status?: string;
  predefined?: boolean;
  createdAt?: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────
const ALL_ARCHITECTURES  = ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'];
const ALL_PROTOCOLS      = ['WS', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'];
const ALL_PLATFORMS      = ['Kafka', 'RabbitMQ', 'Confluent', 'NATS Server', 'Pulsar'];
const DISABLED_PLATFORMS = ['Pulsar'];

const PLATFORM_COLORS: Record<string, string> = {
  'Kafka':       '#ef4444',
  'Confluent':   '#3b82f6',
  'RabbitMQ':    '#f59e0b',
  'NATS Server': '#22c55e',
  'Pulsar':      '#a78bfa',
};

const DATA_FORMATS = [
  { value: '',          label: 'Per defecte (bytes aleatoris)' },
  { value: 'default',   label: 'Per defecte (bytes aleatoris)' },
  { value: 'video-4k',  label: 'Streaming vídeo 4K (~4 Mbps)' },
  { value: 'video-8k',  label: 'Streaming vídeo 8K (~16 Mbps)' },
  { value: 'financial', label: 'Transaccions financeres (JSON compacte)' },
  { value: 'iot',       label: 'Telemetria IoT (payload mínim)' },
];

const DATA_FORMAT_LABELS: Record<string, string> = {
  'default':   'Per defecte',
  'video-4k':  'Vídeo 4K',
  'video-8k':  'Vídeo 8K',
  'financial': 'Financer',
  'iot':       'IoT',
};

const DATA_FORMAT_COLORS: Record<string, string> = {
  'default':   '#6b7280',
  'video-4k':  '#7c3aed',
  'video-8k':  '#9333ea',
  'financial': '#0891b2',
  'iot':       '#16a34a',
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

const COMPATIBILITY: Record<string, { architectures: string[]; protocols: string[] }> = {
  'Kafka':       { architectures: ['EDA', 'SEA', 'QBA'], protocols: ['Kafka', 'AMQP', 'gRPC'] },
  'RabbitMQ':    { architectures: ['EDA', 'QBA', 'EMA'], protocols: ['AMQP', 'MQTT', 'WS'] },
  'Confluent':   { architectures: ['EDA', 'SEA', 'QBA'], protocols: ['Kafka', 'AMQP', 'gRPC'] },
  'Pulsar':      { architectures: ['EDA', 'QBA', 'SEA'], protocols: ['AMQP', 'WS', 'gRPC'] },
  'NATS Server': { architectures: ['EDA', 'LCA', 'SEA'], protocols: ['NATS', 'WS', 'gRPC'] },
};

const getCompatibleArchitectures = (p: string) => COMPATIBILITY[p]?.architectures ?? ALL_ARCHITECTURES;
const getCompatibleProtocols     = (p: string) => COMPATIBILITY[p]?.protocols     ?? ALL_PROTOCOLS;

const normalizePlatform = (p?: string): string => {
  if (!p) return '';
  const map: Record<string, string> = {
    'kafka': 'Kafka', 'rabbitmq': 'RabbitMQ', 'rabbit': 'RabbitMQ',
    'confluent': 'Confluent', 'nats': 'NATS Server', 'nats server': 'NATS Server', 'pulsar': 'Pulsar',
  };
  return map[p.toLowerCase()] ?? p;
};

const EMPTY_FORM = {
  name: '', architecture: '', protocol: '', platform: '',
  duration: '', rate: '', payloadSize: '', dataFormat: '',
};

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  idle:      { color: '#10b981', label: 'Llest',       bg: 'rgba(16,185,129,0.10)' },
  pending:   { color: '#f59e0b', label: 'Pendent',     bg: 'rgba(245,158,11,0.1)'  },
  running:   { color: '#3b82f6', label: 'En execució', bg: 'rgba(59,130,246,0.1)'  },
  completed: { color: '#22c55e', label: 'Completat',   bg: 'rgba(34,197,94,0.1)'   },
  error:     { color: '#ef4444', label: 'Error',       bg: 'rgba(239,68,68,0.1)'   },
};

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

// ── Predefined Presets ─────────────────────────────────────────────────────────
const PREDEFINED_PRESETS = [
  {
    name:         'Finances sense pèrdua',
    platform:     'RabbitMQ',
    architecture: 'EDA',
    protocol:     'AMQP',
    dataFormat:   'financial',
    duration:     '120',
    rate:         '500',
    payloadSize:  '256',
    desc:         'AMQP + RabbitMQ optimitzat per a transaccions financeres. Taxa d\'error mínima.',
    color:        '#0891b2',
  },
  {
    name:         'IoT alta freqüència',
    platform:     'NATS Server',
    architecture: 'LCA',
    protocol:     'NATS',
    dataFormat:   'iot',
    duration:     '90',
    rate:         '5000',
    payloadSize:  '64',
    desc:         'NATS per a telemetria IoT d\'alta freqüència. Throughput màxim, payload mínim.',
    color:        '#16a34a',
  },
  {
    name:         'Streaming vídeo 4K',
    platform:     'Confluent',
    architecture: 'SEA',
    protocol:     'Kafka',
    dataFormat:   'video-4k',
    duration:     '120',
    rate:         '2000',
    payloadSize:  '4096',
    desc:         'Kafka + Confluent per a streaming 4K. Alt throughput, tolerant a latència.',
    color:        '#7c3aed',
  },
  {
    name:         'Latència ultra-baixa',
    platform:     'Kafka',
    architecture: 'EDA',
    protocol:     'gRPC',
    dataFormat:   'default',
    duration:     '60',
    rate:         '1000',
    payloadSize:  '256',
    desc:         'gRPC + Kafka per a aplicacions de temps real. Latència mínima garantida.',
    color:        '#ef4444',
  },
  {
    name:         'Streaming vídeo 8K',
    platform:     'Confluent',
    architecture: 'SEA',
    protocol:     'Kafka',
    dataFormat:   'video-8k',
    duration:     '120',
    rate:         '500',
    payloadSize:  '16384',
    desc:         'Kafka + Confluent per a streaming 8K (16 Mbps). Càrrega màxima de throughput.',
    color:        '#9333ea',
  },
];

// ── Icons ──────────────────────────────────────────────────────────────────────
const PlayIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const StopIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
const EditIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const DuplicateIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const CloseIcon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PlusIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const RefreshIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const EmptyIcon     = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>;
const RocketIcon    = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m3.29 15 5 5"/><path d="M13 7 7 13"/><path d="m20 7-5 3-3 5 2 2 5-3 3-5z"/></svg>;
const GearIcon      = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
// Sort icons (SVG, no emojis)
const SortAscIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const SortDescIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const SortNoneIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/><polyline points="8 6 12 2 16 6"/><polyline points="8 18 12 22 16 18"/></svg>;

const SkeletonRow = ({ delay = 0 }: { delay?: number }) => (
  <tr>
    {[62, 48, 42, 55, 38, 45, 30, 32, 32].map((w, j) => (
      <td key={j} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${delay}s` }} />
      </td>
    ))}
  </tr>
);

type SortDir = 'asc' | 'desc';

const SortTh = ({ label, sk, current, dir, onSort, extraStyle }: {
  label: string; sk: string; current: string | null; dir: SortDir | null;
  onSort: (sk: any) => void; extraStyle?: React.CSSProperties;
}) => {
  const active = current === sk;
  return (
    <th
      style={{ ...S.th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' as const, ...extraStyle }}
      onClick={() => onSort(sk)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {label}
        <span style={{ color: active ? 'var(--accent)' : 'var(--text-disabled)', display: 'flex' }}>
          {active && dir === 'asc'  ? <SortAscIcon />  :
           active && dir === 'desc' ? <SortDescIcon /> :
           <SortNoneIcon />}
        </span>
      </span>
    </th>
  );
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--text-secondary)',
  marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
};

// ── Filter select style (custom) ───────────────────────────────────────────────
const makeSelStyle = (active: boolean, accentColor?: string): React.CSSProperties => ({
  padding: '7px 32px 7px 12px',
  borderRadius: 8,
  border: `1px solid ${active ? (accentColor || 'var(--accent)') : 'var(--border)'}`,
  background: active ? (accentColor ? accentColor + '10' : 'var(--accent-soft)') : 'var(--bg-card)',
  color: active ? (accentColor || 'var(--accent)') : 'var(--text-secondary)',
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none' as const,
  fontFamily: 'var(--font)',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  transition: 'all 0.15s ease',
  minWidth: 150,
});

// ── Modal: Crear / Editar ──────────────────────────────────────────────────────
const ScenarioModal = ({ mode, initial, onClose, onSaved }: {
  mode: 'create' | 'edit';
  initial: typeof EMPTY_FORM & { id?: string; createdAt?: string };
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form,       setForm]       = useState({ ...EMPTY_FORM, ...initial });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  // Indefinit flag — initialize from existing scenario duration
  const [indefinite, setIndefinite] = useState(
    initial.duration !== undefined && initial.duration !== '' && Number(initial.duration) >= 3600
  );

  const set = (k: string, v: string) => {
    if (k === 'platform') {
      const ca = getCompatibleArchitectures(v), cp = getCompatibleProtocols(v);
      setForm(f => ({ ...f, platform: v, architecture: ca.includes(f.architecture) ? f.architecture : '', protocol: cp.includes(f.protocol) ? f.protocol : '' }));
    } else setForm(f => ({ ...f, [k]: v }));
  };

  const ca = getCompatibleArchitectures(form.platform);
  const cp = getCompatibleProtocols(form.platform);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.architecture || !form.protocol || !form.platform) {
      setError('El nom, arquitectura, protocol i plataforma són obligatoris.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload: any = {
        name:         form.name.trim(),
        architecture: form.architecture,
        protocol:     form.protocol,
        platform:     form.platform,
        duration:     indefinite ? 3600 : (form.duration    ? Number(form.duration)    : undefined),
        rate:         indefinite ? null : (form.rate        ? Number(form.rate)        : undefined),
        payloadSize:  indefinite ? null : (form.payloadSize ? Number(form.payloadSize) : undefined),
        dataFormat:   form.dataFormat || 'default',
        predefined:   false,
        status:       'idle',
      };
      if (mode === 'edit' && initial.createdAt) payload.createdAt = initial.createdAt;
      const url = mode === 'edit' && initial.id ? `${API_BASE}/scenarios/${initial.id}` : `${API_BASE}/scenarios`;
      const r = await fetch(url, {
        method: mode === 'edit' && initial.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 600, maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {mode === 'edit' ? 'Editar Escenari' : 'Nou Escenari'}
          </h2>
          <button onClick={onClose} aria-label="Tanca el modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}><CloseIcon /></button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={lbl}>Nom *</label>
            <input style={{ ...S.input }} placeholder="ex. MQTT-EDA-RabbitMQ-IoT" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div>
            <label style={lbl}>
              Plataforma / Broker *{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-secondary)' }}>(selecciona primer)</span>
            </label>
            <select style={{ ...S.input }} value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">Selecciona...</option>
              {ALL_PLATFORMS.map(p => {
                const disabled = DISABLED_PLATFORMS.includes(p);
                return (
                  <option key={p} value={p} disabled={disabled} style={disabled ? { color: 'var(--text-disabled)' } : {}}>
                    {p}{disabled ? ' (no disponible)' : ''}
                  </option>
                );
              })}
            </select>
            {DISABLED_PLATFORMS.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-disabled)' }}>
                Plataformes no disponibles: {DISABLED_PLATFORMS.join(', ')}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>
                Arquitectura *{' '}
                {form.platform && <span style={{ color: 'var(--accent)', fontWeight: 400 }}>({ca.length} compatibles)</span>}
              </label>
              <select style={{ ...S.input }} value={form.architecture} onChange={e => set('architecture', e.target.value)}>
                <option value="">Selecciona...</option>
                {ALL_ARCHITECTURES.map(a => {
                  const ok = form.platform ? ca.includes(a) : true;
                  return <option key={a} value={a} disabled={!ok} style={!ok ? { color: 'var(--text-disabled)' } : {}}>{a}{!ok && form.platform ? ' (incompatible)' : ''}</option>;
                })}
              </select>
            </div>
            <div>
              <label style={lbl}>
                Protocol *{' '}
                {form.platform && <span style={{ color: 'var(--accent)', fontWeight: 400 }}>({cp.length} compatibles)</span>}
              </label>
              <select style={{ ...S.input }} value={form.protocol} onChange={e => set('protocol', e.target.value)}>
                <option value="">Selecciona...</option>
                {ALL_PROTOCOLS.map(p => {
                  const ok = form.platform ? cp.includes(p) : true;
                  return <option key={p} value={p} disabled={!ok} style={!ok ? { color: 'var(--text-disabled)' } : {}}>{p}{!ok && form.platform ? ' (incompatible)' : ''}</option>;
                })}
              </select>
            </div>
          </div>

          {form.platform && (
            <div style={{ background: 'var(--badge-blue-bg)', border: '1px solid var(--badge-blue-fg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--badge-blue-fg)', opacity: 0.9 }}>
              <strong>{form.platform}</strong> · Arq: {ca.join(', ')} · Proto: {cp.join(', ')}
            </div>
          )}

          {/* Durada, Ràtio, Payload + Mode Indefinit toggle */}
          <div style={{ marginBottom: 4 }}>
            <button
              type="button"
              onClick={() => setIndefinite(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                border: indefinite ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: indefinite ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
                color: indefinite ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.18s ease', width: '100%',
              }}
            >
              <span style={{
                width: 36, height: 20, borderRadius: 12, position: 'relative' as const,
                background: indefinite ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s ease', flexShrink: 0,
              }}>
                <span style={{
                  position: 'absolute' as const, top: 2, left: indefinite ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}/>
              </span>
              <div>
                <div>Mode Indefinit</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-disabled)', marginTop: 1 }}>
                  {indefinite ? "L'escenari s'executarà un màxim d'1 hora" : "Activa per executar sense límit de temps (max 1h)"}
                </div>
              </div>
              {indefinite && <span style={{ marginLeft: 'auto', fontSize: 18 }}>∞</span>}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, opacity: indefinite ? 0.4 : 1, pointerEvents: indefinite ? 'none' as const : 'auto' as const, transition: 'opacity 0.2s' }}>
            <div>
              <label style={lbl}>Durada (s)</label>
              <input style={{ ...S.input }} type="number" min={1} placeholder="60" value={form.duration} onChange={e => set('duration', e.target.value)} disabled={indefinite} />
            </div>
            <div>
              <label style={lbl}>Ràtio (msg/s)</label>
              <input style={{ ...S.input }} type="number" min={1} placeholder="1000" value={form.rate} onChange={e => set('rate', e.target.value)} disabled={indefinite} />
            </div>
            <div>
              <label style={lbl}>Payload (bytes)</label>
              <input style={{ ...S.input }} type="number" min={1} placeholder="256" value={form.payloadSize} onChange={e => set('payloadSize', e.target.value)} disabled={indefinite} />
            </div>
          </div>
          {indefinite && (
            <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent)' }}>Mode Indefinit activat (1h max):</strong> L'escenari s'executarà sense limit de ràtio ni payload fixat durant <strong style={{ color: 'var(--text-primary)' }}>un màxim d'una hora (3600s)</strong> per seguretat. S'utilitzaran els valors per defecte del format de dades seleccionat. Pots aturar l'escenari manualment en qualsevol moment.
            </div>
          )}

          <div>
            <label style={lbl}>Format de dades</label>
            <select style={{ ...S.input }} value={form.dataFormat} onChange={e => set('dataFormat', e.target.value)}>
              {DATA_FORMATS.filter((f, i) => i === 0 || f.value !== '').map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-disabled)' }}>
              Defineix el tipus de dades per simular casos d'ús reals (streaming, IoT, finances...)
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', color: 'var(--error)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ ...S.btn, fontSize: 13 }}>Cancel·la</button>
            <button onClick={handleSubmit} disabled={saving} style={{ ...S.btnPrimary, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Desant...' : mode === 'edit' ? 'Desa els canvis' : 'Crea Escenari'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal: Confirmar eliminació ────────────────────────────────────────────────
const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 420, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Eliminar Escenari</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
        Segur que vols eliminar <strong style={{ color: 'var(--text-primary)' }}>{name}</strong>? Aquesta accio no es pot desfer.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Cancel·la</button>
        <button onClick={onConfirm} style={{ ...S.btnPrimary, fontSize: 13, background: 'var(--error)', boxShadow: 'none' }}>Elimina</button>
      </div>
    </div>
  </div>
);

// ── Modal: Executar ────────────────────────────────────────────────────────────
const ExecuteModal = ({ scenario, onClose, onStarted }: { scenario: Scenario; onClose: () => void; onStarted?: (scenarioId: string, runId: string) => void }) => {
  const [state, setState] = useState<'confirm' | 'running' | 'done' | 'error'>('confirm');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState('');

  const handleExecute = async () => {
    setState('running');
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId:   scenario.id,
          scenarioName: scenario.name,
          architecture: scenario.architecture,
          protocol:     scenario.protocol,
          platform:     normalizePlatform(scenario.platform || scenario.broker),
          dataFormat:   scenario.dataFormat || 'default',
          duration:     scenario.duration ?? null,
          rate:         scenario.rate ?? null,
          payloadSize:  scenario.payloadSize ?? null,
        }),
      });
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `HTTP ${r.status}`); }
      const data = await r.json();
      const newRunId = data.runId || data.id || '';
      setRunId(newRunId);
      setState('done');
      if (scenario.id && onStarted) onStarted(scenario.id, newRunId);
    } catch (e: any) { setError(e.message); setState('error'); }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' };
  const card:    React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 460, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' };

  const platDisplay = normalizePlatform(scenario.platform || scenario.broker);

  if (state === 'confirm') return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Executar Escenari</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Es desplegarà un Job al AKS per l'escenari <strong style={{ color: 'var(--text-primary)' }}>{scenario.name}</strong>.
      </p>
      <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, display: 'grid', gap: 6 }}>
        {([
          ['Arquitectura', scenario.architecture],
          ['Protocol',     scenario.protocol],
          ['Plataforma',   platDisplay],
          ['Format dades', DATA_FORMAT_LABELS[scenario.dataFormat || ''] || 'Per defecte'],
          ['Durada',       scenario.duration    ? `${scenario.duration}s`        : 'Indefinit (format per defecte)'],
          ['Ratio',        scenario.rate        ? `${scenario.rate} msg/s`       : 'Per defecte (100 msg/s)'],
          ['Payload',      scenario.payloadSize ? `${scenario.payloadSize}B`     : 'Per defecte (256B)'],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v || '-'}</strong>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Cancel·la</button>
        <button onClick={handleExecute} style={{ ...S.btnPrimary, fontSize: 13, background: 'var(--success)', boxShadow: 'none' }}>
          <PlayIcon /> Executa a AKS
        </button>
      </div>
    </div></div>
  );

  if (state === 'running') return (
    <div style={overlay}><div style={{ ...card, textAlign: 'center' as const, padding: 48 }}>
      <div style={{ color: 'var(--accent)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}><GearIcon /></div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Desplegant a AKS...</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Creant namespace i Job de càrrega</p>
    </div></div>
  );

  if (state === 'done') return (
    <div style={overlay}><div style={card}>
      <div style={{ textAlign: 'center' as const, marginBottom: 20 }}>
        <div style={{ color: 'var(--success)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}><RocketIcon /></div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Escenari desplegat!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 16px' }}>El Job s'ha creat a AKS correctament.</p>
      </div>
      <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid var(--success)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
        <div style={{ color: 'var(--success)', marginBottom: 4, fontWeight: 700 }}>ID d'execucio</div>
        <code style={{ fontSize: 12, color: 'var(--success)', wordBreak: 'break-all' as const, fontFamily: 'var(--font-mono)' }}>{runId}</code>
      </div>
      <div style={{ background: 'var(--badge-blue-bg)', border: '1px solid var(--badge-blue-fg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--badge-blue-fg)', marginBottom: 20, opacity: 0.9 }}>
        Ves a <strong>Execucions</strong> per monitoritzar el progres i <strong>Resultats</strong> per veure les metriques en viu.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Tanca</button>
        <button onClick={() => { window.location.href = '/execucions'; }} style={{ ...S.btnPrimary, fontSize: 13 }}>
          Veure Execucions
        </button>
      </div>
    </div></div>
  );

  return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Desplegament fallit</h3>
      <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid var(--error)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--error)' }}>{error}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Tanca</button>
        <button onClick={() => setState('confirm')} style={{ ...S.btnPrimary, fontSize: 13, background: 'var(--warning)', boxShadow: 'none' }}>Torna a intentar</button>
      </div>
    </div></div>
  );
};

// ── Toast ──────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const c = {
    success: { bg: 'rgba(34,197,94,0.12)',  border: 'var(--success)', color: 'var(--success)' },
    error:   { bg: 'rgba(220,38,38,0.12)',  border: 'var(--error)',   color: 'var(--error)' },
    info:    { bg: 'var(--badge-blue-bg)',  border: 'var(--accent)',  color: 'var(--accent)' },
  }[type];
  return (
    <div role="alert" aria-live="polite"
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)', maxWidth: 360, animation: 'fadeUp 0.2s ease', fontFamily: 'var(--font)' }}
    >
      {message}
    </div>
  );
};

// ── Detall d'escenari (modal overlay) ─────────────────────────────────────────
const ScenarioDetail = ({ scenario, onClose, onExecute, onStop, onEdit, onDelete, onDuplicate, isRunning }: {
  scenario: Scenario; onClose: () => void; onExecute: () => void; onStop: () => void;
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void; isRunning: boolean;
}) => {
  const status    = STATUS_CONFIG[scenario.status || 'idle'] || STATUS_CONFIG.idle;
  const dfColor   = DATA_FORMAT_COLORS[scenario.dataFormat || 'default'] || DATA_FORMAT_COLORS['default'];
  const dfLabel   = DATA_FORMAT_LABELS[scenario.dataFormat || 'default'] || 'Per defecte';
  const platName  = normalizePlatform(scenario.platform || scenario.broker);
  const platColor = PLATFORM_COLORS[platName] || 'var(--text-secondary)';
  const isIndefinite = scenario.duration != null && Number(scenario.duration) >= 3600;

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.backdrop) onClose();
  };

  const Section = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 8, marginTop: 4 }}>{title}</div>
  );

  const Row = ({ label, value, badge }: { label: string; value?: string; badge?: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
      {badge ?? <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{value || '-'}</span>}
    </div>
  );

  return (
    <div data-backdrop="1" onClick={handleBackdropClick}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 20 }}
    >
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
              <span style={{ background: isRunning ? 'rgba(59,130,246,0.1)' : status.bg, color: isRunning ? '#3b82f6' : status.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {isRunning && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'pulseDot 1.5s ease infinite' }} />}
                {isRunning ? 'En execució' : status.label}
              </span>
              {isIndefinite && (
                <span style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  ∞ Mode Indefinit
                </span>
              )}
              {scenario.predefined && (
                <span style={{ background: 'var(--bg-hover)', color: 'var(--text-disabled)', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>Sistema</span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-word' as const }}>{scenario.name || 'Sense nom'}</h3>
          </div>
          <button onClick={onClose} aria-label="Tancar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, borderRadius: 8, flexShrink: 0, marginLeft: 12, transition: 'background 0.15s' }}>
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {/* Left column */}
          <div>
            <Section title="Configuració tècnica" />
            <Row label="Arquitectura" badge={<span style={{ ...S.badge(ARCHITECTURE_COLORS[scenario.architecture] || '#2563eb'), fontSize: 10 }}>{scenario.architecture || '-'}</span>} />
            <Row label="Protocol"     badge={<span style={{ ...S.badge(PROTOCOL_COLORS[scenario.protocol] || '#16a34a'), fontSize: 10 }}>{scenario.protocol || '-'}</span>} />
            <Row label="Plataforma"   badge={platName ? <span style={{ ...S.badge(platColor), fontSize: 10 }}>{platName}</span> : undefined} value={platName ? undefined : '-'} />
            <Row label="Format dades" badge={<span style={{ ...S.badge(dfColor), fontSize: 10 }}>{dfLabel}</span>} />
          </div>

          {/* Right column */}
          <div>
            <Section title="Paràmetres d'execució" />
            <Row
              label="Durada"
              badge={isIndefinite
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>∞ Indefinit (max 1h)</span>
                : undefined}
              value={!isIndefinite ? (scenario.duration ? `${scenario.duration} s` : '-') : undefined}
            />
            <Row label="Ràtio"
              badge={isIndefinite
                ? <span style={{ fontSize: 12, color: 'var(--text-disabled)', fontStyle: 'italic' }}>valor per defecte</span>
                : undefined}
              value={!isIndefinite ? (scenario.rate ? `${scenario.rate} msg/s` : '-') : undefined}
            />
            <Row label="Payload"
              badge={isIndefinite
                ? <span style={{ fontSize: 12, color: 'var(--text-disabled)', fontStyle: 'italic' }}>valor per defecte</span>
                : undefined}
              value={!isIndefinite ? (scenario.payloadSize ? `${scenario.payloadSize} B` : '-') : undefined}
            />
            <Row label="Creat" value={scenario.createdAt ? new Date(scenario.createdAt).toLocaleDateString('ca-ES') : '-'} />
          </div>
        </div>

        {/* Indefinite mode notice */}
        {isIndefinite && (
          <div style={{ margin: '0 24px 8px', padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent)' }}>Mode Indefinit:</strong> S'utilitzen els ràtio i payload per defecte del format <strong>{dfLabel}</strong>. L'execució s'atura manualment o transcorreguda 1 hora.
          </div>
        )}

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
          <button onClick={onDuplicate} style={{ ...S.btn, fontSize: 13 }}><DuplicateIcon /> Duplicar</button>
          <button onClick={onEdit}      style={{ ...S.btn, fontSize: 13 }}><EditIcon /> Editar</button>
          <button onClick={onDelete}    style={{ ...S.btn, fontSize: 13, color: 'var(--error)', borderColor: 'var(--error)' }}><TrashIcon /> Eliminar</button>
          <div style={{ flex: 1 }} />
          {isRunning ? (
            <button onClick={() => { onStop(); onClose(); }}
              style={{ ...S.btn, fontSize: 13, background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)', color: 'var(--error)' }}>
              <StopIcon /> Aturar execució
            </button>
          ) : (
            <button onClick={() => { onExecute(); onClose(); }}
              style={{ ...S.btnPrimary, fontSize: 13 }}>
              <PlayIcon /> Executar ara
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Guia d'escenaris ──────────────────────────────────────────────────────────
const BookIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const ChevronIcon = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9"/></svg>;

const GUIDE_ITEMS = [
  {
    color: '#2563eb',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    title: 'Estructura d\'un escenari',
    desc: 'Cada escenari combina una Plataforma (broker), una Arquitectura de missatgeria i un Protocol de transport. Selecciona\'ls en ordre: la plataforma filtra automàticament les arquitectures i protocols compatibles.',
  },
  {
    color: '#16a34a',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    title: 'Paràmetres d\'execució',
    desc: 'La Durada (en segons) controla quant temps corre el benchmark. El Ràtio (msg/s) és la taxa d\'enviament. El Payload (bytes) és la mida de cada missatge. Junts, determinen la càrrega total sobre el clúster AKS.',
  },
  {
    color: '#2563eb',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    title: 'Mode Indefinit',
    desc: 'Quan la durada és ≥ 3600 s (1 hora), s\'activa el mode indefinit. El benchmark corre contínuament amb els valors per defecte del format de dades seleccionat fins que s\'atura manualment. Ideal per a proves de durada indeterminada.',
  },
  {
    color: '#7c3aed',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    title: 'Formats de dades',
    desc: 'El Format de dades simula càrregues reals. Per defecte: bytes aleatoris. Vídeo 4K/8K: payloads grans (~4/16 Mbps). Financer: JSON compacte de baix payload. IoT: telemetria mínima d\'alta freqüència. Cada format ajusta automàticament ràtio i payload en mode indefinit.',
  },
];

const ScenarioGuide = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...S.card, marginBottom: 24, padding: 0, overflow: 'hidden' }}>
      {/* Header (toggle) */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font)', textAlign: 'left' }}
      >
        <span style={{ color: 'var(--accent)', display: 'flex' }}><BookIcon /></span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', flex: 1 }}>Com funcionen els escenaris?</span>
        <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginRight: 8 }}>
          {open ? 'Amagar' : 'Mostrar guia'}
        </span>
        <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><ChevronIcon open={open} /></span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
          {/* Flux de treball */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '16px 0 20px', overflowX: 'auto', paddingBottom: 4 }}>
            {[
              { n: '1', label: 'Tria una plataforma', sub: 'Kafka, RabbitMQ, NATS…', color: '#2563eb' },
              { n: '2', label: 'Selecciona arquitectura i protocol', sub: 'Compatibles amb la plataforma', color: '#7c3aed' },
              { n: '3', label: 'Configura la càrrega', sub: 'Durada · Ràtio · Payload · Format', color: '#16a34a' },
              { n: '4', label: 'Executa a AKS', sub: 'Boto "Executa" o en lot', color: '#f59e0b' },
              { n: '5', label: 'Analitza resultats', sub: 'Mètriques en directe i historial', color: '#22c55e' },
            ].map((step, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 4px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: step.color + '18', border: `1.5px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: step.color, fontFamily: 'var(--font-mono)' }}>
                    {step.n}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' as const, textAlign: 'center' }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const, textAlign: 'center' }}>{step.sub}</div>
                </div>
                {i < arr.length - 1 && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, margin: '0 2px', marginBottom: 20 }}><polyline points="9 18 15 12 9 6"/></svg>
                )}
              </div>
            ))}
          </div>

          {/* Grid de conceptes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {GUIDE_ITEMS.map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderLeft: `3px solid ${item.color}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: item.color, display: 'flex' }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Mode indefinit destacat */}
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent)' }}>Consell:</strong>{' '}
            Utilitza els <strong style={{ color: 'var(--text-primary)' }}>escenaris predefinits</strong> com a punt de partida. Estan optimitzats per als casos d'ús més habituals i serveixen de referència per entendre les combinacions recomanades.
          </div>
        </div>
      )}
    </div>
  );
};

// ── ScenariosPage ──────────────────────────────────────────────────────────────
export const ScenariosPage = () => {
  const [scenarios,        setScenarios]        = useState<Scenario[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [filterArch,       setFilterArch]       = useState('all');
  const [filterProto,      setFilterProto]      = useState('all');
  const [filterPlatform,   setFilterPlatform]   = useState('all');
  const [filterDataFormat, setFilterDataFormat] = useState('all');
  const [hoveredRow,       setHoveredRow]       = useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showModal,        setShowModal]        = useState(false);
  const [editScenario,     setEditScenario]     = useState<any | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<Scenario | null>(null);
  const [executeTarget,    setExecuteTarget]    = useState<Scenario | null>(null);
  const [toast,            setToast]            = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [runningMap,       setRunningMap]       = useState<Record<string, string>>({});
  const [sortKey,          setSortKey]          = useState<string | null>(null);
  const [sortDir,          setSortDir]          = useState<SortDir | null>(null);
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [bulkExecuting,    setBulkExecuting]    = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');

  const handleSort = (sk: string) => {
    if (sortKey !== sk) { setSortKey(sk); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir(null);
  };

  useEffect(() => { document.title = 'Escenaris | APIs Asíncrones'; }, []);

  const fetchRunningMap = useCallback(() => {
    fetch(`${ORCHESTRATOR}/runs`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.filter(r => r.status === 'running' || r.status === 'pending')
              .forEach(r => { if (r.scenarioId) map[r.scenarioId] = r.id; });
          setRunningMap(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchRunningMap();
    const i = setInterval(fetchRunningMap, 6000);
    return () => clearInterval(i);
  }, [fetchRunningMap]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setShowModal(true);
      const prefill = {
        name: params.get('name') || '', architecture: params.get('architecture') || '',
        protocol: params.get('protocol') || '', platform: params.get('platform') || '',
        duration: params.get('duration') || '', rate: params.get('rate') || '',
        payloadSize: params.get('payloadSize') || '', dataFormat: '',
      };
      if (prefill.name) setEditScenario({ ...prefill, _prefill: true });
      window.history.replaceState({}, '', '/escenaris');
    }
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/scenarios`).then(r => r.json())
      .then(sc => { setScenarios(Array.isArray(sc) ? sc : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/scenarios/${deleteTarget.id}`, { method: 'DELETE' });
      if (selectedScenario?.id === deleteTarget.id) setSelectedScenario(null);
      setDeleteTarget(null); fetchData();
      setToast({ message: 'Escenari eliminat.', type: 'info' });
    } catch (e: any) { setToast({ message: 'Error: ' + e.message, type: 'error' }); setDeleteTarget(null); }
  };

  const handleDuplicate = async (s: Scenario) => {
    const copy = {
      name: `${s.name} (copia)`,
      architecture: s.architecture,
      protocol: s.protocol,
      platform: normalizePlatform(s.platform || s.broker),
      duration: s.duration,
      rate: s.rate,
      payloadSize: s.payloadSize,
      dataFormat: s.dataFormat || 'default',
      predefined: false,
      status: 'idle',
    };
    try {
      await fetch(`${API_BASE}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy),
      });
      fetchData();
      setToast({ message: `Copia de "${s.name}" creada.`, type: 'success' });
    } catch (e: any) {
      setToast({ message: 'Error en duplicar: ' + e.message, type: 'error' });
    }
  };

  const handleStopScenario = async (scenario: Scenario) => {
    const runId = runningMap[scenario.id!];
    if (!runId) return;
    try {
      await fetch(`${ORCHESTRATOR}/runs/${runId}/cancel`, { method: 'POST' });
      // Optimistic: remove from running map immediately
      setRunningMap(prev => { const next = { ...prev }; delete next[scenario.id!]; return next; });
      setToast({ message: `Escenari "${scenario.name}" aturat.`, type: 'info' });
      setTimeout(fetchRunningMap, 2000);
    } catch (e: any) { setToast({ message: 'Error en aturar: ' + e.message, type: 'error' }); }
  };

  // Optimistic update quan un escenari comenca a executar-se
  const handleScenarioStarted = (scenarioId: string, runId: string) => {
    setRunningMap(prev => ({ ...prev, [scenarioId]: runId }));
    // Re-fetch amb delay per confirmar l'estat real
    setTimeout(fetchRunningMap, 2000);
    setTimeout(fetchRunningMap, 5000);
  };

  // ── Batch execution ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    const nonRunning = sortedFiltered.filter(s => s.id && !runningMap[s.id!]);
    const allSelected = nonRunning.every(s => selectedIds.has(s.id!));
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (allSelected) { nonRunning.forEach(sc => s.delete(sc.id!)); }
      else { nonRunning.forEach(sc => s.add(sc.id!)); }
      return s;
    });
  };

  const handleBulkExecute = async () => {
    const toExecute = sortedFiltered.filter(s => s.id && selectedIds.has(s.id!) && !runningMap[s.id!]);
    if (toExecute.length === 0) return;
    setBulkExecuting(true);
    let okCount = 0, errCount = 0;
    for (const sc of toExecute) {
      try {
        const r = await fetch(`${ORCHESTRATOR}/runs`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: sc.id, scenarioName: sc.name,
            architecture: sc.architecture, protocol: sc.protocol,
            platform: normalizePlatform(sc.platform || sc.broker),
            dataFormat: sc.dataFormat || 'default',
            duration: sc.duration ?? null, rate: sc.rate ?? null, payloadSize: sc.payloadSize ?? null,
          }),
        });
        if (r.ok) {
          const data = await r.json();
          handleScenarioStarted(sc.id!, data.runId || data.id || '');
          okCount++;
        } else { errCount++; }
      } catch { errCount++; }
      // Small delay between launches to avoid overwhelming the cluster
      await new Promise(r => setTimeout(r, 800));
    }
    setBulkExecuting(false);
    setSelectedIds(new Set());
    fetchRunningMap();
    fetchData();
    if (errCount === 0) {
      setToast({ message: `${okCount} escenari${okCount > 1 ? 's' : ''} executat${okCount > 1 ? 's' : ''} correctament!`, type: 'success' });
    } else {
      setToast({ message: `${okCount} executats, ${errCount} errors.`, type: 'error' });
    }
  };

  const openEdit = (s: Scenario) => {
    setEditScenario({
      id: s.id, createdAt: s.createdAt,
      name: s.name || '', architecture: s.architecture || '',
      protocol: s.protocol || '', platform: normalizePlatform(s.platform || s.broker) || '',
      duration: s.duration ? String(s.duration) : '',
      rate: s.rate ? String(s.rate) : '',
      payloadSize: s.payloadSize ? String(s.payloadSize) : '',
      dataFormat: s.dataFormat || '',
    });
    setShowModal(true);
  };

  const openPreset = (preset: typeof PREDEFINED_PRESETS[0]) => {
    setEditScenario({
      ...EMPTY_FORM,
      _prefill: true,
      name:         preset.name,
      platform:     preset.platform,
      architecture: preset.architecture,
      protocol:     preset.protocol,
      dataFormat:   preset.dataFormat,
      duration:     preset.duration,
      rate:         preset.rate,
      payloadSize:  preset.payloadSize,
    });
    setShowModal(true);
  };

  const filtered = scenarios.filter(s => {
    if (filterArch       !== 'all' && s.architecture !== filterArch)                             return false;
    if (filterProto      !== 'all' && s.protocol     !== filterProto)                            return false;
    if (filterPlatform   !== 'all' && normalizePlatform(s.platform || s.broker) !== filterPlatform) return false;
    if (filterDataFormat !== 'all' && (s.dataFormat || 'default') !== filterDataFormat)          return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (s.name || '').toLowerCase();
      const arch = (s.architecture || '').toLowerCase();
      const prot = (s.protocol || '').toLowerCase();
      const plat = normalizePlatform(s.platform || s.broker).toLowerCase();
      if (!name.includes(q) && !arch.includes(q) && !prot.includes(q) && !plat.includes(q)) return false;
    }
    return true;
  });
  const isFiltered = filterArch !== 'all' || filterProto !== 'all' || filterPlatform !== 'all' || filterDataFormat !== 'all' || searchQuery.trim() !== '';

  const sortedFiltered = sortKey == null
    ? filtered
    : [...filtered].sort((a, b) => {
        const av = (a as any)[sortKey] ?? '';
        const bv = (b as any)[sortKey] ?? '';
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'ca');
        return sortDir === 'desc' ? -cmp : cmp;
      });

  const formatTime = (iso: string) =>
    !iso ? '-' : new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const modalInitial = editScenario?._prefill
    ? { ...EMPTY_FORM, ...editScenario }
    : editScenario ?? EMPTY_FORM;
  const modalMode = editScenario?.id && !editScenario._prefill ? 'edit' : 'create';

  const activeFiltersCount = [filterArch, filterProto, filterPlatform, filterDataFormat].filter(f => f !== 'all').length;

  const FILTER_DEFS = [
    { label: 'Plataforma',   value: filterPlatform,   options: ALL_PLATFORMS.filter(p => !DISABLED_PLATFORMS.includes(p)),      onChange: setFilterPlatform,   allLabel: 'Totes', accentColor: '#f59e0b' },
    { label: 'Protocol',     value: filterProto,      options: ALL_PROTOCOLS,                                                   onChange: setFilterProto,      allLabel: 'Tots',  accentColor: '#16a34a' },
    { label: 'Arquitectura', value: filterArch,       options: ALL_ARCHITECTURES,                                               onChange: setFilterArch,       allLabel: 'Totes', accentColor: '#2563eb' },
    { label: 'Format',       value: filterDataFormat, options: ['default', 'video-4k', 'video-8k', 'financial', 'iot'],          onChange: setFilterDataFormat, allLabel: 'Tots',  accentColor: '#7c3aed' },
  ];

  return (
    <div style={{ ...S.page, maxWidth: 1340 }}>
      <style>{GLOBAL_CSS}</style>
      {showModal     && <ScenarioModal mode={modalMode as 'create' | 'edit'} initial={modalInitial} onClose={() => { setShowModal(false); setEditScenario(null); }} onSaved={fetchData} />}
      {deleteTarget  && <DeleteModal name={deleteTarget.name || 'aquest escenari'} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {executeTarget && <ExecuteModal scenario={executeTarget} onStarted={handleScenarioStarted} onClose={() => { setExecuteTarget(null); fetchData(); fetchRunningMap(); }} />}
      {toast         && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Capçalera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Escenaris de Benchmark</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Configuracions de carrega per provar combinacions d'APIs asincrones
          </p>
        </div>
        <button onClick={() => { setEditScenario(null); setShowModal(true); }} style={{ ...S.btnPrimary, whiteSpace: 'nowrap' }}>
          <PlusIcon /> Nou Escenari
        </button>
      </div>

      {/* ── Stats strip ── */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: scenarios.length,              color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: 'En execució', value: Object.keys(runningMap).length, color: '#3b82f6',               bg: 'rgba(59,130,246,0.08)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Guia ── */}
      <ScenarioGuide />

      {/* ── Escenaris Predefinits ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Escenaris predefinits recomanats
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 12 }}>
          {PREDEFINED_PRESETS.map((preset, i) => {
            const dfColor = DATA_FORMAT_COLORS[preset.dataFormat] || '#6b7280';
            return (
              <button
                key={i}
                onClick={() => openPreset(preset)}
                style={{
                  background:   'var(--bg-card)',
                  border:       `1px solid var(--border)`,
                  borderTop:    `3px solid ${preset.color}`,
                  borderRadius: 10,
                  padding:      '16px',
                  textAlign:    'left',
                  cursor:       'pointer',
                  fontFamily:   'var(--font)',
                  transition:   'all 0.18s ease',
                  display:      'flex',
                  flexDirection: 'column' as const,
                  gap:          8,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${preset.color}18`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.borderColor = preset.color + '50';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{preset.name}</span>
                  <span style={{ ...S.badge(dfColor), fontSize: 10, flexShrink: 0, marginLeft: 6 }}>
                    {DATA_FORMAT_LABELS[preset.dataFormat] || preset.dataFormat}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {preset.desc}
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ ...S.badge(PLATFORM_COLORS[preset.platform] || '#666'), fontSize: 10 }}>{preset.platform}</span>
                  <span style={{ ...S.badge(PROTOCOL_COLORS[preset.protocol] || '#666'), fontSize: 10 }}>{preset.protocol}</span>
                </div>
                <div style={{ fontSize: 11, color: preset.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <PlusIcon /> Usar com a base
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filtres millorats ── */}
      <div style={{ ...S.card, marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Icona filtre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: activeFiltersCount > 0 ? 'var(--accent)' : 'var(--text-disabled)', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filtres</span>
            {activeFiltersCount > 0 && (
              <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 17, height: 17, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {activeFiltersCount}
              </span>
            )}
          </div>

          {/* Separador */}
          <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

          {/* Selects per cada filtre */}
          {FILTER_DEFS.map(({ label, value, options, onChange, allLabel, accentColor }) => {
            const active = value !== 'all';
            return (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? accentColor : 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </span>
                <select
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  style={makeSelStyle(active, accentColor)}
                >
                  <option value="all">{allLabel}</option>
                  {options.map(o => <option key={o} value={o}>{DATA_FORMAT_LABELS[o] || o}</option>)}
                </select>
              </div>
            );
          })}

          {isFiltered && (
            <button
              onClick={() => { setFilterArch('all'); setFilterProto('all'); setFilterPlatform('all'); setFilterDataFormat('all'); setSearchQuery(''); }}
              style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--error)', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font)', fontWeight: 600 }}>
              <CloseIcon /> Netejar filtres
            </button>
          )}
        </div>
      </div>

      {/* Taula + Detall */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ ...S.card, padding: 0, overflow: 'hidden', flex: selectedScenario ? '0 0 auto' : 1, width: selectedScenario ? 'calc(100% - 340px)' : '100%' }}>
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{loading ? '-' : filtered.length}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>escenari{filtered.length !== 1 ? 's' : ''}</span>
              {isFiltered && !loading && (
                <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>
                  de {scenarios.length} totals
                </span>
              )}
              {Object.keys(runningMap).length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulseDot 1.5s ease infinite' }} />
                  {Object.keys(runningMap).length} en execució
                </span>
              )}
              {/* Search input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', minWidth: 180 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Cerca escenaris..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font)', width: '100%' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, display: 'flex', fontSize: 14, lineHeight: 1 }}>×</button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Bulk execute bar */}
              {selectedIds.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>
                    {selectedIds.size} seleccionat{selectedIds.size !== 1 ? 's' : ''}
                  </span>
                  <div style={{ width: 1, height: 14, background: 'rgba(34,197,94,0.25)' }} />
                  <button
                    onClick={handleBulkExecute}
                    disabled={bulkExecuting}
                    style={{ ...S.btnPrimary, fontSize: 12, padding: '3px 12px', background: 'var(--success)', boxShadow: 'none', gap: 4, opacity: bulkExecuting ? 0.6 : 1 }}
                  >
                    <PlayIcon /> {bulkExecuting ? 'Executant...' : `Executar ${selectedIds.size}`}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    style={{ ...S.btn, fontSize: 11, padding: '3px 8px' }}
                  >
                    Cancel·la
                  </button>
                </div>
              )}
              <button onClick={fetchData} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font)' }}>
                <RefreshIcon /> Actualitzar
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--error)', padding: '12px 18px', margin: 0 }}>Error: {error}</p>}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-busy={loading} aria-label="Llista d'escenaris de benchmark">
              <thead>
                <tr style={S.tableHeader}>
                  <th style={{ ...S.th, width: 40, textAlign: 'center', paddingLeft: 12, paddingRight: 4 }}>
                    <button
                      onClick={toggleSelectAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Seleccionar/deseleccionar tots"
                    >
                      {(() => {
                        const nonRunning = sortedFiltered.filter(s => s.id && !runningMap[s.id!]);
                        const allSel = nonRunning.length > 0 && nonRunning.every(s => selectedIds.has(s.id!));
                        const someSel = nonRunning.some(s => selectedIds.has(s.id!)) && !allSel;
                        if (someSel) return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/></svg>;
                        if (allSel) return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--accent)"/><path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                        return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/></svg>;
                      })()}
                    </button>
                  </th>
                  <SortTh label="Nom"          sk="name"         current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Arquitectura" sk="architecture" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Protocol"     sk="protocol"     current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Plataforma"   sk="platform"     current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Format"       sk="dataFormat"   current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Estat"        sk="status"       current={sortKey} dir={sortDir} onSort={handleSort} extraStyle={{ textAlign: 'center' }} />
                  <SortTh label="Creat"        sk="createdAt"    current={sortKey} dir={sortDir} onSort={handleSort} extraStyle={{ textAlign: 'right' }} />
                  <th style={{ ...S.th, textAlign: 'center', width: 130 }}>Accions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} delay={i * 0.08} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 60, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <EmptyIcon />
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Cap escenari trobat</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {isFiltered ? 'Prova a canviar els filtres.' : "Crea'n un amb el boto de dalt."}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : sortedFiltered.map((s, i) => {
                  const st         = STATUS_CONFIG[s.status || 'idle'] || STATUS_CONFIG.idle;
                  const isRunning  = !!runningMap[s.id!];
                  const dfColor    = DATA_FORMAT_COLORS[s.dataFormat || 'default'] || '#6b7280';
                  const dfLabel    = DATA_FORMAT_LABELS[s.dataFormat || ''] || '';
                  const platName   = normalizePlatform(s.platform || s.broker);
                  const platColor  = PLATFORM_COLORS[platName] || 'var(--text-secondary)';
                  const isSelected = selectedScenario?.id === s.id;
                  return (
                    <tr key={s.id || i}
                      style={{
                        ...S.tableRow,
                        background:   isSelected ? 'var(--bg-hover)' : hoveredRow === i ? 'var(--bg-hover)' : selectedIds.has(s.id!) ? 'rgba(34,197,94,0.03)' : 'transparent',
                        cursor:       'pointer',
                        borderLeft:   isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                        transition:   'all 0.15s ease',
                      }}
                      onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => setSelectedScenario((prev: Scenario | null) => prev?.id === s.id ? null : s)}
                    >
                      {/* Checkbox */}
                      <td style={{ ...S.td, width: 40, paddingLeft: 12, paddingRight: 4, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        {!isRunning && s.id && (
                          <button
                            onClick={() => toggleSelect(s.id!)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={selectedIds.has(s.id!) ? 'Deseleccionar' : 'Seleccionar'}
                          >
                            {selectedIds.has(s.id!)
                              ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--accent)"/><path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/></svg>}
                          </button>
                        )}
                      </td>
                      <td style={{ ...S.td, fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {isRunning && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, animation: 'pulseDot 1.5s ease infinite' }} />}
                          {s.name || '-'}
                        </div>
                      </td>
                      <td style={S.td}>
                        {s.architecture ? <span style={{ ...S.badge(ARCHITECTURE_COLORS[s.architecture] || '#2563eb'), fontSize: 11 }}>{s.architecture}</span> : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={S.td}>
                        {s.protocol ? <span style={{ ...S.badge(PROTOCOL_COLORS[s.protocol] || '#16a34a'), fontSize: 11 }}>{s.protocol}</span> : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={S.td}>
                        {platName
                          ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{platName}</span>
                          : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={S.td}>
                        <span style={{ ...S.badge(dfColor), fontSize: 10 }}>
                          {s.dataFormat && s.dataFormat !== 'default' ? dfLabel : 'Per defecte'}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <span style={{ background: isRunning ? 'rgba(59,130,246,0.1)' : st.bg, color: isRunning ? '#3b82f6' : st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isRunning && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'pulseDot 1.5s ease infinite' }} />}
                          {isRunning ? 'En execucio' : st.label}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {formatTime(s.createdAt || '')}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {isRunning ? (
                            <button title="Aturar execucio" aria-label={`Aturar execucio de ${s.name}`} onClick={() => handleStopScenario(s)}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--error)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--error)' }}>
                              <StopIcon />
                            </button>
                          ) : (
                            <button title="Executar a AKS" aria-label={`Executar ${s.name} a AKS`} onClick={() => setExecuteTarget(s)}
                              style={{ background: 'var(--badge-green-bg)', border: '1px solid var(--badge-green-fg)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--badge-green-fg)' }}>
                              <PlayIcon />
                            </button>
                          )}
                          <button title="Duplicar escenari" aria-label={`Duplicar ${s.name}`} onClick={() => handleDuplicate(s)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}>
                            <DuplicateIcon />
                          </button>
                          <button title="Editar" aria-label={`Editar ${s.name}`} onClick={() => openEdit(s)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}>
                            <EditIcon />
                          </button>
                          <button title="Eliminar" aria-label={`Eliminar ${s.name}`} onClick={() => setDeleteTarget(s)}
                            style={{ background: 'none', border: '1px solid var(--error)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--error)' }}>
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedScenario && (
          <ScenarioDetail
            scenario={selectedScenario}
            isRunning={!!runningMap[selectedScenario.id!]}
            onClose={() => setSelectedScenario(null)}
            onExecute={() => setExecuteTarget(selectedScenario)}
            onStop={() => handleStopScenario(selectedScenario)}
            onEdit={() => openEdit(selectedScenario)}
            onDelete={() => setDeleteTarget(selectedScenario)}
            onDuplicate={() => handleDuplicate(selectedScenario)}
          />
        )}
      </div>
    </div>
  );
};

