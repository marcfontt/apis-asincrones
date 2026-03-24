import { useEffect, useState, useCallback } from 'react';

const API_BASE     = '/api/proxy/scenario-service';
const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';

const ALL_ARCHITECTURES = ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'];
const ALL_PROTOCOLS     = ['WS', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'];
const ALL_PLATFORMS     = ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'];

const COMPATIBILITY: Record<string, { architectures: string[]; protocols: string[] }> = {
  'Kafka':       { architectures: ['EDA', 'SEA', 'QBA'], protocols: ['Kafka', 'AMQP', 'gRPC'] },
  'RabbitMQ':    { architectures: ['EDA', 'QBA', 'EMA'], protocols: ['AMQP', 'MQTT', 'WS'] },
  'Confluent':   { architectures: ['EDA', 'SEA', 'QBA'], protocols: ['Kafka', 'AMQP', 'gRPC'] },
  'Pulsar':      { architectures: ['EDA', 'QBA', 'SEA'], protocols: ['AMQP', 'WS', 'gRPC'] },
  'NATS Server': { architectures: ['EDA', 'LCA', 'SEA'], protocols: ['NATS', 'WS', 'gRPC'] },
};

const getCompatibleArchitectures = (p: string) => COMPATIBILITY[p]?.architectures ?? ALL_ARCHITECTURES;
const getCompatibleProtocols     = (p: string) => COMPATIBILITY[p]?.protocols     ?? ALL_PROTOCOLS;

const EMPTY_FORM = { name: '', architecture: '', protocol: '', platform: '', duration: '', rate: '', payloadSize: '' };

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  idle:      { color: '#94a3b8', label: 'Llest' },
  pending:   { color: '#f59e0b', label: 'Pendent' },
  running:   { color: '#3b82f6', label: 'En execució' },
  completed: { color: '#22c55e', label: 'Completat' },
  error:     { color: '#ef4444', label: 'Error' },
};

// ── Icones SVG ─────────────────────────────────────────────────────────────────
const PlayIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const EditIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const CloseIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const RocketIcon  = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m3.29 15 5 5"/><path d="M13 7 7 13"/><path d="m20 7-5 3-3 5 2 2 5-3 3-5z"/></svg>;
const GearIcon    = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const PlusIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ChevronIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>;

// ── Estils comuns (dark-theme aware via CSS vars) ──────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 14, boxSizing: 'border-box',
  outline: 'none',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--text-secondary)',
  marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
};

