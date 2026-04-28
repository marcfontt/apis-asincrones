/**
 * RunsPage.tsx -- Historial complet de runs de l'orquestrador
 *
 * Mostra una taula de totes les execucions (runs) registrades a l'orquestrador
 * AKS (Azure Kubernetes Service). Cada run correspon a un escenari llançat
 * (amb el seu escenari, arquitectura, protocol, estat i timestamp).
 *
 * Dades: GET /api/proxy/benchmark-orchestrator/runs
 * L'orquestrador desa els runs en memoria (InMemory storage). Aixo vol dir
 * que si el pod es reinicia, els runs desapareixen. Per a persistencia real
 * caldria afegir una BD (PostgreSQL/MongoDB) al servei d'orquestra.
 *
 * Interaccions:
 *  - Filtrar per estat (Tots / En execucio / Completat / Error / Aturat)
 *  - Cerca per nom, protocol o arquitectura
 *  - Clic a una fila: copia l'ID del run al portapapers
 *
 * Canvis aplicats:
 *  - Eliminats runs de test (r.test === true) del llistat
 *  - Afegit badge de protocol i arquitectura per cada run
 *  - Format de data localitzat a ca-ES (dd/mm/yy hh:mm)
 */

import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS } from '../theme';

// Endpoint de l'orquestrador (proxied per Backstage)
const API_BASE = '/api/proxy/benchmark-orchestrator';

// ── Configuracio d'estats ──────────────────────────────────────────────────────
// Cada estat te un color, fons i etiqueta visibles a la taula.
// 'cancelled' i 'cleanup' usen el mateix gris per indicar que el run ha acabat
// sense completar (aturat per l'usuari o en proces de neteja del namespace).
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  label: 'Pendent'     },
  running:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: 'En execucio' },
  completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  label: 'Completat'   },
  // 'cancelled': aturat manualment per l'usuari (boto "Atura")
  cancelled: { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',label: 'Aturat'      },
  error:     { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  label: 'Error'       },
  // 'cleanup': el namespace de Kubernetes s'esta eliminant (transitori)
  cleanup:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)',label: 'Netejant'    },
};

// ── Colors per protocol ────────────────────────────────────────────────────────
// Colors de marca de cada protocol/missatgeria:
//   Kafka = vermell (missatgeria pesant, alt throughput)
//   NATS  = verd (lightweight, ultra-rapid)
//   gRPC  = viola (RPC binari, Google)
//   WS    = blau (WebSocket, temps real sobre HTTP)
const PROTOCOL_COLORS: Record<string, string> = {
  'Kafka':  '#ef4444',
  'AMQP':   '#f97316',
  'MQTT':   '#eab308',
  'gRPC':   '#8b5cf6',
  'WS':     '#3b82f6',
  'NATS':   '#22c55e',
};

const VISIBLE_PROTOCOLS = ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'WS', 'NATS'];

// ── Colors per arquitectura ────────────────────────────────────────────────────
// Cada patró arquitectonic te el seu color identificatiu al llarg de tota l'app.
// Es mantenen consistents amb ScenariosPage, ExecucionsPage i ResultatsPage.
const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA': '#2563eb', // Event-Driven Architecture
  'QBA': '#9333ea', // Queue-Based Architecture
  'LCA': '#16a34a', // Log-Centric Architecture
  'EMA': '#dc2626', // Event-Mesh Architecture
  'SEA': '#d97706', // Streaming Event Architecture
};

// ── Skeleton loader style ──────────────────────────────────────────────────────
// S'aplica a les cel.les de la taula mentre es carreguen les dades.
// L'animacio 'shimmer' esta definida a theme.ts com a @keyframes.
const SK_STYLE = {
  background:     'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation:      'shimmer 1.5s ease-in-out infinite',
  borderRadius:   4,
};

// ── Icones SVG inline ──────────────────────────────────────────────────────────
// Usem SVG inline (no libreria externa) per minimitzar bundle size i evitar
// problemes de versio amb icon packs.

/** Icona de refresc (fletxes circulars) -- per al boto "Actualitzar" */
const RefreshIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;

/** Icona de buit (linia de pols) -- quan no hi ha runs registrats */
const EmptyIcon  = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Formata un timestamp ISO 8601 a format curt localitzat (ca-ES).
 * Exemple: "2024-06-15T14:30:00Z" -> "15/06/24, 14:30"
 * Retorna '-' si la cadena esta buida o es null/undefined.
 */
