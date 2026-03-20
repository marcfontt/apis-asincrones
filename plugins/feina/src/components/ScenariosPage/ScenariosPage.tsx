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
  idle:      { color: '#94a3b8', label: 'Ready' },
  pending:   { color: '#f59e0b', label: 'Pending' },
  running:   { color: '#3b82f6', label: 'Running' },
  completed: { color: '#22c55e', label: 'Completed' },
  error:     { color: '#ef4444', label: 'Error' },
};

const PlayIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const EditIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const CloseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const ScenarioModal = ({ mode, initial, onClose, onSaved }: { mode: 'create'|'edit'; initial: typeof EMPTY_FORM & { id?: string }; onClose: () => void; onSaved: () => void }) => {
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
    if (!form.name.trim() || !form.architecture || !form.protocol || !form.platform) { setError('Name, architecture, protocol and platform are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), architecture: form.architecture, protocol: form.protocol, platform: form.platform, duration: form.duration ? Number(form.duration) : undefined, rate: form.rate ? Number(form.rate) : undefined, payloadSize: form.payloadSize ? Number(form.payloadSize) : undefined, predefined: false, status: 'idle' };
      const url = mode === 'edit' && form.id ? `${API_BASE}/scenarios/${form.id}` : `${API_BASE}/scenarios`;
      const r = await fetch(url, { method: mode === 'edit' && form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{mode === 'edit' ? 'Edit Scenario' : 'New Scenario'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><CloseIcon /></button>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div><label style={lbl}>Name *</label><input style={inp} placeholder="e.g. MQTT-EDA-Kafka-Basic" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div>
            <label style={lbl}>Platform / Broker * <span style={{ fontWeight: 400, textTransform: 'none' }}>(select first)</span></label>
            <select style={inp} value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">Select...</option>
              {ALL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Architecture * {form.platform && <span style={{ color: '#3b82f6', fontWeight: 400 }}>({ca.length} compatible)</span>}</label>
              <select style={inp} value={form.architecture} onChange={e => set('architecture', e.target.value)}>
                <option value="">Select...</option>
                {ALL_ARCHITECTURES.map(a => { const ok = ca.includes(a); return <option key={a} value={a} disabled={!ok} style={!ok ? { color: '#cbd5e1' } : {}}>{a}{!ok && form.platform ? ' (incompatible)' : ''}</option>; })}
              </select>
            </div>
            <div>
              <label style={lbl}>Protocol * {form.platform && <span style={{ color: '#3b82f6', fontWeight: 400 }}>({cp.length} compatible)</span>}</label>
              <select style={inp} value={form.protocol} onChange={e => set('protocol', e.target.value)}>
                <option value="">Select...</option>
                {ALL_PROTOCOLS.map(p => { const ok = cp.includes(p); return <option key={p} value={p} disabled={!ok} style={!ok ? { color: '#cbd5e1' } : {}}>{p}{!ok && form.platform ? ' (incompatible)' : ''}</option>; })}
              </select>
            </div>
          </div>
          {form.platform && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1d4ed8' }}>
              <strong>{form.platform}</strong> · Architectures: {ca.join(', ')} · Protocols: {cp.join(', ')}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Duration (s)</label><input style={inp} type="number" min={1} placeholder="60" value={form.duration} onChange={e => set('duration', e.target.value)} /></div>
            <div><label style={lbl}>Rate (msg/s)</label><input style={inp} type="number" min={1} placeholder="1000" value={form.rate} onChange={e => set('rate', e.target.value)} /></div>
            <div><label style={lbl}>Payload (bytes)</label><input style={inp} type="number" min={1} placeholder="256" value={form.payloadSize} onChange={e => set('payloadSize', e.target.value)} /></div>
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Scenario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
    <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Delete Scenario</h3>
      <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Delete</button>
      </div>
    </div>
  </div>
);

const ExecuteModal = ({ scenario, onClose }: { scenario: any; onClose: () => void }) => {
  const [state, setState] = useState<'confirm'|'running'|'done'|'error'>('confirm');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState('');

  const handleExecute = async () => {
    setState('running');
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenarioId: scenario.id }) });
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `HTTP ${r.status}`); }
      const data = await r.json();
      setRunId(data.id);
      setState('done');
    } catch (e: any) { setError(e.message); setState('error'); }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' };
  const card: React.CSSProperties = { background: 'white', borderRadius: 12, padding: 28, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' };

  if (state === 'confirm') return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Execute Scenario</h3>
      <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>This will deploy a load-generator Job to AKS for scenario <strong>{scenario.name}</strong>.</p>
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, display: 'grid', gap: 6 }}>
        {[['Architecture', scenario.architecture], ['Protocol', scenario.protocol], ['Platform', scenario.platform || scenario.broker], ['Duration', scenario.duration ? `${scenario.duration}s` : 'Default (60s)'], ['Rate', scenario.rate ? `${scenario.rate} msg/s` : 'Default (100 msg/s)']].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>{l}</span><strong>{v}</strong></div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        <button onClick={handleExecute} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><PlayIcon /> Run on AKS</button>
      </div>
    </div></div>
  );

  if (state === 'running') return (
    <div style={overlay}><div style={{ ...card, textAlign: 'center' as const, padding: 48 }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>⚙️</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Deploying to AKS...</h3>
      <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Creating namespace and load-generator Job</p>
    </div></div>
  );

  if (state === 'done') return (
    <div style={overlay}><div style={card}>
      <div style={{ textAlign: 'center' as const, marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Scenario deployed!</h3>
        <p style={{ color: '#475569', fontSize: 14, margin: '0 0 16px' }}>The load-generator Job has been created in AKS.</p>
      </div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
        <div style={{ color: '#166534', marginBottom: 4, fontWeight: 700 }}>Run ID</div>
        <code style={{ fontSize: 12, color: '#166534', wordBreak: 'break-all' as const }}>{runId}</code>
      </div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1d4ed8', marginBottom: 20 }}>
        Go to the <strong>Runs</strong> page to monitor progress and see live metrics.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Close</button>
        <button onClick={() => { window.location.href = '/runs'; }} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>View Runs →</button>
      </div>
    </div></div>
  );

  return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>Deployment failed</h3>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#dc2626' }}>{error}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: 13 }}>Close</button>
        <button onClick={() => setState('confirm')} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Try Again</button>
      </div>
    </div></div>
  );
};

const Toast = ({ message, type, onClose }: { message: string; type: 'success'|'error'|'info'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const c = { success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' }, error: { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' }, info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' } }[type];
  return <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: 360 }}>{message}</div>;
};

const ScenarioDetail = ({ scenario, onClose, onExecute, onEdit, onDelete }: { scenario: any; onClose: () => void; onExecute: () => void; onEdit: () => void; onDelete: () => void }) => {
  const status = STATUS_CONFIG[scenario.status || 'idle'] || STATUS_CONFIG.idle;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ color: '#64748b', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#1e293b' }}>{value || '—'}</span>
    </div>
  );
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 22, flex: 1, minWidth: 300, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{scenario.name || 'Unnamed'}</h3>
            <span style={{ background: status.color + '20', color: status.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{status.label}</span>
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>ID: {scenario.id || '—'}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><CloseIcon /></button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Configuration</div>
        <Row label="Architecture" value={scenario.architecture} />
        <Row label="Protocol"     value={scenario.protocol} />
        <Row label="Platform"     value={scenario.platform || scenario.broker} />
        <Row label="Duration"     value={scenario.duration    ? `${scenario.duration}s`         : '—'} />
        <Row label="Rate"         value={scenario.rate        ? `${scenario.rate} msg/s`        : '—'} />
        <Row label="Payload"      value={scenario.payloadSize ? `${scenario.payloadSize} bytes` : '—'} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Metadata</div>
        <Row label="Created" value={scenario.createdAt ? new Date(scenario.createdAt).toLocaleString('en-GB') : '—'} />
        <Row label="Type"    value={scenario.predefined ? 'System' : 'Custom'} />
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
        <button onClick={onExecute} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#22c55e', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><PlayIcon /> Execute</button>
        <button onClick={onEdit}    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', fontSize: 13, cursor: 'pointer', color: '#475569' }}><EditIcon /> Edit</button>
        <button onClick={onDelete}  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #fecaca', background: 'white', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}><TrashIcon /> Delete</button>
      </div>
    </div>
  );
};

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
  const [toast,            setToast]            = useState<{ message: string; type: 'success'|'error'|'info' } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setShowModal(true);
      const prefill = { name: params.get('name') || '', architecture: params.get('architecture') || '', protocol: params.get('protocol') || '', platform: params.get('platform') || '', duration: params.get('duration') || '', rate: params.get('rate') || '', payloadSize: params.get('payloadSize') || '' };
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
      setToast({ message: 'Scenario deleted.', type: 'info' });
    } catch (e: any) { setToast({ message: 'Error: ' + e.message, type: 'error' }); setDeleteTarget(null); }
  };

  const openEdit = (s: any) => {
    setEditScenario({ id: s.id, name: s.name || '', architecture: s.architecture || '', protocol: s.protocol || '', platform: s.platform || s.broker || '', duration: s.duration ? String(s.duration) : '', rate: s.rate ? String(s.rate) : '', payloadSize: s.payloadSize ? String(s.payloadSize) : '' });
    setShowModal(true);
  };

  const filtered = scenarios.filter(s => {
    if (filterArch  !== 'all' && s.architecture !== filterArch)  return false;
    if (filterProto !== 'all' && s.protocol     !== filterProto) return false;
    return true;
  });

  const formatTime = (iso: string) => !iso ? '—' : new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const modalInitial = editScenario && !editScenario._prefill ? editScenario : editScenario?._prefill ? { ...EMPTY_FORM, ...editScenario } : EMPTY_FORM;
  const modalMode    = editScenario?.id && !editScenario._prefill ? 'edit' : 'create';

  const chip = (active: boolean): React.CSSProperties => ({ padding: '4px 14px', borderRadius: 20, border: active ? '2px solid #3b82f6' : '1px solid #e2e8f0', background: active ? '#eff6ff' : 'white', color: active ? '#1d4ed8' : '#64748b', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer' });
  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #f1f5f9' };
  const td: React.CSSProperties = { padding: '12px 14px', fontSize: 14, borderBottom: '1px solid #f8fafc' };

  return (
    <div style={{ padding: 32, maxWidth: 1300, margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {showModal    && <ScenarioModal mode={modalMode as 'create'|'edit'} initial={modalInitial} onClose={() => { setShowModal(false); setEditScenario(null); }} onSaved={fetchData} />}
      {deleteTarget && <DeleteModal  name={deleteTarget.name || 'this scenario'} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {executeTarget && <ExecuteModal scenario={executeTarget} onClose={() => { setExecuteTarget(null); fetchData(); }} />}
      {toast        && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Benchmark Scenarios</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 15 }}>Load configurations to test async API architecture combinations</p>
        </div>
        <button onClick={() => { setEditScenario(null); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(59,130,246,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Scenario
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Architecture:</span>
        {['all', ...ALL_ARCHITECTURES].map(a => <button key={a} style={chip(filterArch === a)} onClick={() => setFilterArch(a)}>{a === 'all' ? 'All' : a}</button>)}
        <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
        <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Protocol:</span>
        {['all', ...ALL_PROTOCOLS].map(p => <button key={p} style={chip(filterProto === p)} onClick={() => setFilterProto(p)}>{p === 'all' ? 'All' : p}</button>)}
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', flex: selectedScenario ? 2 : 1, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{filtered.length} scenario{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Refresh</button>
          </div>
          {loading && <p style={{ color: '#94a3b8', padding: 48, textAlign: 'center', margin: 0 }}>Loading scenarios...</p>}
          {error   && <p style={{ color: '#ef4444', padding: 16, margin: 0 }}>Error: {error}</p>}
          {!loading && !error && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Name</th><th style={th}>Architecture</th><th style={th}>Protocol</th><th style={th}>Platform</th>
                <th style={{ ...th, textAlign: 'center' }}>Status</th><th style={{ ...th, textAlign: 'right' }}>Created</th>
                <th style={{ ...th, textAlign: 'center', width: 140 }}>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>No scenarios found. Create one with the button above.</td></tr>
                ) : filtered.map((s, i) => {
                  const st = STATUS_CONFIG[s.status || 'idle'] || STATUS_CONFIG.idle;
                  return (
                    <tr key={s.id || i} style={{ background: selectedScenario?.id === s.id ? '#eff6ff' : hoveredRow === i ? '#f8fafc' : 'white', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)} onClick={() => setSelectedScenario(s)}>
                      <td style={{ ...td, fontWeight: 600, color: '#1e293b' }}>{s.name || '—'}</td>
                      <td style={td}>{s.architecture ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 9px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>{s.architecture}</span> : '—'}</td>
                      <td style={td}>{s.protocol     ? <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 9px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>{s.protocol}</span>     : '—'}</td>
                      <td style={{ ...td, color: '#475569' }}>{s.platform || s.broker || '—'}</td>
                      <td style={{ ...td, textAlign: 'center' }}><span style={{ background: st.color + '20', color: st.color, padding: '2px 9px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{st.label}</span></td>
                      <td style={{ ...td, textAlign: 'right', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{formatTime(s.createdAt)}</td>
                      <td style={{ ...td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button title="Execute on AKS" onClick={() => setExecuteTarget(s)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: '#16a34a' }}><PlayIcon /></button>
                          <button title="Edit"           onClick={() => openEdit(s)}          style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: '#475569' }}><EditIcon /></button>
                          <button title="Delete"         onClick={() => setDeleteTarget(s)}   style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: '#ef4444' }}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selectedScenario && <ScenarioDetail scenario={selectedScenario} onClose={() => setSelectedScenario(null)} onExecute={() => setExecuteTarget(selectedScenario)} onEdit={() => openEdit(selectedScenario)} onDelete={() => setDeleteTarget(selectedScenario)} />}
      </div>
    </div>
  );
};