// ── Modal: crear / editar escenari ────────────────────────────────────────────
const ScenarioModal = ({ mode, initial, onClose, onSaved }: {
  mode: 'create' | 'edit';
  initial: typeof EMPTY_FORM & { id?: string };
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      setError('El nom, arquitectura, protocol i plataforma són obligatoris.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(), architecture: form.architecture,
        protocol: form.protocol, platform: form.platform,
        duration: form.duration ? Number(form.duration) : undefined,
        rate: form.rate ? Number(form.rate) : undefined,
        payloadSize: form.payloadSize ? Number(form.payloadSize) : undefined,
        predefined: false, status: 'idle',
      };
      const url = mode === 'edit' && form.id ? `${API_BASE}/scenarios/${form.id}` : `${API_BASE}/scenarios`;
      const r = await fetch(url, { method: mode === 'edit' && form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' };
  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' };

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            {mode === 'edit' ? 'Editar Escenari' : 'Nou Escenari'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><CloseIcon /></button>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div><label style={lbl}>Nom *</label><input style={inp} placeholder="ex. MQTT-EDA-Kafka-Basic" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div>
            <label style={lbl}>Plataforma / Broker * <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-secondary)' }}>(selecciona primer)</span></label>
            <select style={inp} value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">Selecciona...</option>
              {ALL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Arquitectura * {form.platform && <span style={{ color: 'var(--accent)', fontWeight: 400 }}>({ca.length} compatibles)</span>}</label>
              <select style={inp} value={form.architecture} onChange={e => set('architecture', e.target.value)}>
                <option value="">Selecciona...</option>
                {ALL_ARCHITECTURES.map(a => { const ok = ca.includes(a); return <option key={a} value={a} disabled={!ok} style={!ok ? { color: 'var(--text-disabled)' } : {}}>{a}{!ok && form.platform ? ' (incompatible)' : ''}</option>; })}
              </select>
            </div>
            <div>
              <label style={lbl}>Protocol * {form.platform && <span style={{ color: 'var(--accent)', fontWeight: 400 }}>({cp.length} compatibles)</span>}</label>
              <select style={inp} value={form.protocol} onChange={e => set('protocol', e.target.value)}>
                <option value="">Selecciona...</option>
                {ALL_PROTOCOLS.map(p => { const ok = cp.includes(p); return <option key={p} value={p} disabled={!ok} style={!ok ? { color: 'var(--text-disabled)' } : {}}>{p}{!ok && form.platform ? ' (incompatible)' : ''}</option>; })}
              </select>
            </div>
          </div>
          {form.platform && (
            <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--accent)', opacity: 0.9 }}>
              <strong>{form.platform}</strong> · Arquitectures: {ca.join(', ')} · Protocols: {cp.join(', ')}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Durada (s)</label><input style={inp} type="number" min={1} placeholder="60" value={form.duration} onChange={e => set('duration', e.target.value)} /></div>
            <div><label style={lbl}>Ràtio (msg/s)</label><input style={inp} type="number" min={1} placeholder="1000" value={form.rate} onChange={e => set('rate', e.target.value)} /></div>
            <div><label style={lbl}>Payload (bytes)</label><input style={inp} type="number" min={1} placeholder="256" value={form.payloadSize} onChange={e => set('payloadSize', e.target.value)} /></div>
          </div>
          {error && <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', color: 'var(--error)', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel·la</button>
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Desant...' : mode === 'edit' ? 'Desa els canvis' : 'Crea Escenari'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal: confirmar eliminació ───────────────────────────────────────────────
const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Eliminar Escenari</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>Segur que vols eliminar <strong style={{ color: 'var(--text-primary)' }}>{name}</strong>? Aquesta acció no es pot desfer.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel·la</button>
        <button onClick={onConfirm} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--error)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Elimina</button>
      </div>
    </div>
  </div>
);

// ── Modal: executar escenari ──────────────────────────────────────────────────
const ExecuteModal = ({ scenario, onClose }: { scenario: any; onClose: () => void }) => {
  const [state, setState] = useState<'confirm' | 'running' | 'done' | 'error'>('confirm');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState('');

  const handleExecute = async () => {
    setState('running');
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: scenario.id, scenarioName: scenario.name }),
      });
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `HTTP ${r.status}`); }
      const data = await r.json();
      setRunId(data.runId || data.id || '');
      setState('done');
    } catch (e: any) { setError(e.message); setState('error'); }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' };
  const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.35)' };

  if (state === 'confirm') return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Executar Escenari</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>Es desplegarà un Job al AKS per l'escenari <strong style={{ color: 'var(--text-primary)' }}>{scenario.name}</strong>.</p>
      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, display: 'grid', gap: 6 }}>
        {([['Arquitectura', scenario.architecture], ['Protocol', scenario.protocol], ['Plataforma', scenario.platform || scenario.broker], ['Durada', scenario.duration ? `${scenario.duration}s` : 'Per defecte (60s)'], ['Ràtio', scenario.rate ? `${scenario.rate} msg/s` : 'Per defecte (100 msg/s)']] as [string, string][]).map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
            <strong style={{ color: 'var(--text-primary)' }}>{v}</strong>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel·la</button>
        <button onClick={handleExecute} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--success)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><PlayIcon /> Executa a AKS</button>
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
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 16px' }}>El Job de càrrega s'ha creat a AKS correctament.</p>
      </div>
      <div style={{ background: 'rgba(63,185,80,0.08)', border: '1px solid var(--success)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
        <div style={{ color: 'var(--success)', marginBottom: 4, fontWeight: 700 }}>ID d'execució</div>
        <code style={{ fontSize: 12, color: 'var(--success)', wordBreak: 'break-all' as const, fontFamily: 'monospace' }}>{runId}</code>
      </div>
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--accent)', marginBottom: 20, opacity: 0.9 }}>
        Ves a la pàgina <strong>Execucions</strong> per monitoritzar el progrés i veure les mètriques en viu.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Tanca</button>
        <button onClick={() => { window.location.href = '/execucions'; }} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Veure Execucions →</button>
      </div>
    </div></div>
  );

  return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Desplegament fallit</h3>
      <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid var(--error)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--error)' }}>{error}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Tanca</button>
        <button onClick={() => setState('confirm')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--warning)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Torna a intentar</button>
      </div>
    </div></div>
  );
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const c = {
    success: { bg: 'rgba(63,185,80,0.12)',   border: 'var(--success)', color: 'var(--success)' },
    error:   { bg: 'rgba(248,81,73,0.12)',   border: 'var(--error)',   color: 'var(--error)' },
    info:    { bg: 'var(--accent-bg)',       border: 'var(--accent)',  color: 'var(--accent)' },
  }[type];
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', maxWidth: 360 }}>
      {message}
    </div>
  );
};

