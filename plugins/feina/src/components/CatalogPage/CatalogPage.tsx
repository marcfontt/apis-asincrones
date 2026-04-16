
import { useEffect, useState } from 'react';
import React from 'react';
import { S, GLOBAL_CSS, CATEGORY_COLORS } from '../../theme';

const API_BASE = '/api/proxy/catalog-service';

const CATEGORY_LABELS: Record<string, string> = {
  architecture: 'Arquitectura',
  protocol:     'Protocol',
  platform:     'Plataforma',
};

// Versions conegudes per als components predefinits
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
  architecture: 'Patró estructural que defineix com s\'organitzen els components del sistema i com interactuen entre ells.',
  protocol:     'Conjunt de regles de comunicació que determinen com s\'envien i reben els missatges entre productors i consumidors.',
  platform:     'Infraestructura de missatgeria que actua com a broker, gestionant la distribució dels missatges.',
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

// ── Component Detail Modal ─────────────────────────────────────────────────────
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

        {/* Capçalera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {component.name}
              </h2>
              {component.shortName && (
                <code style={{
                  background: color + '18', color, border: '1px solid ' + color + '40',
                  padding: '2px 10px', borderRadius: 6, fontSize: 12,
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                }}>
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

        {/* Descripció */}
        {component.description && (
          <div style={{ marginBottom: 20, padding: '14px 18px', background: `${color}08`, borderRadius: 8, border: `1px solid ${color}25` }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {component.description}
            </p>
          </div>
        )}

        {/* Context de la categoria */}
        {CATEGORY_DESCRIPTIONS[component.category] && (
          <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--text-disabled)', flexShrink: 0, marginTop: 1 }}><InfoIcon /></span>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-disabled)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>{label}:</strong> {CATEGORY_DESCRIPTIONS[component.category]}
            </p>
          </div>
        )}

        {/* Metadades */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Detalls tècnics
          </div>
          <Row label="Categoria"  value={label} />
          <Row label="Nom curt"   value={component.shortName || '-'} />
          <Row label="Versió"     value={getVersion(component) || '-'} />
          {component.createdAt && (
            <Row label="Afegit el" value={new Date(component.createdAt).toLocaleDateString('ca-ES')} />
          )}
        </div>

        {/* Tags */}
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

        {/* Us en escenaris */}
        <div style={{ padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
          Pots usar <strong style={{ color: 'var(--text-primary)' }}>{component.name}</strong> com a {label.toLowerCase()} al crear un nou escenari de benchmark.{' '}
          <a href="/escenaris?create=true" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Crear escenari →</a>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...S.btnPrimary, fontSize: 13, background: color, boxShadow: 'none' }}>Tanca</button>
        </div>
      </div>
    </div>
  );
};

const SearchIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

// Category icon map
const CAT_ICONS: Record<string, React.ReactNode> = {
  protocol:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  platform:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  architecture: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
};

// ── Sort helpers ──────────────────────────────────────────────────────────────
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
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ fontSize: 10, color: active ? 'var(--accent)' : 'var(--text-disabled)' }}>
          {active && dir === 'asc' ? '↑' : active && dir === 'desc' ? '↓' : '↕'}
        </span>
      </span>
    </th>
  );
};

