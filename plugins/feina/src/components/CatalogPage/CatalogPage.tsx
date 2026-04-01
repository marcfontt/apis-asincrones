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

const KNOWN_VERSIONS: Record<string, string> = {
  'kafka':          '3.7',
  'confluent':      '7.6',
  'rabbitmq':       '3.13',
  'nats server':    '2.10',
  'nats':           '2.10',
  'pulsar':         '3.2',
  'emqx':           '5.6',
  'activemq':       '6.1',
  'mqtt':           '5.0',
  'amqp':           '1.0',
  'websocket':      '13',
  'ws':             '13',
  'grpc':           '1.64',
  'sse':            '1.0',
  'coap':           '18',
  'http/2':         '2.0',
  'nats protocol':  '2.10',
  'kafka protocol': '3.7',
};

const getVersion = (c: any): string => {
  if (c.version) return c.version;
  const key = (c.shortName || c.name || '').toLowerCase();
  return KNOWN_VERSIONS[key] || KNOWN_VERSIONS[c.name?.toLowerCase()] || '';
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  architecture: "Patró estructural que defineix com s'organitzen els components del sistema i com interactuen entre ells.",
  protocol:     "Conjunt de regles de comunicació que determinen com s'envien i reben els missatges entre productors i consumidors.",
  platform:     "Infraestructura de missatgeria que actua com a broker, gestionant la distribució dels missatges.",
  gateway:      "Punt d'entrada que gestiona l'encaminament, la seguretat i la transformació dels missatges.",
};

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

const CloseIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const InfoIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;

const ComponentDetailModal = ({ component, onClose }: { component: any; onClose: () => void }) => {
  const color = CATEGORY_COLORS[component.category] || 'var(--accent)';
  const label = CATEGORY_LABELS[component.category] || component.category;

  const Row = ({ label: l, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{l}</span>
      <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{value || '-'}</span>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}40`, borderRadius: 14, padding: 32, width: 540, maxHeight: '88vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {component.name}
              </h2>
              {component.shortName && (
                <code style={{ background: color + '18', color, border: '1px solid ' + color + '40', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {component.shortName}
                </code>
              )}
            </div>
            <span style={{ ...S.badge(color), fontSize: 12 }}>{label}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6, marginLeft: 12, flexShrink: 0 }}>
            <CloseIcon />
          </button>
        </div>

        {component.description && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: `${color}08`, borderRadius: 8, border: `1px solid ${color}25` }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{component.description}</p>
          </div>
        )}

        {CATEGORY_DESCRIPTIONS[component.category] && (
          <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--text-disabled)', flexShrink: 0, marginTop: 1 }}><InfoIcon /></span>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-disabled)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>{label}:</strong> {CATEGORY_DESCRIPTIONS[component.category]}
            </p>
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Detalls tecnics
          </div>
          <Row label="Categoria" value={label} />
          <Row label="Nom curt"  value={component.shortName || '-'} />
          <Row label="Versio"    value={getVersion(component) || '-'} />
          {component.createdAt && (
            <Row label="Afegit el" value={new Date(component.createdAt).toLocaleDateString('ca-ES')} />
          )}
        </div>

        {component.tags && component.tags.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Etiquetes
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {component.tags.map((tag: string) => (
                <span key={tag} style={{ ...S.badge(color), fontSize: 11 }}>{tag}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
          Pots usar <strong style={{ color: 'var(--text-primary)' }}>{component.name}</strong> com a {label.toLowerCase()} al crear un nou escenari de benchmark.{' '}
          <a href="/escenaris?create=true" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Crear escenari</a>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...S.btnPrimary, fontSize: 13, background: color, boxShadow: 'none' }}>Tanca</button>
        </div>
      </div>
    </div>
  );
};

export const CatalogPage = () => {
  const [components,        setComponents]        = useState<any[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState('');
  const [activeFilter,      setActiveFilter]      = useState('all');
  const [hoveredRow,        setHoveredRow]        = useState<number | null>(null);
  const [selectedIdx,       setSelectedIdx]       = useState<number | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);

  useEffect(() => { document.title = 'Cataleg | APIs Asincrones'; }, []);

  const fetchComponents = () => {
    setLoading(true);
    fetch(`${API_BASE}/components`)
      .then(r => r.json())
      .then(data => { setComponents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  useEffect(() => { fetchComponents(); }, []);

  const real     = components.filter(c => c.predefined !== false);
  const filtered = activeFilter === 'all' ? real : real.filter(c => c.category === activeFilter);
  const countByCategory = (cat: string) => real.filter(c => c.category === cat).length;

  return (
    <div style={{ ...S.page }}>
      <style>{GLOBAL_CSS}</style>

      {selectedComponent && (
        <ComponentDetailModal component={selectedComponent} onClose={() => { setSelectedComponent(null); setSelectedIdx(null); }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Cataleg de Components
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Arquitectures, protocols, plataformes i gateways disponibles per construir escenaris
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveFilter('all')} style={{ ...S.chip(activeFilter === 'all'), fontSize: 13, padding: '6px 16px' }}>
          Tots ({real.length})
        </button>
        {ALL_CATEGORIES.map(cat => {
          const active = activeFilter === cat;
          const color  = CATEGORY_COLORS[cat];
          return (
            <button key={cat} onClick={() => setActiveFilter(cat)} style={{ ...S.chip(active, color), fontSize: 13, padding: '6px 16px' }}>
              {CATEGORY_LABELS[cat]} ({countByCategory(cat)})
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: 'var(--error)', padding: '0 0 16px' }}>Error: {error}</p>}

      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{loading ? '-' : filtered.length}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              component{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'all' && <span> - {CATEGORY_LABELS[activeFilter]}</span>}
            </span>
            {activeFilter !== 'all' && !loading && (
              <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>
                de {real.length} totals
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Clica una fila per veure els detalls</span>
            <button onClick={fetchComponents} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font)' }}>
              <RefreshIcon /> Actualitzar
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={S.tableHeader}>
              <th style={S.th}>Nom</th>
              <th style={S.th}>Categoria</th>
              <th style={S.th}>Descripcio</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Nom curt</th>
              <th style={{ ...S.th, textAlign: 'center' }}>Versio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {[45, 25, 65, 18, 12].map((w, j) => (
                    <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${i * 0.07}s` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                  Cap component trobat.
                </td>
              </tr>
            ) : filtered.map((c, i) => {
              const color      = CATEGORY_COLORS[c.category] || 'var(--accent)';
              const isSelected = selectedIdx === i;
              const isHovered  = hoveredRow === i;
              const version    = getVersion(c);
              return (
                <tr key={c.id || i}
                  style={{
                    ...S.tableRow,
                    background: isSelected ? color + '10' : isHovered ? 'var(--bg-hover)' : 'transparent',
                    borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'background var(--transition), border-left-color var(--transition)',
                  }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => { setSelectedIdx(isSelected ? null : i); setSelectedComponent(isSelected ? null : c); }}
                >
                  <td style={{ ...S.td, fontWeight: 700 }}>{c.name || '-'}</td>
                  <td style={S.td}>
                    {c.category
                      ? <span style={{ ...S.badge(color) }}>{CATEGORY_LABELS[c.category] || c.category}</span>
                      : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                  </td>
                  <td style={{ ...S.td, color: 'var(--text-secondary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.description || '-'}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    {c.shortName
                      ? <code style={{ background: color + '14', border: '1px solid ' + color + '30', padding: '2px 8px', borderRadius: 5, color, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{c.shortName}</code>
                      : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: version ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
                    {version || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
