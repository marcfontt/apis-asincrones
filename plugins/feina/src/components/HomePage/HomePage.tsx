
import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

// ── Icons ──────────────────────────────────────────────────────────────────────
const IconArrow     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconCatalog   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const IconScenarios = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconRun       = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IconResults   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/></svg>;
const IconKafka     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="4" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="20" cy="20" r="2"/><line x1="12" y1="6" x2="5" y2="18"/><line x1="12" y1="6" x2="19" y2="18"/></svg>;
const IconCloud     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
const IconZap       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconLayers    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconAKS       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l4.8 4.8"/></svg>;
const IconMetric    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const IconCheck     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconChevron   = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease' }}><polyline points="6 9 12 15 18 9"/></svg>;
const IconInfo      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;

// ── Page data ─────────────────────────────────────────────────────────────────
const PAGES = [
  { href: '/catalog',    label: 'Catàleg',    desc: 'Arquitectures, protocols i plataformes disponibles.', Icon: IconCatalog,   color: '#3b82f6', badge: '3 categories' },
  { href: '/escenaris',  label: 'Escenaris',  desc: 'Crea combinacions de benchmark amb durada, ràtio i payload.', Icon: IconScenarios, color: '#8b5cf6', badge: 'YAML + UI'   },
  { href: '/execucions', label: 'Execucions', desc: 'Llança escenaris contra AKS i monitoritza en temps real.', Icon: IconRun,       color: '#22c55e', badge: 'AKS live'   },
  { href: '/resultats',  label: 'Resultats',  desc: "Compara latència, throughput i errors entre escenaris.", Icon: IconResults,   color: '#f59e0b', badge: 'Multi-factor' },
];

const FEATURES = [
  { Icon: IconKafka,  title: 'Brokers reals',           desc: 'Kafka, RabbitMQ, NATS Server i Confluent sobre AKS.', color: '#ef4444' },
  { Icon: IconCloud,  title: 'Desplegament automàtic',  desc: 'Escenaris convertits en Kubernetes Jobs i llançats al clúster.', color: '#3b82f6' },
  { Icon: IconMetric, title: 'Mètriques en temps real', desc: "Latència, throughput i errors recollits i mostrats en directe.", color: '#22c55e' },
  { Icon: IconZap,    title: 'Puntuació format-aware',  desc: 'Score 0-100 que pondra P99, throughput, errors, latència i P50.', color: '#f59e0b' },
  { Icon: IconLayers, title: '5 arquitectures',         desc: 'EDA, QBA, LCA, EMA i SEA com a patrons de messaging.', color: '#8b5cf6' },
  { Icon: IconAKS,    title: 'Azure Kubernetes Service',desc: 'Infraestructura escalable al núvol Azure amb namespaces aïllats.', color: '#06b6d4' },
];

const GETTING_STARTED = [
  { step: 1, label: 'Explora el catàleg',   desc: 'Descobreix arquitectures, protocols i plataformes.',      href: '/catalog',    color: '#3b82f6', Icon: IconCatalog   },
  { step: 2, label: 'Crea un escenari',     desc: 'Combina broker, protocol i configuració de test.',        href: '/escenaris',  color: '#8b5cf6', Icon: IconScenarios },
  { step: 3, label: 'Executa el benchmark', desc: 'Llança el Job a AKS i monitoritza en temps real.',        href: '/execucions', color: '#22c55e', Icon: IconRun       },
  { step: 4, label: 'Analitza resultats',   desc: "Compara escenaris per latència, throughput i errors.",    href: '/resultats',  color: '#f59e0b', Icon: IconResults   },
];

const CATALOG_CATEGORIES = [
  { label: 'Arquitectures', color: '#3b82f6', items: ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'] },
  { label: 'Protocols',     color: '#22c55e', items: ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'NATS'] },
  { label: 'Plataformes',   color: '#f59e0b', items: ['Confluent', 'RabbitMQ', 'EMQX', 'NATS'] },
];