// ── CatalogPage ────────────────────────────────────────────────────────────────
export const CatalogPage = () => {
  const [components,        setComponents]        = useState<any[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState('');
  const [activeFilter,      setActiveFilter]      = useState('all');
  const [hoveredRow,        setHoveredRow]        = useState<number | null>(null);
  const [selectedIdx,       setSelectedIdx]       = useState<number | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<any | null>(null);
  const [sortKey,           setSortKey]           = useState<string | null>(null);
  const [sortDir,           setSortDir]           = useState<SortDir | null>(null);
  const [searchQuery,       setSearchQuery]       = useState('');

  const handleSort = (sk: string) => {
    if (sortKey !== sk) { setSortKey(sk); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir(null);
  };

  useEffect(() => { document.title = 'Catàleg | APIs Asíncrones'; }, []);

  const fetchComponents = () => {
    setLoading(true);
    fetch(`${API_BASE}/components`)
      .then(r => r.json())
      .then(data => { setComponents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  useEffect(() => { fetchComponents(); }, []);

  // Nomes components predefinits, sense gateways
  const real = components.filter(c => c.predefined !== false && c.category !== 'gateway');
  const countByCategory = (cat: string) => real.filter(c => c.category === cat).length;

  const filtered = real.filter(c => {
    if (activeFilter !== 'all' && c.category !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name  = (c.name        || '').toLowerCase();
      const short = (c.shortName   || '').toLowerCase();
      const desc  = (c.description || '').toLowerCase();
      const cat   = (CATEGORY_LABELS[c.category] || c.category || '').toLowerCase();
      if (!name.includes(q) && !short.includes(q) && !desc.includes(q) && !cat.includes(q)) return false;
    }
    return true;
  });

  const sortedFiltered = sortKey == null
    ? filtered
    : [...filtered].sort((a, b) => {
        let av: string, bv: string;
        if (sortKey === 'version') {
          av = getVersion(a);
          bv = getVersion(b);
        } else if (sortKey === 'category') {
          av = CATEGORY_LABELS[a.category] || a.category || '';
          bv = CATEGORY_LABELS[b.category] || b.category || '';
        } else {
          av = String((a as any)[sortKey] ?? '');
          bv = String((b as any)[sortKey] ?? '');
        }
        const cmp = av.localeCompare(bv, 'ca');
        return sortDir === 'desc' ? -cmp : cmp;
      });

  return (
    <div style={{ ...S.page }}>
      <style>{GLOBAL_CSS}</style>

      {selectedComponent && (
        <ComponentDetailModal
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}

      {/* Capçalera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Catàleg de Components
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Arquitectures, protocols i plataformes disponibles per construir escenaris
          </p>
        </div>
      </div>

      {/* Stats + filtre per categoria */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { cat: 'all', label: 'Tots', value: real.length, color: 'var(--text-secondary)', bg: 'var(--bg-card)',
            icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { cat: 'protocol',     label: 'Protocols',    value: countByCategory('protocol'),     color: CATEGORY_COLORS.protocol,     bg: CATEGORY_COLORS.protocol + '0e',     icon: CAT_ICONS.protocol },
          { cat: 'platform',     label: 'Plataformes',  value: countByCategory('platform'),     color: CATEGORY_COLORS.platform,     bg: CATEGORY_COLORS.platform + '0e',     icon: CAT_ICONS.platform },
          { cat: 'architecture', label: 'Arquitectures',value: countByCategory('architecture'), color: CATEGORY_COLORS.architecture, bg: CATEGORY_COLORS.architecture + '0e', icon: CAT_ICONS.architecture },
        ].map(s => {
          const isActive = activeFilter === s.cat;
          return (
            <button
              key={s.cat}
              onClick={() => { setActiveFilter(s.cat); setSearchQuery(''); }}
              style={{
                background: isActive ? (s.cat === 'all' ? 'var(--bg-hover)' : s.color + '15') : 'var(--bg-card)',
                border: `1px solid ${isActive ? (s.cat === 'all' ? 'var(--border)' : s.color + '50') : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'var(--font)', transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: isActive ? `0 0 0 1px ${s.cat === 'all' ? 'transparent' : s.color + '20'}` : 'none',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: s.cat === 'all' ? 'var(--bg-subtle)' : s.color + '18',
                border: `1px solid ${s.cat === 'all' ? 'var(--border)' : s.color + '30'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.cat === 'all' ? 'var(--text-secondary)' : s.color,
              }}>
                {s.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1,
                  color: isActive ? (s.cat === 'all' ? 'var(--text-primary)' : s.color) : 'var(--text-primary)' }}>
                  {loading ? '-' : s.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: isActive && s.cat !== 'all' ? s.color : 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap' as const }}>
                  {s.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p style={{ color: 'var(--error)', padding: '0 0 16px' }}>Error: {error}</p>}

      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
        {/* Strip superior */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{loading ? '-' : filtered.length}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              component{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'all' && <span style={{ color: CATEGORY_COLORS[activeFilter] }}> · {CATEGORY_LABELS[activeFilter]}</span>}
            </span>
            {(activeFilter !== 'all' || searchQuery) && !loading && (
              <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>
                de {real.length} totals
              </span>
            )}
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-subtle)', border: `1px solid ${searchQuery ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, padding: '4px 10px', minWidth: 190, transition: 'border-color 0.15s' }}>
              <span style={{ color: searchQuery ? 'var(--accent)' : 'var(--text-disabled)', display: 'flex', flexShrink: 0 }}><SearchIcon /></span>
              <input
                type="text"
                placeholder="Cerca per nom, protocol..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font)', width: '100%' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, display: 'flex', fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Clica per veure detalls</span>
            <button onClick={fetchComponents} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font)' }}>
              <RefreshIcon /> Actualitzar
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={S.tableHeader}>
              <SortTh label="Nom"        sk="name"        current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Categoria"  sk="category"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Descripcio" sk="description" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Nom curt"   sk="shortName"   current={sortKey} dir={sortDir} onSort={handleSort} extraStyle={{ textAlign: 'center' }} />
              <SortTh label="Versio"     sk="version"     current={sortKey} dir={sortDir} onSort={handleSort} extraStyle={{ textAlign: 'center' }} />
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
            ) : sortedFiltered.map((c, i) => {
              const color      = CATEGORY_COLORS[c.category] || 'var(--accent)';
              const isSelected = selectedIdx === i;
              const isHovered  = hoveredRow === i;
              const version    = getVersion(c);
              return (
                <tr key={c.id || i}
                  className="card-hover"
                  style={{
                    ...S.tableRow,
                    background: isSelected ? color + '0d' : isHovered ? 'var(--bg-hover)' : 'transparent',
                    borderLeft: `3px solid ${isSelected || isHovered ? color : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'background var(--transition), border-left-color var(--transition)',
                  }}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => {
                    setSelectedIdx(isSelected ? null : i);
                    setSelectedComponent(isSelected ? null : c);
                  }}
                >
                  <td style={{ ...S.td, fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: color + '15', border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
                        {CAT_ICONS[c.category] || <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/></svg>}
                      </div>
                      {c.name || '-'}
                    </div>
                  </td>
                  <td style={S.td}>
                    {c.category
                      ? <span style={{ ...S.badge(color), fontSize: 11 }}>{CATEGORY_LABELS[c.category] || c.category}</span>
                      : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                  </td>
                  <td style={{ ...S.td, color: 'var(--text-secondary)', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {c.description || <span style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>Sense descripció</span>}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    {c.shortName
                      ? <code style={{ background: color + '14', border: '1px solid ' + color + '30', padding: '2px 9px', borderRadius: 5, color, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{c.shortName}</code>
                      : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                  </td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    {version
                      ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 4 }}>v{version}</span>
                      : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
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

export default CatalogPage;
