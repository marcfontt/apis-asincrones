

import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconArrow     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconCatalog   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const IconScenarios = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconRun       = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IconResults   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>;
const IconKafka     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><line x1="12" y1="6" x2="5" y2="18"/><line x1="12" y1="6" x2="19" y2="18"/></svg>;
const IconCloud     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
const IconZap       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconLayers    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconAKS       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l4.8 4.8"/></svg>;
const IconMetric    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;

// ── Page sections data ─────────────────────────────────────────────────────────
const PAGES = [
  {
    href:    '/catalog',
    label:   'Catàleg',
    desc:    'Arquitectures, protocols, plataformes i gateways disponibles per combinar.',
    Icon:    IconCatalog,
    color:   '#2563eb',
    badge:   '4 categories',
  },
  {
    href:    '/escenaris',
    label:   'Escenaris',
    desc:    'Crea i gestiona combinacions de benchmark. Configura durada, ràtio i payload.',
    Icon:    IconScenarios,
    color:   '#8b5cf6',
    badge:   'YAML + UI',
  },
  {
    href:    '/execucions',
    label:   'Execucions',
    desc:    'Llança escenaris contra AKS i monitoritza el progrés en temps real.',
    Icon:    IconRun,
    color:   '#16a34a',
    badge:   'AKS live',
  },
  {
    href:    '/resultats',
    label:   'Resultats',
    desc:    'Compara latència, throughput i taxa d\'error entre múltiples escenaris.',
    Icon:    IconResults,
    color:   '#f59e0b',
    badge:   'Multi-factor',
  },
];

const FEATURES = [
  { Icon: IconKafka,  title: 'Brokers reals',         desc: 'Kafka, RabbitMQ, NATS Server i Confluent desplegats sobre AKS.' },
  { Icon: IconCloud,  title: 'Desplegament automàtic', desc: 'Escenaris es converteixen en Kubernetes manifests i es llancen al clúster.' },
  { Icon: IconMetric, title: 'Mètriques en temps real', desc: 'Latència, throughput i errors recollits per l\'agent de mètriques.' },
  { Icon: IconZap,    title: 'Comparativa multi-factor', desc: 'El guanyador es calcula ponderant latència (40%), throughput (35%) i errors (25%).' },
  { Icon: IconLayers, title: '5 arquitectures',        desc: 'EDA, QBA, LCA, EMA i SEA implementades com a patrons de messaging.' },
  { Icon: IconAKS,    title: 'Azure Kubernetes Service', desc: 'Infraestructura escalable al núvol Azure amb namespaces aïllats per escenari.' },
];

const PROTOCOLS = [
  { name: 'Kafka',  color: '#ef4444' },
  { name: 'AMQP',   color: '#f97316' },
  { name: 'MQTT',   color: '#eab308' },
  { name: 'gRPC',   color: '#8b5cf6' },
  { name: 'WS',     color: '#3b82f6' },
  { name: 'SSE',    color: '#06b6d4' },
  { name: 'NATS',   color: '#22c55e' },
  { name: 'CoAP',   color: '#10b981' },
];

const ARCHS = [
  { name: 'EDA', color: '#2563eb', full: 'Event-Driven Architecture' },
  { name: 'QBA', color: '#9333ea', full: 'Queue-Based Architecture' },
  { name: 'LCA', color: '#16a34a', full: 'Low-Coupling Architecture' },
  { name: 'EMA', color: '#dc2626', full: 'Event Mesh Architecture' },
  { name: 'SEA', color: '#d97706', full: 'Streaming-Event Architecture' },
];

