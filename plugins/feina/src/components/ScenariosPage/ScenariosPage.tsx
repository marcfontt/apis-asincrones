import { useEffect, useState } from 'react';
import { COLORS, CATEGORY_COLORS, S } from '../../theme';

const API_BASE = '/api/proxy/scenario-service';

const COMPATIBILITY: Record<string, { architectures: string[]; protocols: string[] }> = {
  'Kafka':       { architectures: ['EDA', 'EMA'],        protocols: ['Kafka', 'AMQP'] },
  'Confluent':   { architectures: ['EDA', 'EMA'],        protocols: ['Kafka', 'AMQP'] },
  'RabbitMQ':    { architectures: ['QBA', 'EDA'],        protocols: ['AMQP', 'MQTT'] },
  'Pulsar':      { architectures: ['EDA', 'EMA', 'SEA'], protocols: ['Kafka', 'MQTT', 'AMQP'] },
  'NATS Server': { architectures: ['EDA', 'SEA', 'LCA'], protocols: ['NATS', 'WS'] },
};

const ALL_ARCHITECTURES = ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'];
const ALL_PROTOCOLS     = ['WS', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'];
const ALL_PLATFORMS     = ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'];
const EMPTY_FORM        = { name: '', platform: '', architecture: '', protocol: '', duration: '', rate: '', payloadSize: '' };

const CompatBadge = ({ label, available }: { label: string; available: boolean }) => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11,
    fontWeight: 600, marginRight: 4, marginBottom: 4,
    background: available ? COLORS.success + '22' : COLORS.textDisabled + '22',
    color: available ? COLORS.success : COLORS.textDisabled,
    border: `1px solid ${available ? COLORS.success + '44' : COLORS.textDisabled + '33'}`,
  }}>{label}</span>
);

const CreateScenarioModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string, v: string) => {
    if (k === 'platform') {
      const compat = COMPATIBILITY[v];
      setForm(f => ({
        ...f, platform: v,
        architecture: compat && !compat.architectures.includes(f.architecture) ? '' : f.architecture,
        protocol:     compat && !compat.protocols.includes(f.protocol)         ? '' : f.protocol,
      }));
      return;
    }
    setForm(f => ({ ...f, [k]: v }));
  };

  const availableArchitectures = form.platform ? COMPATIBILITY[form.platform]?.architectures ?? ALL_ARCHITECTURES : ALL_ARCHITECTURES;
  const availableProtocols     = form.platform ? COMPATIBILITY[form.platform]?.protocols     ?? ALL_PROTOCOLS     : ALL_PROTOCOLS;

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.platform || !form.architecture || !form.protocol) {
      setError('Nom, plataforma, arquitectura i protocol son obligatoris.'); return;
    }
    setSaving(true); setError('');
    try {
      const r = await fetch(`${API_BASE}/scenarios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), platform: form.platform,
          architecture: form.architecture, protocol: form.protocol,
          duration:    form.duration    ? Number(form.duration)    : undefined,
          rate:        form.rate        ? Number(form.rate)        : undefined,
          payloadSize: form.payloadSize ? Number(form.payloadSize) : undefined,
          predefined: false,
        }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onCreated(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };
  const sel: React.CSSProperties = { ...S.input, appearance: 'none' as any, paddingRight: 32 };
  const selDisabled: React.CSSProperties = { ...sel, opacity: 0.4, cursor: 'not-allowed' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...S.card, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: COLORS.textPrimary }}>Nou Escenari</h2>
          <button onClick={onClose} style={{ ...S.btn, padding: '4px 10px', fontSize: 18, lineHeight: 1 }}>x</button>
        </div>
        <div style={{ display: 'grid', gap: 18 }}>
          <div>
            <label style={lbl}>Nom <span style={{ color: COLORS.error }}>*</span></label>
            <input style={S.input} placeholder="Ex: Kafka-EDA-Basic-1000msg" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Plataforma / Broker <span style={{ color: COLORS.error }}>*</span></label>
            <select style={sel} value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">Selecciona una plataforma...</option>
              {ALL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {form.platform && (
            <div style={{ background: COLORS.bgHover, borderRadius: 8, padding: '12px 16px', border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Compatibilitat per {form.platform}
              </div>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: COLORS.textSecondary, marginRight: 8 }}>Arquitectures:</span>
                {ALL_ARCHITECTURES.map(a => <CompatBadge key={a} label={a} available={availableArchitectures.includes(a)} />)}
              </div>
              <div>
                <span style={{ fontSize: 11, color: COLORS.textSecondary, marginRight: 8 }}>Protocols:</span>
                {ALL_PROTOCOLS.map(p => <CompatBadge key={p} label={p} available={availableProtocols.includes(p)} />)}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Arquitectura <span style={{ color: COLORS.error }}>*</span>
                {!form.platform && <span style={{ color: COLORS.textDisabled, fontWeight: 400, textTransform: 'none', marginLeft: 4 }}>(tria plataforma primer)</span>}
              </label>
              <select style={form.platform ? sel : selDisabled} value={form.architecture} onChange={e => set('architecture', e.target.value)} disabled={!form.platform}>
                <option value="">Selecciona...</option>
                {availableArchitectures.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Protocol <span style={{ color: COLORS.error }}>*</span>
                {!form.platform && <span style={{ color: COLORS.textDisabled, fontWeight: 400, textTransform: 'none', marginLeft: 4 }}>(tria plataforma primer)</span>}
              </label>
              <select style={form.platform ? sel : selDisabled} value={form.protocol} onChange={e => set('protocol', e.target.value)} disabled={!form.platform}>
                <option value="">Selecciona...</option>
                {availableProtocols.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Duracio (s)</label>
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
          {error && <div style={{ background: COLORS.error + '15', border: '1px solid ' + COLORS.error + '40', borderRadius: 6, padding: '10px 14px', color: COLORS.error, fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={S.btn} onClick={onClose} disabled={saving}>Cancella</button>
            <button style={{ ...S.btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }} onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardant...' : 'Crear Escenari'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ScenariosPage = () => {
  const [scenarios, setScenarios]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filterArch, setFilterArch]   = useState('all');
  const [filterProto, setFilterProto] = useState('all');
  const [filterPlat, setFilterPlat]   = useState('all');
  const [hoveredRow, setHoveredRow]   = useState<number | null>(null);
  const [showModal, setShowModal]     = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(API_BASE + '/scenarios')
      .then(r => r.json())
      .then(data => { setScenarios(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = scenarios.filter(s => {
    if (filterArch  !== 'all' && s.architecture             !== filterArch)  return false;
    if (filterProto !== 'all' && s.protocol                 !== filterProto) return false;
    if (filterPlat  !== 'all' && (s.platform || s.broker)   !== filterPlat)  return false;
    return true;
  });

  const sel: React.CSSProperties = { ...S.input, width: 'auto', minWidth: 140 };

  return (
    <div style={S.page}>
      {showModal && <CreateScenarioModal onClose={() => setShowModal(false)} onCreated={fetchData} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: COLORS.textPrimary }}>Escenaris de Benchmark</h1>
          <p style={{ margin: '6px 0 0', color: COLORS.textSecondary, fontSize: 15 }}>Configuracions de carrega per provar combinacions d APIs asincrones</p>
        </div>
        <button style={S.btnPrimary} onClick={() => setShowModal(true)}>+ Nou Escenari</button>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>Plataforma:</span>
          <select style={sel} value={filterPlat} onChange={e => setFilterPlat(e.target.value)}>
            <option value="all">Totes</option>
            {ALL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>Arquitectura:</span>
          <select style={sel} value={filterArch} onChange={e => setFilterArch(e.target.value)}>
            <option value="all">Totes</option>
            {ALL_ARCHITECTURES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>Protocol:</span>
          <select style={sel} value={filterProto} onChange={e => setFilterProto(e.target.value)}>
            <option value="all">Tots</option>
            {ALL_PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      {loading && <p style={{ color: COLORS.textSecondary, padding: 40, textAlign: 'center' }}>Carregant escenaris...</p>}
      {error   && <p style={{ color: COLORS.error, padding: 16 }}>Error: {error}</p>}
      {!loading && !error && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + COLORS.border, color: COLORS.textSecondary, fontSize: 13 }}>
            {filtered.length} escenari{filtered.length !== 1 ? 's' : ''}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={S.tableHeader}>
                <th style={S.th}>Nom</th>
                <th style={S.th}>Plataforma</th>
                <th style={S.th}>Arquitectura</th>
                <th style={S.th}>Protocol</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Duracio (s)</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Rate (msg/s)</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Payload (B)</th>
                <th style={{ ...S.th, textAlign: 'center' }}>Tipus</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: COLORS.textSecondary }}>Cap escenari. Crea un amb + Nou Escenari.</td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id || i} style={{ ...S.tableRow, background: hoveredRow === i ? COLORS.bgHover : 'transparent' }}
                  onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{s.name || '-'}</td>
                  <td style={S.td}>{(s.platform || s.broker) ? <span style={S.badge(COLORS.warning)}>{s.platform || s.broker}</span> : <span style={{ color: COLORS.textDisabled }}>-</span>}</td>
                  <td style={S.td}>{s.architecture ? <span style={S.badge(CATEGORY_COLORS.architecture)}>{s.architecture}</span> : <span style={{ color: COLORS.textDisabled }}>-</span>}</td>
                  <td style={S.td}>{s.protocol ? <span style={S.badge(CATEGORY_COLORS.protocol)}>{s.protocol}</span> : <span style={{ color: COLORS.textDisabled }}>-</span>}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.duration ?? '-'}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace' }}>{s.rate ?? '-'}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', color: COLORS.textSecondary }}>{s.payloadSize ?? '-'}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>{s.predefined ? <span style={S.badge(COLORS.success)}>Sistema</span> : <span style={S.badge(COLORS.accent)}>Custom</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
