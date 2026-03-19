import { useEffect, useState } from 'react';
import { COLORS, CATEGORY_COLORS, S } from '../../theme';

const API_BASE     = '/api/proxy/scenario-service';
const CATALOG_BASE = '/api/proxy/catalog-service';

const ARCHITECTURES = ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'];
const PROTOCOLS     = ['WS', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'];
const PLATFORMS     = ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'];

const EMPTY_FORM = { name: '', architecture: '', protocol: '', platform: '', duration: '', rate: '', payloadSize: '' };

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  idle:      { color: COLORS.textDisabled, label: 'Preparat' },
  pending:   { color: COLORS.warning,      label: 'Pendent' },
  running:   { color: COLORS.accent,       label: 'En execucio' },
  completed: { color: COLORS.success,      label: 'Completat' },
  error:     { color: COLORS.error,        label: 'Error' },
};

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ── Scenario Modal (Create / Edit) ───────────────────────────────────────── */

const ScenarioModal = ({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initial: typeof EMPTY_FORM & { id?: string };
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.architecture || !form.protocol || !form.platform) {
      setError('Nom, arquitectura, protocol i plataforma son obligatoris.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        architecture: form.architecture,
        protocol: form.protocol,
        platform: form.platform,
        duration: form.duration ? Number(form.duration) : undefined,
        rate: form.rate ? Number(form.rate) : undefined,
        payloadSize: form.payloadSize ? Number(form.payloadSize) : undefined,
        predefined: false,
        status: 'idle',
      };
      const url = mode === 'edit' && form.id
        ? `${API_BASE}/scenarios/${form.id}`
        : `${API_BASE}/scenarios`;
      const method = mode === 'edit' && form.id ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, color: COLORS.textSecondary, marginBottom: 6,
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8,
  };
  const sel: React.CSSProperties = { ...S.input, appearance: 'none' as any, paddingRight: 32 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...S.card, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: COLORS.textPrimary }}>
            {mode === 'edit' ? 'Editar Escenari' : 'Nou Escenari'}
          </h2>
          <button onClick={onClose} style={{ ...S.btn, padding: '4px 8px', lineHeight: 1, display: 'flex' }}><CloseIcon /></button>
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <label style={lbl}>Nom <span style={{ color: COLORS.error }}>*</span></label>
            <input style={S.input} placeholder="Ex: MQTT-EDA-Kafka-Basic" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Arquitectura <span style={{ color: COLORS.error }}>*</span></label>
              <select style={sel} value={form.architecture} onChange={e => set('architecture', e.target.value)}>
                <option value="">Selecciona...</option>
                {ARCHITECTURES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Protocol <span style={{ color: COLORS.error }}>*</span></label>
              <select style={sel} value={form.protocol} onChange={e => set('protocol', e.target.value)}>
                <option value="">Selecciona...</option>
                {PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Plataforma / Broker <span style={{ color: COLORS.error }}>*</span></label>
            <select style={sel} value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">Selecciona...</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Duració (s)</label>
              <input style={S.input} type="number" min={1} placeholder="60" value={form.duration} onChange={e => set('duration', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Rate (msg/s)</label>
              <input style={S.input} type="number" min={1} placeholder="1000" value={form.rate} onChange={e => set('rate', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Payload (bytes)</label>
              <input style={S.input} type="number" min={1} placeholder="256" value={form.payloadSize} onChange={e => set('payloadSize', e.target.value)} />
            </div>
          </div>
          {error && (
            <div style={{ background: COLORS.error + '15', border: '1px solid ' + COLORS.error + '40', borderRadius: 6, padding: '10px 14px', color: COLORS.error, fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={S.btn} onClick={onClose} disabled={saving}>Cancel·la</button>
            <button
              style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Desant...' : mode === 'edit' ? 'Desar canvis' : 'Crear Escenari'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Delete Confirmation ──────────────────────────────────────────────────── */

const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ ...S.card, width: 420, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
      <h3 style={{ margin: '0 0 12px', color: COLORS.textPrimary, fontSize: 16 }}>Eliminar escenari</h3>
      <p style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 1.5, margin: '0 0 20px' }}>
        Estàs segur que vols eliminar <strong style={{ color: COLORS.textPrimary }}>{name}</strong>? Aquesta acció no es pot desfer.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button style={S.btn} onClick={onClose}>Cancel·la</button>
        <button style={{ ...S.btnPrimary, background: COLORS.error }} onClick={onConfirm}>Eliminar</button>
      </div>
    </div>
  </div>
);

/* ── Dev Toast ────────────────────────────────────────────────────────────── */

const DevToast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 2000,
      background: COLORS.warning + '22', border: `1px solid ${COLORS.warning}44`,
      color: COLORS.warning, padding: '12px 20px', borderRadius: 8, fontSize: 13,
      fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {message}
    </div>
  );
};

/* ── Detail Panel (Postman-like) ──────────────────────────────────────────── */

const ScenarioDetail = ({
  scenario, onClose, onExecute, onEdit, onDelete,
}: {
  scenario: any; onClose: () => void; onExecute: () => void; onEdit: () => void; onDelete: () => void;
}) => {
  const status = STATUS_CONFIG[scenario.status || 'idle'] || STATUS_CONFIG.idle;
  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>{label}</span>
      <span style={{ color: COLORS.textPrimary, fontSize: 13, fontFamily: 'monospace' }}>{value || '-'}</span>
    </div>
  );

  return (
    <div style={{ ...S.card, flex: 1, minWidth: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: COLORS.textPrimary }}>{scenario.name || 'Sense nom'}</h3>
            <span style={S.badge(status.color)}>{status.label}</span>
          </div>
          <span style={{ fontSize: 11, color: COLORS.textDisabled, fontFamily: 'monospace' }}>ID: {scenario.id || '-'}</span>
        </div>
        <button onClick={onClose} style={{ ...S.btn, padding: '4px 8px', display: 'flex' }}><CloseIcon /></button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Configuració</div>
        <InfoRow label="Arquitectura" value={scenario.architecture} />
        <InfoRow label="Protocol" value={scenario.protocol} />
        <InfoRow label="Plataforma" value={scenario.platform || scenario.broker} />
        <InfoRow label="Duració" value={scenario.duration ? `${scenario.duration}s` : '-'} />
        <InfoRow label="Rate" value={scenario.rate ? `${scenario.rate} msg/s` : '-'} />
        <InfoRow label="Payload" value={scenario.payloadSize ? `${scenario.payloadSize} bytes` : '-'} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Metadades</div>
        <InfoRow label="Creat" value={scenario.createdAt ? new Date(scenario.createdAt).toLocaleString('ca-ES') : '-'} />
        <InfoRow label="Actualitzat" value={scenario.updatedAt ? new Date(scenario.updatedAt).toLocaleString('ca-ES') : '-'} />
        <InfoRow label="Tipus" value={scenario.predefined ? 'Sistema' : 'Personalitzat'} />
        {scenario.executionTime && <InfoRow label="Temps d'execucio" value={`${scenario.executionTime}s`} />}
      </div>
      <div style={{ display: 'flex', gap: 10, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
        <button style={{ ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6, cursor: 'not-allowed' }} onClick={onExecute}>
          <PlayIcon /> Executar
        </button>
        <button style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6 }} onClick={onEdit}>
          <EditIcon /> Editar
        </button>
        <button style={{ ...S.btn, display: 'flex', alignItems: 'center', gap: 6, color: COLORS.error, borderColor: COLORS.error + '44' }} onClick={onDelete}>
          <TrashIcon /> Eliminar
        </button>
      </div>
    </div>
  );
};

/* ── Main Page ────────────────────────────────────────────────────────────── */

export const ScenariosPage = () => {
  const [scenarios, setScenarios]         = useState<any[]>([]);
  const [architectures, setArchitectures] = useState<string[]>([]);
  const [protocols, setProtocols]         = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [filterArch, setFilterArch]       = useState('all');
  const [filterProto, setFilterProto]     = useState('all');
  const [hoveredRow, setHoveredRow]       = useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [editScenario, setEditScenario]   = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<any | null>(null);
  const [toast, setToast]                 = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setEditScenario(null);
      setShowModal(true);
      const prefill = {
        name: params.get('name') || '',
        architecture: params.get('architecture') || '',
        protocol: params.get('protocol') || '',
        platform: params.get('platform') || '',
        duration: params.get('duration') || '',
        rate: params.get('rate') || '',
        payloadSize: params.get('payloadSize') || '',
      };
      if (prefill.name) {
        setEditScenario({ ...prefill, _prefill: true });
      }
      window.history.replaceState({}, '', '/escenaris');
    }
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(API_BASE + '/scenarios').then(r => r.json()),
      fetch(CATALOG_BASE + '/components').then(r => r.json()),
    ])
      .then(([sc, comp]) => {
        const scArr   = Array.isArray(sc)   ? sc   : [];
        const compArr = Array.isArray(comp) ? comp : [];
        setScenarios(scArr);
        setArchitectures([...new Set(compArr.filter((c: any) => c.category === 'architecture').map((c: any) => c.shortName))] as string[]);
        setProtocols([...new Set(compArr.filter((c: any) => c.category === 'protocol').map((c: any) => c.shortName))] as string[]);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`${API_BASE}/scenarios/${deleteTarget.id}`, { method: 'DELETE' });
      if (!r.ok && r.status !== 204) throw new Error('HTTP ' + r.status);
      if (selectedScenario?.id === deleteTarget.id) setSelectedScenario(null);
      setDeleteTarget(null);
      fetchData();
    } catch (e: any) {
      setToast('Error en eliminar: ' + e.message);
      setDeleteTarget(null);
    }
  };

  const handleExecute = () => {
    setToast("Funcionalitat en desenvolupament — properament es podran executar escenaris des d'aqui.");
  };

  const openEdit = (s: any) => {
    setEditScenario({
      id: s.id, name: s.name || '', architecture: s.architecture || '',
      protocol: s.protocol || '', platform: s.platform || s.broker || '',
      duration: s.duration ? String(s.duration) : '', rate: s.rate ? String(s.rate) : '',
      payloadSize: s.payloadSize ? String(s.payloadSize) : '',
    });
    setShowModal(true);
  };

  const filtered = scenarios.filter(s => {
    if (filterArch  !== 'all' && s.architecture !== filterArch)  return false;
    if (filterProto !== 'all' && s.protocol     !== filterProto) return false;
    return true;
  });

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const modalInitial = editScenario && !editScenario._prefill
    ? editScenario
    : editScenario?._prefill
      ? { ...EMPTY_FORM, ...editScenario }
      : EMPTY_FORM;
  const modalMode = editScenario && editScenario.id && !editScenario._prefill ? 'edit' : 'create';

  return (
    <div style={S.page}>
      {showModal && (
        <ScenarioModal
          mode={modalMode as 'create' | 'edit'}
          initial={modalInitial}
          onClose={() => { setShowModal(false); setEditScenario(null); }}
          onSaved={fetchData}
        />
      )}
      {deleteTarget && (
        <DeleteModal name={deleteTarget.name || 'aquest escenari'} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />
      )}
      {toast && <DevToast message={toast} onClose={() => setToast('')} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: COLORS.textPrimary }}>Escenaris de Benchmark</h1>
          <p style={{ margin: '6px 0 0', color: COLORS.textSecondary, fontSize: 15 }}>
            Configuracions de càrrega per provar combinacions d&apos;APIs asíncrones
          </p>
        </div>
        <button style={{ ...S.btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { setEditScenario(null); setShowModal(true); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nou Escenari
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>Arquitectura:</span>
          {['all', ...ARCHITECTURES].map(a => (
            <button key={a} style={S.chip(filterArch === a)} onClick={() => setFilterArch(a)}>
              {a === 'all' ? 'Totes' : a}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: COLORS.border, margin: '0 4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>Protocol:</span>
          {['all', ...PROTOCOLS].map(p => (
            <button key={p} style={S.chip(filterProto === p)} onClick={() => setFilterProto(p)}>
              {p === 'all' ? 'Tots' : p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ ...S.card, padding: 0, overflow: 'hidden', flex: selectedScenario ? 2 : 1 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + COLORS.border, color: COLORS.textSecondary, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span>{filtered.length} escenari{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={fetchData} style={{ background: 'none', border: 'none', color: COLORS.accent, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Actualitzar</button>
          </div>
          {loading && <p style={{ color: COLORS.textSecondary, padding: 40, textAlign: 'center' }}>Carregant escenaris...</p>}
          {error && <p style={{ color: COLORS.error, padding: 16 }}>Error: {error}</p>}
          {!loading && !error && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={S.tableHeader}>
                  <th style={S.th}>Nom</th>
                  <th style={S.th}>Arquitectura</th>
                  <th style={S.th}>Protocol</th>
                  <th style={S.th}>Plataforma</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Estat</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Creat</th>
                  <th style={{ ...S.th, textAlign: 'center', width: 140 }}>Accions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: COLORS.textSecondary }}>Cap escenari trobat. Crea un amb el boto Nou Escenari.</td></tr>
                ) : filtered.map((s, i) => {
                  const st = STATUS_CONFIG[s.status || 'idle'] || STATUS_CONFIG.idle;
                  const isSelected = selectedScenario?.id === s.id;
                  return (
                    <tr key={s.id || i}
                      style={{ ...S.tableRow, background: isSelected ? COLORS.accent + '12' : hoveredRow === i ? COLORS.bgHover : 'transparent', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => setSelectedScenario(s)}
                    >
                      <td style={{ ...S.td, fontWeight: 600 }}>{s.name || '-'}</td>
                      <td style={S.td}>{s.architecture ? <span style={S.badge(CATEGORY_COLORS.architecture)}>{s.architecture}</span> : <span style={{ color: COLORS.textDisabled }}>-</span>}</td>
                      <td style={S.td}>{s.protocol ? <span style={S.badge(CATEGORY_COLORS.protocol)}>{s.protocol}</span> : <span style={{ color: COLORS.textDisabled }}>-</span>}</td>
                      <td style={{ ...S.td, color: COLORS.textSecondary }}>{s.platform || s.broker || '-'}</td>
                      <td style={{ ...S.td, textAlign: 'center' }}><span style={S.badge(st.color)}>{st.label}</span></td>
                      <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: COLORS.textDisabled, fontFamily: 'monospace' }}>{formatTime(s.createdAt)}</td>
                      <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button title="Executar (en desenvolupament)" style={{ ...S.btn, padding: '4px 8px', display: 'flex', alignItems: 'center', opacity: 0.5, cursor: 'not-allowed' }} onClick={handleExecute}><PlayIcon /></button>
                          <button title="Editar" style={{ ...S.btn, padding: '4px 8px', display: 'flex', alignItems: 'center' }} onClick={() => openEdit(s)}><EditIcon /></button>
                          <button title="Eliminar" style={{ ...S.btn, padding: '4px 8px', display: 'flex', alignItems: 'center', color: COLORS.error }} onClick={() => setDeleteTarget(s)}><TrashIcon /></button>
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
          <ScenarioDetail scenario={selectedScenario} onClose={() => setSelectedScenario(null)} onExecute={handleExecute} onEdit={() => openEdit(selectedScenario)} onDelete={() => setDeleteTarget(selectedScenario)} />
        )}
      </div>
    </div>
  );
};