// ── Detall d'escenari (panell lateral) ───────────────────────────────────────
const ScenarioDetail = ({ scenario, onClose, onExecute, onEdit, onDelete }: {
  scenario: any; onClose: () => void; onExecute: () => void; onEdit: () => void; onDelete: () => void;
}) => {
  const status = STATUS_CONFIG[scenario.status || 'idle'] || STATUS_CONFIG.idle;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  );
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', padding: 22, flex: 1, minWidth: 300, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{scenario.name || 'Sense nom'}</h3>
            <span style={{ background: status.color + '22', color: status.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{status.label}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>ID: {scenario.id || '—'}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><CloseIcon /></button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Configuració</div>
        <Row label="Arquitectura" value={scenario.architecture} />
        <Row label="Protocol"     value={scenario.protocol} />
        <Row label="Plataforma"   value={scenario.platform || scenario.broker} />
        <Row label="Durada"       value={scenario.duration    ? `${scenario.duration}s`         : '—'} />
        <Row label="Ràtio"        value={scenario.rate        ? `${scenario.rate} msg/s`        : '—'} />
        <Row label="Payload"      value={scenario.payloadSize ? `${scenario.payloadSize} bytes` : '—'} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Metadades</div>
        <Row label="Creat"  value={scenario.createdAt ? new Date(scenario.createdAt).toLocaleString('ca-ES') : '—'} />
        <Row label="Tipus"  value={scenario.predefined ? 'Sistema' : 'Personalitzat'} />
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <button onClick={onExecute} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--success)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><PlayIcon /> Executar</button>
        <button onClick={onEdit}    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}><EditIcon /> Editar</button>
        <button onClick={onDelete}  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--error)', background: 'var(--bg-main)', color: 'var(--error)', fontSize: 13, cursor: 'pointer' }}><TrashIcon /> Eliminar</button>
      </div>
    </div>
  );
};

