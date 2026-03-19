import { useEffect, useState } from 'react';

const API_BASE     = '/api/proxy/scenario-service';
const CATALOG_BASE = '/api/proxy/catalog-service';

const ARCHITECTURES = ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'];
const PROTOCOLS     = ['WS', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'];
const PLATFORMS     = ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'];

const EMPTY_FORM = { name: '', architecture: '', protocol: '', platform: '', duration: '', rate: '', payloadSize: '' };

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  idle:      { color: '#999', label: 'Preparat' },
  pending:   { color: '#f59e0b', label: 'Pendent' },
  running:   { color: '#4a9eed', label: 'En execució' },
  completed: { color: '#22c55e', label: 'Completat' },
  error:     { color: '#ef4444', label: 'Error' },
};

const PlayIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>);
const EditIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>);
const TrashIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const CloseIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);

/* Modal Crear/Editar */
const ScenarioModal = ({ mode, initial, onClose, onSaved }: { mode: 'create' | 'edit'; initial: typeof EMPTY_FORM & { id?: string }; onClose: () => void; onSaved: () => void; }) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.architecture || !form.protocol || !form.platform) {
      setError('Nom, arquitectura, protocol i plataforma són obligatoris.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = { name: form.name.trim(), architecture: form.architecture, protocol: form.protocol, platform: form.platform, duration: form.duration ? Number(form.duration) : undefined, rate: form.rate ? Number(form.rate) : undefined, payloadSize: form.payloadSize ? Number(form.payloadSize) : undefined, predefined: false, status: 'idle' };
      const url = mode === 'edit' && form.id ? `${API_BASE}/scenarios/${form.id}` : `${API_BASE}/scenarios`;
      const method = mode === 'edit' && form.id ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600 };
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{mode === 'edit' ? 'Editar Escenari' : 'Nou Escenari'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><CloseIcon /></button>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div><label style={lbl}>Nom *</label><input style={inp} placeholder="Ex: MQTT-EDA-Kafka-Basic" value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Arquitectura *</label><select style={inp} value={form.architecture} onChange={e => set('architecture', e.target.value)}><option value="">Selecciona...</option>{ARCHITECTURES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            <div><label style={lbl}>Protocol *</label><select style={inp} value={form.protocol} onChange={e => set('protocol', e.target.value)}><option value="">Selecciona...</option>{PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div><label style={lbl}>Plataforma / Broker *</label><select style={inp} value={form.platform} onChange={e => set('platform', e.target.value)}><option value="">Selecciona...</option>{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Duració (s)</label><input style={inp} type="number" min={1} placeholder="60" value={form.duration} onChange={e => set('duration', e.target.value)} /></div>
            <div><label style={lbl}>Rate (msg/s)</label><input style={inp} type="number" min={1} placeholder="1000" value={form.rate} onChange={e => set('rate', e.target.value)} /></div>
            <div><label style={lbl}>Payload (bytes)</label><input style={inp} type="number" min={1} placeholder="256" value={form.payloadSize} onChange={e => set('payloadSize', e.target.value)} /></div>
          </div>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', color: '#ef4444', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 13 }}>Cancel·la</button>
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#4a9eed', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? 'Desant...' : mode === 'edit' ? 'Desar canvis' : 'Crear Escenari'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Modal Eliminar */
const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: 'white', borderRadius: 8, padding: 24, width: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
      <h3 style={{ margin: '0 0 12px' }}>Eliminar escenari</h3>
      <p style={{ color: '#666', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px' }}>Estàs segur que vols eliminar <strong>{name}</strong>? Aquesta acció no es pot desfer.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancel·la</button>
        <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>
      </div>
    </div>
  </div>
);

/* Toast */
const DevToast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: '#fef7e0', border: '1px solid #f59e0b', color: '#92400e', padding: '12px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
      {message}
    </div>
  );
};

/* Panell Detall */
const ScenarioDetail = ({ scenario, onClose, onExecute, onEdit, onDelete }: { scenario: any; onClose: () => void; onExecute: () => void; onEdit: () => void; onDelete: () => void; }) => {
  const status = STATUS_CONFIG[scenario.status || 'idle'] || STATUS_CONFIG.idle;
  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
      <span style={{ color: '#666', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: 'monospace' }}>{value || '-'}</span>
    </div>
  );
  return (
    <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', padding: 20, flex: 1, minWidth: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{scenario.name || 'Sense nom'}</h3>
            <span style={{ background: status.color + '20', color: status.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{status.label}</span>
          </div>
          <span style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>ID: {scenario.id || '-'}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><CloseIcon /></button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Configuració</div>
        <InfoRow label="Arquitectura" value={scenario.architecture} />
        <InfoRow label="Protocol" value={scenario.protocol} />
        <InfoRow label="Plataforma" value={scenario.platform || scenario.broker} />
        <InfoRow label="Duració" value={scenario.duration ? `${scenario.duration}s` : '-'} />
        <InfoRow label="Rate" value={scenario.rate ? `${scenario.rate} msg/s` : '-'} />
        <InfoRow label="Payload" value={scenario.payloadSize ? `${scenario.payloadSize} bytes` : '-'} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Metadades</div>
        <InfoRow label="Creat" value={scenario.createdAt ? new Date(scenario.createdAt).toLocaleString('ca-ES') : '-'} />
        <InfoRow label="Tipus" value={scenario.predefined ? 'Sistema' : 'Personalitzat'} />
        {scenario.executionTime && <InfoRow label="Temps d'execució" value={`${scenario.executionTime}s`} />}
      </div>
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #eee', paddingTop: 16 }}>
        <button onClick={onExecute} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: '#4a9eed', color: 'white', fontSize: 13, fontWeight: 600, opacity: 0.5, cursor: 'not-allowed' }}><PlayIcon /> Executar</button>
        <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid #ddd', background: 'white', fontSize: 13, cursor: 'pointer' }}><EditIcon /> Editar</button>
        <button onClick={onDelete} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid #fecaca', background: 'white', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}><TrashIcon /> Eliminar</button>
      </div>
    </div>
  );
};

/* Pàgina Principal */
export const ScenariosPage = () => {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterArch, setFilterArch] = useState('all');
  const [filterProto, setFilterProto] = useState('all');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editScenario, setEditScenario] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setShowModal(true);
      const prefill = { name: params.get('name') || '', architecture: params.get('architecture') || '', protocol: params.get('protocol') || '', platform: params.get('platform') || '', duration: params.get('duration') || '', rate: params.get('rate') || '', payloadSize: params.get('payloadSize') || '' };
      if (prefill.name) setEditScenario({ ...prefill, _prefill: true });
      window.history.replaceState({}, '', '/escenaris');
    }
  }, []);

  const fetchData = () => {
    setLoading(true);
    fetch(API_BASE + '/scenarios').then(r => r.json())
      .then(sc => { setScenarios(Array.isArray(sc) ? sc : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  useEffect(() => { fetchData(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`${API_BASE}/scenarios/${deleteTarget.id}`, { method: 'DELETE' });
      if (selectedScenario?.id === deleteTarget.id) setSelectedScenario(null);
      setDeleteTarget(null); fetchData();
    } catch (e: any) { setToast('Error en eliminar: ' + e.message); setDeleteTarget(null); }
  };

  const handleExecute = () => { setToast('Funcionalitat en desenvolupament. Properament es podran executar escenaris des d\'aquí.'); };

  const openEdit = (s: any) => {
    setEditScenario({ id: s.id, name: s.name || '', architecture: s.architecture || '', protocol: s.protocol || '', platform: s.platform || s.broker || '', duration: s.duration ? String(s.duration) : '', rate: s.rate ? String(s.rate) : '', payloadSize: s.payloadSize ? String(s.payloadSize) : '' });
    setShowModal(true);
  };

  const filtered = scenarios.filter(s => {
    if (filterArch !== 'all' && s.architecture !== filterArch) return false;
    if (filterProto !== 'all' && s.protocol !== filterProto) return false;
    return true;
  });

  const formatTime = (iso: string) => { if (!iso) return '-'; return new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); };

  const modalInitial = editScenario && !editScenario._prefill ? editScenario : editScenario?._prefill ? { ...EMPTY_FORM, ...editScenario } : EMPTY_FORM;
  const modalMode = editScenario && editScenario.id && !editScenario._prefill ? 'edit' : 'create';

  const chipStyle = (active: boolean): React.CSSProperties => ({ padding: '4px 12px', borderRadius: 16, border: active ? '2px solid #4a9eed' : '1px solid #ddd', background: active ? '#e8f4fd' : 'white', color: active ? '#1a73e8' : '#666', fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer' });
  const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#999', fontWeight: 600, textTransform: 'uppercase', borderBottom: '2px solid #eee' };
  const tdStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 14, borderBottom: '1px solid #f0f0f0' };

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {showModal && <ScenarioModal mode={modalMode as 'create' | 'edit'} initial={modalInitial} onClose={() => { setShowModal(false); setEditScenario(null); }} onSaved={fetchData} />}
      {deleteTarget && <DeleteModal name={deleteTarget.name || 'aquest escenari'} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {toast && <DevToast message={toast} onClose={() => setToast('')} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Escenaris de Benchmark</h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 15 }}>Configuracions de càrrega per provar combinacions d'APIs asíncrones</p>
        </div>
        <button onClick={() => { setEditScenario(null); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4a9eed', color: 'white', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nou Escenari
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ color: '#666', fontSize: 13 }}>Arquitectura:</span>
        {['all', ...ARCHITECTURES].map(a => <button key={a} style={chipStyle(filterArch === a)} onClick={() => setFilterArch(a)}>{a === 'all' ? 'Totes' : a}</button>)}
        <div style={{ width: 1, height: 20, background: '#ddd', margin: '0 4px' }} />
        <span style={{ color: '#666', fontSize: 13 }}>Protocol:</span>
        {['all', ...PROTOCOLS].map(p => <button key={p} style={chipStyle(filterProto === p)} onClick={() => setFilterProto(p)}>{p === 'all' ? 'Tots' : p}</button>)}
      </div>

      {/* Taula + Detall */}
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ background: 'white', borderRadius: 8, border: '1px solid #e0e0e0', overflow: 'hidden', flex: selectedScenario ? 2 : 1 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #eee', color: '#999', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span>{filtered.length} escenari{filtered.length !== 1 ? 's' : ''}</span>
            <button onClick={fetchData} style={{ background: 'none', border: 'none', color: '#4a9eed', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Actualitzar</button>
          </div>
          {loading && <p style={{ color: '#999', padding: 40, textAlign: 'center' }}>Carregant escenaris...</p>}
          {error && <p style={{ color: '#ef4444', padding: 16 }}>Error: {error}</p>}
          {!loading && !error && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Nom</th><th style={thStyle}>Arquitectura</th><th style={thStyle}>Protocol</th><th style={thStyle}>Plataforma</th><th style={{ ...thStyle, textAlign: 'center' }}>Estat</th><th style={{ ...thStyle, textAlign: 'right' }}>Creat</th><th style={{ ...thStyle, textAlign: 'center', width: 130 }}>Accions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#999' }}>Cap escenari trobat. Crea un amb el botó Nou Escenari.</td></tr>
                ) : filtered.map((s, i) => {
                  const st = STATUS_CONFIG[s.status || 'idle'] || STATUS_CONFIG.idle;
                  return (
                    <tr key={s.id || i} style={{ background: selectedScenario?.id === s.id ? '#e8f4fd' : hoveredRow === i ? '#f8f9fa' : 'white', cursor: 'pointer' }} onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)} onClick={() => setSelectedScenario(s)}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{s.name || '-'}</td>
                      <td style={tdStyle}>{s.architecture ? <span style={{ background: '#e8f4fd', color: '#1a73e8', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{s.architecture}</span> : '-'}</td>
                      <td style={tdStyle}>{s.protocol ? <span style={{ background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{s.protocol}</span> : '-'}</td>
                      <td style={{ ...tdStyle, color: '#666' }}>{s.platform || s.broker || '-'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ background: st.color + '20', color: st.color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{st.label}</span></td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontSize: 12, color: '#999', fontFamily: 'monospace' }}>{formatTime(s.createdAt)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button title="Executar (en desenvolupament)" onClick={handleExecute} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '4px 6px', cursor: 'not-allowed', opacity: 0.5, display: 'flex' }}><PlayIcon /></button>
                          <button title="Editar" onClick={() => openEdit(s)} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex' }}><EditIcon /></button>
                          <button title="Eliminar" onClick={() => setDeleteTarget(s)} style={{ background: 'none', border: '1px solid #fecaca', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex', color: '#ef4444' }}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selectedScenario && <ScenarioDetail scenario={selectedScenario} onClose={() => setSelectedScenario(null)} onExecute={handleExecute} onEdit={() => openEdit(selectedScenario)} onDelete={() => setDeleteTarget(selectedScenario)} />}
      </div>
    </div>
  );
};