// ── HomePage ───────────────────────────────────────────────────────────────────
export const HomePage = () => {
  const [hoveredCard,  setHoveredCard]  = useState<number | null>(null);
  const [hoveredFeat,  setHoveredFeat]  = useState<number | null>(null);
  const [hoveredHero,  setHoveredHero]  = useState<number | null>(null);
  const [hoveredFooter,setHoveredFooter]= useState<string | null>(null);

  useEffect(() => { document.title = 'Home | APIs Asíncrones'; }, []);

  return (
    <div style={{ ...S.page, maxWidth: 1200, paddingBottom: 56 }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Hero ── */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: '52px 48px',
        marginBottom: 32,
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Glow decoració */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          animation: 'heroGlow 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 240, height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          animation: 'heroGlow 4s ease-in-out infinite 2s',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 20,
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent)',
            fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            Developer Portal · TFG
          </div>

          <h1 style={{
            margin: '0 0 12px',
            fontSize: 38,
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            maxWidth: 600,
          }}>
            APIs Asíncrones<br />
            <span style={{ color: 'var(--accent)' }}>Benchmark Platform</span>
          </h1>

          <p style={{
            margin: '0 0 32px',
            fontSize: 16,
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            maxWidth: 560,
          }}>
            Plataforma per comparar arquitectures event-driven desplegades sobre Azure Kubernetes Service.
            Defineix escenaris, executa benchmarks i analitza mètriques en temps real.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Crear escenari',    href: '/escenaris',   primary: true  },
              { label: 'Veure catàleg',     href: '/catalog',     primary: false },
              { label: 'Veure resultats',   href: '/resultats',   primary: false },
            ].map((btn, i) => (
              <a
                key={i}
                href={btn.href}
                style={{
                  ...(btn.primary ? S.btnPrimary : S.btn),
                  textDecoration: 'none',
                  opacity:    hoveredHero === i ? 0.88 : 1,
                  transform:  hoveredHero === i ? 'translateY(-1px)' : 'translateY(0)',
                  boxShadow:  hoveredHero === i
                    ? (btn.primary ? '0 4px 12px rgba(37,99,235,0.3)' : 'var(--shadow-md)')
                    : (btn.primary ? S.btnPrimary.boxShadow : 'none'),
                  padding: '9px 20px',
                  fontSize: 14,
                }}
                onMouseEnter={() => setHoveredHero(i)}
                onMouseLeave={() => setHoveredHero(null)}
              >
                {btn.label} {btn.primary && <IconArrow />}
              </a>
            ))}
          </div>

          {/* Protocol pills */}
          <div style={{ marginTop: 32, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Protocols:</span>
            {PROTOCOLS.map(p => (
              <span key={p.name} style={{ ...S.badge(p.color), fontSize: 10 }}>{p.name}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick access cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {PAGES.map((page, i) => {
          const isHov = hoveredCard === i;
          return (
            <a
              key={i}
              href={page.href}
              style={{
                ...S.card,
                textDecoration: 'none',
                display:       'flex',
                flexDirection: 'column',
                gap:           12,
                cursor:        'pointer',
                transition:    'all 0.18s ease',
                transform:     isHov ? 'translateY(-3px)' : 'none',
                boxShadow:     isHov ? `0 8px 24px ${page.color}22` : 'var(--shadow-sm)',
                border:        `1px solid ${isHov ? page.color + '50' : 'var(--border)'}`,
                borderTop:     `3px solid ${page.color}`,
                padding:       20,
              }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: page.color + '14',
                  color:      page.color,
                  display:    'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <page.Icon />
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: page.color + '12', color: page.color,
                  border: `1px solid ${page.color}25`,
                }}>
                  {page.badge}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {page.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {page.desc}
                </div>
              </div>

              <div style={{
                marginTop: 'auto',
                display:   'flex', alignItems: 'center', gap: 4,
                fontSize:  12, fontWeight: 600,
                color:     isHov ? page.color : 'var(--text-disabled)',
                transition: 'color 0.15s ease',
              }}>
                Obrir <IconArrow />
              </div>
            </a>
          );
        })}
      </div>

      {/* ── Architecture badges + Features in two columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 32 }}>

        {/* Left: Architectures */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Arquitectures
          </div>
          {ARCHS.map(a => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                ...S.badge(a.color),
                fontSize: 12, minWidth: 42, justifyContent: 'center',
              }}>
                {a.name}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.full}</span>
            </div>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <a href="/catalog" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Veure catàleg complet <IconArrow />
            </a>
          </div>
        </div>

        {/* Right: Feature grid */}
        <div style={{ ...S.card }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Capacitats de la plataforma
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {FEATURES.map((f, i) => {
              const isHov = hoveredFeat === i;
              return (
                <div
                  key={i}
                  style={{
                    padding:     14,
                    borderRadius: 9,
                    border:      `1px solid ${isHov ? 'var(--accent)' : 'var(--border)'}`,
                    background:  isHov ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                    transition:  'all 0.15s ease',
                    cursor:      'default',
                  }}
                  onMouseEnter={() => setHoveredFeat(i)}
                  onMouseLeave={() => setHoveredFeat(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: isHov ? 'var(--accent)' : 'var(--text-secondary)', transition: 'color 0.15s ease' }}>
                      <f.Icon />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div style={{
        ...S.card,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        flexWrap:       'wrap',
        gap:            12,
        padding:        '16px 24px',
      }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          APIs Asíncrones · Treball de Fi de Grau
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Catàleg',     href: '/catalog'    },
            { label: 'Escenaris',   href: '/escenaris'  },
            { label: 'Execucions',  href: '/execucions' },
            { label: 'Resultats',   href: '/resultats'  },
            { label: 'Configuració',href: '/settings'   },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize:       12,
                fontWeight:     600,
                color:          hoveredFooter === link.href ? 'var(--accent)' : 'var(--text-disabled)',
                textDecoration: 'none',
                padding:        '4px 8px',
                borderRadius:   5,
                border:         `1px solid ${hoveredFooter === link.href ? 'var(--accent)' : 'transparent'}`,
                transition:     'all 0.15s ease',
              }}
              onMouseEnter={() => setHoveredFooter(link.href)}
              onMouseLeave={() => setHoveredFooter(null)}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