// ── Pàgina principal d'escenaris ──────────────────────────────────────────────
export const ScenariosPage = () => {
  const [scenarios,        setScenarios]        = useState<any[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [filterArch,       setFilterArch]       = useState('all');
  const [filterProto,      setFilterProto]      = useState('all');
  const [hoveredRow,       setHoveredRow]       = useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);
  const [showModal,        setShowModal]        = useState(false);
  const [editScenario,     setEditScenario]     = useState<any | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<any | null>(null);
  const [executeTarget,    setExecuteTarget]    = useState<any | null>(null);
  const [toast,            setToast]            = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fix títol de pàgina
  useEffect(() => { document.title = 'Escenaris | APIs Asíncrones'; }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setShowModal(true);
      const prefill = {
        name: params.get('name') || '', architecture: params.get('architecture') || '',
        protocol: params.get('protocol') || '', platform: params.get('platform') || '',
        duration: params.get('duration') || '', rate: params.get('rate') || '',
        payloadSize: params.get('payloadSize') || '',
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

  const openEdit = (s: any) => {
    setEditScenario({
      id: s.id, name: s.name || '', architecture: s.architecture || '',
      protocol: s.protocol || '', platform: s.platform || s.broker || '',
      duration: s.duration ? String(s.duration) : '',
      rate: s.rate ? String(s.rate) : '',
      payloadSize: s.payloadSize ? String(s.payloadSize) : '',
    });
    setShowModal(true);
  };

  const filtered = scenarios.filter(s => {
    if (filterArch  !== 'all' && s.architecture !== filterArch)  return false;
    if (filterProto !== 'all' && s.protocol     !== filterProto) return false;
    return true;
  });

  const formatTime = (iso: string) => !iso ? '—' : new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const modalInitial = editScenario && !editScenario._prefill ? editScenario : editScenario?._prefill ? { ...EMPTY_FORM, ...editScenario } : EMPTY_FORM;
  const modalMode    = editScenario?.id && !editScenario._prefill ? 'edit' : 'create';

  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--border)' };
  const td: React.CSSProperties = { padding: '12px 14px', fontSize: 14, borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' };

  // Estil select dels filtres
  const selStyle: React.CSSProperties = {
    padding: '6px 32px 6px 12px', borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13,
    cursor: 'pointer', outline: 'none', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
    minWidth: 140,
  };

  return (
    <div style={{ padding: 32, maxWidth: 1300, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif', background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {showModal    && <ScenarioModal mode={modalMode as 'create' | 'edit'} initial={modalInitial} onClose={() => { setShowModal(false); setEditScenario(null); }} onSaved={fetchData} />}
      {deleteTarget && <DeleteModal  name={deleteTarget.name || 'aquest escenari'} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {executeTarget && <ExecuteModal scenario={executeTarget} onClose={() => { setExecuteTarget(null); fetchData(); }} />}
      {toast        && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Capçalera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>Escenaris de Benchmark</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>Configuracions de càrrega per provar combinacions d'APIs asíncrones</p>
        </div>
        <button
          onClick={() => { setEditScenario(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(88,166,255,0.3)' }}
        >
          <PlusIcon /> Nou Escenari
        </button>
      </div>

      {/* Filtres desplegables */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Arquitectura:</span>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select value={filterArch} onChange={e => setFilterArch(e.target.value)} style={selStyle}>
              <option value="all">Totes</option>
              {ALL_ARCHITECTURES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Protocol:</span>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select value={filterProto} onChange={e => setFilterProto(e.target.value)} style={selStyle}>
              <option value="all">Tots</option>
              {ALL_PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {(filterArch !== 'all' || filterProto !== 'all') && (
          <button
            onClick={() => { setFilterArch('all'); setFilterProto('all'); }}
            style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <CloseIcon /> Netejar filtres
          </button>
        )}
      </div>

      {/* Taula + Detall */}
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden', flex: selectedScenario ? 2 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{filtered.length} escenari{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={fetchData} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Actualitzar</button>
          </div>
          {loading && <p style={{ color: 'var(--text-secondary)', padding: 48, textAlign: 'center', margin: 0 }}>Carregant escenaris...</p>}
          {error   && <p style={{ color: 'var(--error)', padding: 16, margin: 0 }}>Error: {error}</p>}
          {!loading && !error && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)' }}>
                  <th style={th}>Nom</th>
                  <th style={th}>Arquitectura</th>
                  <th style={th}>Protocol</th>
                  <th style={th}>Plataforma</th>
                  <th style={{ ...th, textAlign: 'center' }}>Estat</th>
                  <th style={{ ...th, textAlign: 'right' }}>Creat</th>
                  <th style={{ ...th, textAlign: 'center', width: 140 }}>Accions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>Cap escenari trobat. Crea'n un amb el botó de dalt.</td></tr>
                ) : filtered.map((s, i) => {
                  const st = STATUS_CONFIG[s.status || 'idle'] || STATUS_CONFIG.idle;
                  return (
                    <tr
                      key={s.id || i}
                      style={{ background: selectedScenario?.id === s.id ? 'var(--accent-bg)' : hoveredRow === i ? 'var(--bg-hover)' : 'transparent', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredRow(i)}
                      onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => setSelectedScenario(s)}
                    >
                      <td style={{ ...td, fontWeight: 600 }}>{s.name || '—'}</td>
                      <td style={td}>{s.architecture ? <span style={{ background: 'rgba(88,166,255,0.15)', color: 'var(--accent)', padding: '2px 9px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>{s.architecture}</span> : '—'}</td>
                      <td style={td}>{s.protocol     ? <span style={{ background: 'rgba(63,185,80,0.15)',  color: 'var(--success)', padding: '2px 9px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>{s.protocol}</span>     : '—'}</td>
                      <td style={{ ...td, color: 'var(--text-secondary)' }}>{s.platform || s.broker || '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}><span style={{ background: st.color + '22', color: st.color, padding: '2px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{st.label}</span></td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{formatTime(s.createdAt)}</td>
                      <td style={{ ...td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button title="Executar a AKS" onClick={() => setExecuteTarget(s)} style={{ background: 'rgba(63,185,80,0.12)', border: '1px solid var(--success)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--success)' }}><PlayIcon /></button>
                          <button title="Editar"         onClick={() => openEdit(s)}          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}><EditIcon /></button>
                          <button title="Eliminar"       onClick={() => setDeleteTarget(s)}   style={{ background: 'none', border: '1px solid var(--error)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--error)' }}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selectedScenario && (
          <ScenarioDetail
            scenario={selectedScenario}
            onClose={() => setSelectedScenario(null)}
            onExecute={() => setExecuteTarget(selectedScenario)}
            onEdit={() => openEdit(selectedScenario)}
            onDelete={() => setDeleteTarget(selectedScenario)}
          />
        )}
      </div>
    </div>
  );
};