const ONBOARDING_STEPS = [
  { Icon: IconCatalog,   color: '#3b82f6', title: 'Revisa el catàleg',  desc: "Consulta arquitectures (EDA, QBA, LCA...), protocols (Kafka, MQTT, gRPC...) i plataformes disponibles." },
  { Icon: IconScenarios, color: '#8b5cf6', title: 'Defineix un escenari', desc: 'Combina plataforma, protocol i arquitectura. Configura durada, ràtio i payload. Tria mode indefinit per proves llargues.' },
  { Icon: IconRun,       color: '#22c55e', title: 'Llança el benchmark', desc: "El sistema desplega un Job a AKS. Des d'Execucions pots seguir l'estat en temps real i aturar quan vulguis." },
  { Icon: IconResults,   color: '#f59e0b', title: 'Compara resultats',  desc: "A Resultats veus mètriques en directe (latència, throughput, errors). Compara escenaris amb puntuació multi-factor." },
];

// ── Onboarding Guide ──────────────────────────────────────────────────────────
const OnboardingGuide = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...S.card, marginBottom: 20, borderLeft: '3px solid var(--accent)', padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '15px 22px', fontFamily: 'var(--font)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--accent)' }}><IconInfo /></span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Com funciona la plataforma</span>
          <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>4 passos</span>
        </div>
        <IconChevron open={open} />
      </button>
      {open && (
        <div style={{ padding: '0 22px 18px', borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Plataforma per comparar arquitectures d'APIs asíncrones desplegades sobre Azure Kubernetes Service.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {ONBOARDING_STEPS.map((step, i) => (
              <div key={i} style={{ padding: 14, background: 'var(--bg-subtle)', borderRadius: 10, border: `1px solid ${step.color}20`, position: 'relative' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: step.color + '14', color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <step.Icon />
                </div>
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 11, fontWeight: 800, color: step.color + '40', fontFamily: 'var(--font-mono)' }}>0{i + 1}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{step.title}</div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── HomePage ──────────────────────────────────────────────────────────────────
export const HomePage = () => {
  const [hovCard,   setHovCard]   = useState<number | null>(null);
  const [hovFeat,   setHovFeat]   = useState<number | null>(null);
  const [hovHero,   setHovHero]   = useState<number | null>(null);
  const [hovFooter, setHovFooter] = useState<string | null>(null);
  const [hovStep,   setHovStep]   = useState<number | null>(null);
  const [visible,   setVisible]   = useState(false);

  useEffect(() => {
    document.title = 'Home | APIs Asíncrones';
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  const fade = (delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(10px)',
    transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
  });

  return (
    <div style={{ ...S.page, maxWidth: 1200, paddingBottom: 56 }}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Hero ── */}
      <div style={{
        ...fade(0),
        position: 'relative', overflow: 'hidden', borderRadius: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        padding: '48px 52px', marginBottom: 20,
      }}>
        {/* Subtle background accents */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', animation: 'heroGlow 7s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', animation: 'heroGlow 7s ease-in-out infinite 3.5s' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.35) 40%, rgba(59,130,246,0.25) 60%, transparent)' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 680 }}>
          {/* Status badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.08)', color: '#22c55e', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' as const, border: '1px solid rgba(34,197,94,0.22)', marginBottom: 18 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s ease infinite' }} />
            Plataforma de Benchmark · AKS Live
          </div>

          <h1 style={{ margin: '0 0 14px', fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            APIs Asíncrones<br />
            <span style={{ color: '#22c55e' }}>Benchmark Platform</span>
          </h1>

          <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 540 }}>
            Compara arquitectures event-driven sobre Azure Kubernetes Service. Defineix escenaris, executa benchmarks i analitza P50, P99, throughput i latència en temps real.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            {[
              { label: 'Crear escenari',  href: '/escenaris', primary: true  },
              { label: 'Veure catàleg',   href: '/catalog',   primary: false },
              { label: 'Veure resultats', href: '/resultats', primary: false },
            ].map((btn, i) => (
              <a key={i} href={btn.href}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 7, fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', cursor: 'pointer',
                  border: btn.primary ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border)',
                  background: btn.primary ? '#22c55e' : 'var(--bg-card)',
                  color: btn.primary ? '#020617' : 'var(--text-secondary)',
                  boxShadow: btn.primary ? '0 2px 12px rgba(34,197,94,0.25)' : 'none',
                  transition: 'all 0.18s ease',
                  opacity: hovHero === i && !btn.primary ? 0.8 : 1,
                  transform: hovHero === i ? 'translateY(-1px)' : 'none',
                }}
                onMouseEnter={() => setHovHero(i)}
                onMouseLeave={() => setHovHero(null)}
              >
                {btn.label} {btn.primary && <IconArrow />}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Onboarding ── */}
      <div style={fade(40)}><OnboardingGuide /></div>

      {/* ── Quick access cards ── */}
      <div style={{ ...fade(100), display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {PAGES.map((page, i) => {
          const hov = hovCard === i;
          return (
            <a key={i} href={page.href}
              className="card-hover"
              style={{
                ...S.card, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 10,
                cursor: 'pointer', padding: 18,
                borderTop: `3px solid ${page.color}`,
                border: `1px solid ${hov ? page.color + '50' : 'var(--border)'}`,
                borderTopColor: page.color,
                background: hov ? `linear-gradient(160deg, var(--bg-card), ${page.color}08)` : 'var(--bg-card)',
                transform: hov ? 'translateY(-3px)' : 'none',
                boxShadow: hov ? `0 10px 24px ${page.color}18` : 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={() => setHovCard(i)}
              onMouseLeave={() => setHovCard(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: page.color + '14', color: page.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <page.Icon />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: page.color + '12', color: page.color, border: `1px solid ${page.color}20` }}>{page.badge}</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{page.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{page.desc}</div>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: hov ? page.color : 'var(--text-disabled)', transition: 'color 0.15s' }}>
                Obrir <IconArrow />
              </div>
            </a>
          );
        })}
      </div>

      {/* ── Getting started ── */}
      <div style={{ ...fade(180), ...S.card, marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 20 }}>Com començar</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 21, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg, #3b82f660, #8b5cf660, #22c55e60, #f59e0b60)', zIndex: 0 }} />
          {GETTING_STARTED.map((step, i) => {
            const hov = hovStep === i;
            return (
              <a key={i} href={step.href}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 14px', textAlign: 'center', position: 'relative', zIndex: 1, transition: 'transform 0.18s ease', transform: hov ? 'translateY(-2px)' : 'none' }}
                onMouseEnter={() => setHovStep(i)}
                onMouseLeave={() => setHovStep(null)}
              >
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: hov ? step.color : 'var(--bg-card)', border: `2px solid ${hov ? step.color : step.color + '65'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: hov ? '#fff' : step.color, fontWeight: 800, fontSize: 15, transition: 'all 0.2s ease', boxShadow: hov ? `0 4px 14px ${step.color}40` : 'none' }}>
                  {hov ? <IconCheck /> : step.step}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: hov ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 5, transition: 'color 0.15s' }}>{step.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{step.desc}</div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Catalog preview + Capacitats ── */}
      <div style={{ ...fade(240), display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>Catàleg ràpid</div>
          {CATALOG_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: cat.color, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>{cat.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {cat.items.map(item => (<span key={item} style={{ ...S.badge(cat.color), fontSize: 10 }}>{item}</span>))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <a href="/catalog" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Veure catàleg complet <IconArrow />
            </a>
          </div>
        </div>

        <div style={{ ...S.card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 14 }}>Capacitats de la plataforma</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FEATURES.map((f, i) => {
              const hov = hovFeat === i;
              return (
                <div key={i} style={{ padding: 12, borderRadius: 9, border: `1px solid ${hov ? f.color + '45' : 'var(--border)'}`, background: hov ? f.color + '0a' : 'var(--bg-subtle)', transition: 'all 0.17s ease', cursor: 'default' }}
                  onMouseEnter={() => setHovFeat(i)} onMouseLeave={() => setHovFeat(null)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ color: hov ? f.color : 'var(--text-secondary)', transition: 'color 0.15s', display: 'flex' }}><f.Icon /></span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer nav ── */}
      <div style={{ ...fade(320), ...S.card, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' as const, gap: 6, padding: '12px 20px' }}>
        {[
          { label: 'Catàleg',      href: '/catalog'    },
          { label: 'Escenaris',    href: '/escenaris'  },
          { label: 'Execucions',   href: '/execucions' },
          { label: 'Resultats',    href: '/resultats'  },
          { label: 'Configuració', href: '/settings'   },
        ].map(link => (
          <a key={link.href} href={link.href}
            style={{ fontSize: 12, fontWeight: 600, color: hovFooter === link.href ? 'var(--accent)' : 'var(--text-disabled)', textDecoration: 'none', padding: '4px 8px', borderRadius: 5, border: `1px solid ${hovFooter === link.href ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s ease' }}
            onMouseEnter={() => setHovFooter(link.href)}
            onMouseLeave={() => setHovFooter(null)}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
};