const formatTime = (iso: string) =>
  !iso ? '-' : new Date(iso).toLocaleString('ca-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

// ── Component principal ────────────────────────────────────────────────────────
/**
 * RunsPage -- Historial de totes les execucions (runs) de l'orquestrador.
 *
 * Renderitza una taula interactiva amb filtratge per estat i cerca de text.
 * Cada fila es clicable per copiar el run ID al portapapers (util per debugging).
 *
 * Estat local:
 *  - runs:         llista de runs de l'orquestrador
 *  - loading:      indica si la peticio esta en curs (mostra skeletons)
 *  - hovered:      index de la fila amb mouse damunt (per highlight)
 *  - search:       text de cerca actual
 *  - statusFilter: estat seleccionat al filtre de chips ('all' | 'running' | ...)
 */
export const RunsPage = () => {
  const [runs,         setRuns]         = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [hovered,      setHovered]      = useState<number | null>(null);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /**
   * Carrega tots els runs de l'orquestrador.
   * Filtra els runs de test (r.test === true) que es creen per a health checks
   * i no haurien d'apareixer a l'historial de l'usuari.
   */
  const fetchRuns = () => {
    setLoading(true);
    fetch(`${API_BASE}/runs`)
      .then(r => r.json())
      .then(data => {
        // Eliminar runs de test del llistat visible
        setRuns(Array.isArray(data) ? data.filter((r: any) => !r.test) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Carregar en muntar el component i establir el titol del document
  useEffect(() => {
    document.title = 'Historial Runs | APIs Asíncrones';
    fetchRuns();
  }, []);

  // ── Calcul d'estadistiques del resum ─────────────────────────────────────────
  // Comptat directament dels runs (no fa peticio addicional).
  const total     = runs.length;
  const running   = runs.filter(r => r.status === 'running' || r.status === 'pending').length;
  const completed = runs.filter(r => r.status === 'completed').length;
  const errors    = runs.filter(r => r.status === 'error' || r.status === 'failed').length;

  // ── Filtratge combinat (estat + cerca) ────────────────────────────────────────
  // Primer filtra per estat (si no es 'all'), despres per text de cerca
  // sobre: nom de l'escenari, arquitectura, protocol, estat.
  const displayedRuns = runs.filter(r => {
    if (r.protocol && !VISIBLE_PROTOCOLS.includes(r.protocol)) return false;
    if (String(r.platform || r.broker || '').toLowerCase().includes('pulsar')) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (r.scenarioName || '').toLowerCase().includes(q)
          || (r.architecture  || '').toLowerCase().includes(q)
          || (r.protocol      || '').toLowerCase().includes(q)
          || (r.status        || '').toLowerCase().includes(q);
    }
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...S.page }}>
      {/* Injectar CSS global (fonts, animacions, tokens de tema) */}
      <style>{GLOBAL_CSS}</style>

      {/* ── Capçalera de la pagina ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Historial de Runs
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            Registre complet de totes les execucions al cluster AKS
          </p>
        </div>
        {/* Boto de refresc manual (la pagina no fa polling automatic) */}
        <button onClick={fetchRuns} style={{ ...S.btn, fontSize: 13 }}>
          <RefreshIcon /> Actualitzar
        </button>
      </div>

      {/* ── Resum d'estadistiques ──────────────────────────────────────────── */}
      {/* Nomes visible quan les dades han carregat (no durant loading) */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total',       value: total,     color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: 'En execucio', value: running,   color: '#3b82f6',               bg: 'rgba(59,130,246,0.10)' },
            { label: 'Completats',  value: completed, color: 'var(--success)',        bg: 'rgba(34,197,94,0.08)'  },
            { label: 'Errors',      value: errors,    color: 'var(--error)',          bg: 'rgba(239,68,68,0.08)'  },
          ].map(s => (
            <div key={s.label} style={{
              background:  s.bg,
              border:      '1px solid var(--border)',
              borderRadius: 10,
              padding:     '10px 20px',
              display:     'flex',
              alignItems:  'baseline',
              gap:         8,
            }}>
              {/* Numero gran en font monoespaiada per alineacio visual */}
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>
                {s.value}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Taula de runs ─────────────────────────────────────────────────── */}
      {/* padding: 0 perque la capçalera i taula tinguin voreres a tota l'amplada */}
      <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>

        {/* ── Barra superior: comptador + chips de filtre + cerca ── */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Comptador de files visibles / totals */}
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {loading ? '-' : `${displayedRuns.length}`}
              {!loading && displayedRuns.length !== runs.length && (
                <span style={{ fontWeight: 400, color: 'var(--text-disabled)', fontSize: 12 }}> / {runs.length}</span>
              )}
              <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: 13 }}>
                {' '}registre{displayedRuns.length !== 1 ? 's' : ''}
              </span>
            </span>

            {/* Chips de filtre per estat -- "Tots" mostra tot sense filtre */}
            {['all', 'running', 'completed', 'error', 'cancelled'].map(s => {
              const cfg    = STATUS_CONFIG[s] || { color: 'var(--text-secondary)', label: 'Tots' };
              const active = statusFilter === s;
              const label  = s === 'all' ? 'Tots' : cfg.label;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding:    '3px 10px',
                    borderRadius: 20,
                    // Vora de color quan actiu, neutral quan no
                    border:     `1px solid ${active ? (s === 'all' ? 'var(--border)' : cfg.color + '60') : 'var(--border)'}`,
                    // Fons amb 15% d'opacitat del color de l'estat quan actiu
                    background: active ? (s === 'all' ? 'var(--bg-hover)' : cfg.color + '15') : 'transparent',
                    color:      active && s !== 'all' ? cfg.color : 'var(--text-secondary)',
                    fontSize:   11,
                    fontWeight: active ? 700 : 500,
                    cursor:     'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Camp de cerca: cerca sobre nom, protocol, arquitectura, estat */}
            <div style={{
              display:    'flex',
              alignItems: 'center',
              gap:        5,
              background: 'var(--bg-subtle)',
              // Vora blava quan hi ha text de cerca per indicar filtre actiu
              border:     `1px solid ${search ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 7,
              padding:    '4px 10px',
              minWidth:   180,
              transition: 'border-color 0.15s',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={search ? 'var(--accent)' : 'var(--text-disabled)'}
                strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Cerca per nom, protocol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font)', width: '100%' }}
              />
              {/* Boto X per netejar cerca rapidament */}
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, fontSize: 16, lineHeight: 1 }}
                >
                  x
                </button>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>Clica per copiar ID</span>
          </div>
        </div>

        {/* ── Contingut de la taula: loading / buit / dades ── */}
        {loading ? (
          // Skeleton loader: 6 files amb 6 columnes de widths variables
          // Simula el layout de la taula real mentre carrega
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {[18, 32, 20, 18, 22, 30].map((w, j) => (
                    <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      {/* animationDelay escalonat per a efecte de cascada visual */}
                      <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${i * 0.07}s` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

        ) : runs.length === 0 ? (
          // Estat buit: no hi ha cap run registrat (o s'ha reiniciat el pod)
          <div style={{ padding: '60px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <EmptyIcon />
            <p style={{ color: 'var(--text-disabled)', margin: 0, fontSize: 14 }}>No hi ha execucions registrades.</p>
          </div>

        ) : (
          // Taula de dades amb overflow X per pantalles estretes
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={S.tableHeader}>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Nom escenari</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Arquitectura</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Protocol</th>
                  <th style={{ ...S.th, textAlign: 'center' }}>Estat</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Iniciat</th>
                </tr>
              </thead>
              <tbody>
                {displayedRuns.length === 0 ? (
                  // Cap resultat despres del filtratge (distint de llista buida)
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-disabled)', margin: 0, fontSize: 13 }}>
                        Cap resultat per als filtres actuals.
                      </p>
                    </td>
                  </tr>
                ) : displayedRuns.map((r, i) => {
                  const st        = STATUS_CONFIG[r.status] || { color: '#94a3b8', bg: 'transparent', label: r.status };
                  // isActive: el run esta ara en execucio o pendent de comecar
                  const isActive  = r.status === 'running' || r.status === 'pending';
                  const archColor = ARCHITECTURE_COLORS[r.architecture] || 'var(--text-secondary)';
                  const protColor = PROTOCOL_COLORS[r.protocol]         || 'var(--text-secondary)';

                  return (
                    <tr
                      key={r.id || i}
                      style={{
                        ...S.tableRow,
                        // Highlight de la fila amb hover
                        background: hovered === i ? 'var(--bg-hover)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      // Clic: copia l'ID complet al portapapers
                      // Util per refer cerques a Elasticsearch o per identificar pods
                      onClick={() => {
                        if (r.id) { navigator.clipboard?.writeText(r.id).catch(() => {}); }
                      }}
                      title={r.id ? `Copia ID: ${r.id}` : undefined}
                    >
                      {/* ID truncat: nomes els primers 8 caracters (suficient per identificar) */}
                      <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-disabled)' }}>
                        {r.id ? r.id.slice(0, 8) + '...' : '-'}
                      </td>

                      {/* Nom de l'escenari amb punt viu si esta actiu */}
                      <td style={{ ...S.td, fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {isActive && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: '#3b82f6',
                              flexShrink: 0,
                              // pulseDot: animacio definida a theme.ts
                              animation: 'pulseDot 1.5s ease infinite',
                            }} />
                          )}
                          {r.scenarioName || r.scenarioId || '-'}
                        </div>
                      </td>

                      {/* Badge d'arquitectura amb color identificatiu */}
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {r.architecture
                          ? <span style={{ ...S.badge(archColor), fontSize: 10 }}>{r.architecture}</span>
                          : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>

                      {/* Badge de protocol amb color identificatiu */}
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        {r.protocol
                          ? <span style={{ ...S.badge(protColor), fontSize: 10 }}>{r.protocol}</span>
                          : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>

                      {/* Badge d'estat: pill de color + punt animat si actiu */}
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <span style={{
                          background: st.bg,
                          color:      st.color,
                          padding:    '3px 10px',
                          borderRadius: 20,
                          fontSize:   11,
                          fontWeight: 700,
                          display:    'inline-flex',
                          alignItems: 'center',
                          gap:        4,
                        }}>
                          {isActive && (
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'pulseDot 1.5s ease infinite' }} />
                          )}
                          {st.label}
                        </span>
                      </td>

                      {/* Timestamp d'inici en font mono, alineat a la dreta */}
                      <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {formatTime(r.startedAt || r.createdAt || '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunsPage;
