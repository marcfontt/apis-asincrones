import { useEffect, useState } from 'react';
import { S, CATEGORY_COLORS } from '../../theme';

const API_BASE = '/api/proxy/catalog-service';

const CATEGORY_LABELS: Record<string, string> = {
  architecture: 'Arquitectura',
  protocol:     'Protocol',
  platform:     'Plataforma',
  gateway:      'Gateway',
};
const ALL_CATEGORIES = ['architecture', 'protocol', 'platform', 'gateway'];

const PlusIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

const NewComponentModal = ({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) => {
  const [form, setForm]     = useState({ name: '', category: '', shortName: '', description: '', version: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category) { setError('El nom i la categoria són obligatoris.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name:        form.name.trim(),
        category:    form.category,
        shortName:   form.shortName.trim() || form.name.trim().toUpperCase().slice(0, 6),
        description: form.description.trim(),
        version:     form.version.trim() || '1.0',
        tags:        form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        predefined:  false,
        createdAt:   new Date().toISOString(),
      };
      const r = await fetch(`${API_BASE}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box', outline: 'none' };
  const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Nou Component</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><CloseIcon /></button>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Nom *</label><input style={inp} placeholder="ex. Apache Kafka" value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div><label style={lbl}>Nom curt</label><input style={inp} placeholder="ex. KAFKA" value={form.shortName} onChange={e => set('shortName', e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Categoria *</label>
            <select style={inp} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Selecciona categoria...</option>
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Descripció</label>
            <textarea style={{ ...inp, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' } as React.CSSProperties} placeholder="Descriu el component..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Versió</label><input style={inp} placeholder="ex. 3.6" value={form.version} onChange={e => set('version', e.target.value)} /></div>
            <div><label style={lbl}>Etiquetes (separades per coma)</label><input style={inp} placeholder="ex. streaming, event-driven" value={form.tags} onChange={e => set('tags', e.target.value)} /></div>
          </div>
          {error && <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', color: 'var(--error)', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>Cancel·la</button>
            <button onClick={handleSubmit} disabled={saving} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#ffffff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Desant...' : 'Crea Component'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CatalogPage = () => {
  const [components,   setComponents]   = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredRow,   setHoveredRow]   = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => { document.title = 'Catàleg | APIs Asíncrones'; }, []);

  const fetchComponents = () => {
    setLoading(true);
    fetch(`${API_BASE}/components`)
      .then(r => r.json())
      .then(data => { setComponents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { fetchComponents(); }, []);

  const real              = components.filter(c => !c.test);
  const filtered          = activeFilter === 'all' ? real : real.filter(c => c.category === activeFilter);
  const countByCategory   = (cat: string) => real.filter(c => c.category === cat).length;

  return (
    <div style={S.page}>
      {showNewModal && <NewComponentModal onClose={() => setShowNewModal(false)} onSaved={fetchComponents} />}

      {/* Capçalera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>Catàleg de Components</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Arquitectures, protocols, plataformes i gateways disponibles per construir escenaris
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(88,166,255,0.3)', whiteSpace: 'nowrap' }}
        >
          <PlusIcon /> Nou Component
        </button>
      </div>

      {/* Chips de filtre */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveFilter('all')}
          style={{ padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: activeFilter === 'all' ? 'var(--accent)' : 'var(--bg-card)', color: activeFilter === 'all' ? 'white' : 'var(--text-secondary)', border: `1px solid ${activeFilter === 'all' ? 'var(--accent)' : 'var(--border)'}` }}
        >
          Tots ({real.length})
        </button>
        {ALL_CATEGORIES.map(cat => {
          const active = activeFilter === cat;
          const color  = CATEGORY_COLORS[cat];
          return (
            <button key={cat} onClick={() => setActiveFilter(cat)} style={{ padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s', background: active ? color : 'var(--bg-card)', color: active ? 'white' : 'var(--text-secondary)', border: `1px solid ${active ? color : 'var(--border)'}` }}>
              {CATEGORY_LABELS[cat]} ({countByCategory(cat)})
            </button>
          );
        })}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)', padding: 40, textAlign: 'center' }}>Carregant components...</p>}
      {error   && <p style={{ color: 'var(--error)', padding: 16 }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {filtered.length} component{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'all' && <span> · {CATEGORY_LABELS[activeFilter]}</span>}
            </span>
            <button onClick={fetchComponents} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Actualitzar</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={S.tableHeader}>
                <th style={S.th}>Nom</th>
                <th style={S.th}>Categoria</th>
                <th style={S.th}>Descripció</th>
                <th style={S.th}>Nom curt</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Cap component trobat.</td></tr>
              ) : filtered.map((c, i) => (
                <tr
                  key={c.id || i}
                  style={{ ...S.tableRow, background: hoveredRow === i ? 'var(--bg-hover)' : 'transparent' }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.name || '-'}</td>
                  <td style={S.td}>
                    {c.category
                      ? <span style={S.badge(CATEGORY_COLORS[c.category] || 'var(--accent)')}>{CATEGORY_LABELS[c.category] || c.category}</span>
                      : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                  </td>
                  <td style={{ ...S.td, color: 'var(--text-secondary)', maxWidth: 300 }}>{c.description || '-'}</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 13 }}>
                    {c.shortName
                      ? <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-primary)' }}>{c.shortName}</code>
                      : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
