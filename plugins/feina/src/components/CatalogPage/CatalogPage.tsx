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

export const CatalogPage = () => {
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredRow, setHoveredRow]     = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/components`)
      .then(r => r.json())
      .then(data => { setComponents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const real = components.filter(c => !c.test);
  const filtered = activeFilter === 'all' ? real : real.filter(c => c.category === activeFilter);

  const countByCategory = (cat: string) => real.filter(c => c.category === cat).length;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>Catàleg de Components</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
          Arquitectures, protocols, plataformes i gateways disponibles per construir escenaris
        </p>
      </div>

      {/* Chips de filtre */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveFilter('all')}
          style={{
            padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            background: activeFilter === 'all' ? 'var(--accent)' : 'var(--bg-card)',
            color: activeFilter === 'all' ? 'white' : 'var(--text-secondary)',
            border: `1px solid ${activeFilter === 'all' ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          Tots ({real.length})
        </button>
        {ALL_CATEGORIES.map(cat => {
          const active = activeFilter === cat;
          const color = CATEGORY_COLORS[cat];
          return (
            <button key={cat} onClick={() => setActiveFilter(cat)} style={{
              padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: active ? color : 'var(--bg-card)',
              color: active ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${active ? color : 'var(--border)'}`,
            }}>
              {CATEGORY_LABELS[cat]} ({countByCategory(cat)})
            </button>
          );
        })}
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)', padding: 40, textAlign: 'center' }}>Carregant components...</p>}
      {error   && <p style={{ color: 'var(--error)', padding: 16 }}>Error: {error}</p>}

      {!loading && !error && (
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
            {filtered.length} component{filtered.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' && <span> · {CATEGORY_LABELS[activeFilter]}</span>}
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
                <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Cap component trobat.
                </td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id || i}
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
                      ? <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>{c.shortName}</code>
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
