import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS, CATEGORY_COLORS } from '../../theme';

const API_BASE = '/api/proxy/catalog-service';
const CATEGORY_LABELS: Record<string, string> = {
  architecture: 'Arquitectura',
  protocol:     'Protocol',
  platform:     'Plataforma',
  gateway:      'Gateway',
};
const ALL_CATEGORIES = ['architecture', 'protocol', 'platform', 'gateway'];

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

const PlusIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const CloseIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;

// ── NewComponentModal ──────────────────────────────────────────────────────────
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
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, color: 'var(--text-secondary)',
    marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Nou Component</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}><CloseIcon /></button>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Nom *</label><input style={{ ...S.input }} placeholder="ex. Apache Kafka" value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div><label style={lbl}>Nom curt</label><input style={{ ...S.input }} placeholder="ex. KAFKA" value={form.shortName} onChange={e => set('shortName', e.target.value)} /></div>
          </div>
          <div>
            <label style={lbl}>Categoria *</label>
            <select style={{ ...S.input }} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Selecciona categoria...</option>
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Descripció</label>
            <textarea style={{ ...S.input, resize: 'vertical', minHeight: 72 } as React.CSSProperties} placeholder="Descriu el component..." value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Versió</label><input style={{ ...S.input }} placeholder="ex. 3.6" value={form.version} onChange={e => set('version', e.target.value)} /></div>
            <div><label style={lbl}>Etiquetes (coma)</label><input style={{ ...S.input }} placeholder="ex. streaming, event-driven" value={form.tags} onChange={e => set('tags', e.target.value)} /></div>
          </div>
          {error && (
            <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', color: 'var(--error)', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ ...S.btn, fontSize: 13 }}>Cancel·la</button>
            <button onClick={handleSubmit} disabled={saving} style={{ ...S.btnPrimary, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Desant...' : 'Crea Component'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── CatalogPage ────────────────────────────────────────────────────────────────
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

  const real            = components.filter(c => !c.test);
  const filtered        = activeFilter === 'all' ? real : real.filter(c => c.category === activeFilter);
  const countByCategory = (cat: string) => real.filter(c => c.category === cat).length;

  return (
    <div style={{ ...S.page }}>
      <style>{GLOBAL_CSS}</style>

      {showNewModal && <NewComponentModal onClose={() => setShowNewModal(false)} onSaved={fetchComponents} />}

      {/* Capçalera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Catàleg de Components
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Arquitectures, protocols, plataformes i gateways disponibles per construir escenaris
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)} style={{ ...S.btnPrimary, whiteSpace: 'nowrap' }}>
          <PlusIcon /> Nou Component
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveFilter('all')}
          style={{ ...S.chip(activeFilter === 'all'), fontSize: 13, padding: '6px 16px' }}
        >
          Tots ({real.length})
        </button>
        {ALL_CATEGORIES.map(cat => {
          const active = activeFilter === cat;
          const color  = CATEGORY_COLORS[cat];
          return (
            <button key={cat} onClick={() => setActiveFilter(cat)}
              style={{ ...S.chip(active, color), fontSize: 13, padding: '6px 16px' }}>
              {CATEGORY_LABELS[cat]} ({countByCategory(cat)})
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: 'var(--error)', padding: '0 0 16px' }}>Error: {error}</p>}

      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        {/* Strip superior */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{loading ? '—' : filtered.length}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              component{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'all' && <span> · {CATEGORY_LABELS[activeFilter]}</span>}
            </span>
            {activeFilter !== 'all' && !loading && (
              <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>
                de {real.length} totals
              </span>
            )}
          </div>
          <button onClick={fetchComponents} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font)' }}>
            <RefreshIcon /> Actualitzar
          </button>
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
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {[50, 30, 70, 20].map((w, j) => (
                    <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${i * 0.08}s` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  Cap component trobat.
                </td>
              </tr>
            ) : filtered.map((c, i) => (
              <tr key={c.id || i}
                style={{ ...S.tableRow, background: hoveredRow === i ? 'var(--bg-hover)' : 'transparent' }}
                onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={{ ...S.td, fontWeight: 600 }}>{c.name || '—'}</td>
                <td style={S.td}>
                  {c.category
                    ? <span style={{ ...S.badge(CATEGORY_COLORS[c.category] || 'var(--accent)') }}>{CATEGORY_LABELS[c.category] || c.category}</span>
                    : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                </td>
                <td style={{ ...S.td, color: 'var(--text-secondary)', maxWidth: 300 }}>{c.description || '—'}</td>
                <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {c.shortName
                    ? <code style={{ background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{c.shortName}</code>
                    : <span style={{ color: 'var(--text-disabled)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
