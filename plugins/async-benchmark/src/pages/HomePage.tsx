/**
 * HomePage.tsx — Pagina d'inici del plugin AsyncBench
 *
 * Es la primera pantalla que veu l'usuari. Conte:
 *  - Hero: presentacio de la plataforma amb els CTAs principals
 *  - Guia d'onboarding: explicacio de 4 passos (col·lapsable)
 *  - Targetes d'acces rapid: Cataleg, Escenaris, Execucions, Resultats
 *  - Passos "Com comecar": sequencia visual pas a pas
 *  - Cataleg rapid + Capacitats de la plataforma
 *  - Navegacio de peu de pagina
 *
 * Canvis respecte versio anterior:
 *  - Font: ara usa IBM Plex Sans (via theme.ts) en comptes d'Arial
 *  - Comentaris complets a cada seccio i funcio
 *  - Animacio fadeUp (opacity + translateY) per a cada seccio en carregar
 *  - Hero mes net: gradient de fons subtil sense efectes excessius
 *  - Targetes amb hover lift (translateY -3px) per millor feedback
 */

import { useEffect, useRef, useState } from 'react';
import { S, GLOBAL_CSS } from '../theme';
import { EDUCATION } from '../shared/content/education';

// ── Microinteraccions reutilitzables ─────────────────────────────────────────

/** Respecta la preferencia de l'usuari per reduir el moviment (accessibilitat). */
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(m.matches);
    sync();
    m.addEventListener('change', sync);
    return () => m.removeEventListener('change', sync);
  }, []);
  return reduced;
};

/** Rotador tipus typewriter: cicla paraules escrivint i esborrant lletra a lletra. */
const Typewriter = ({ words, color }: { words: string[]; color: string }) => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(reduced ? words[0] : '');
  const [phase, setPhase] = useState<'typing' | 'holding' | 'deleting'>('typing');

  useEffect(() => {
    if (reduced) { setText(words[index]); return undefined; }
    const current = words[index % words.length];
    let timer: number;
    if (phase === 'typing') {
      if (text.length < current.length) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length + 1)), 70);
      } else {
        timer = window.setTimeout(() => setPhase('holding'), 900);
      }
    } else if (phase === 'holding') {
      timer = window.setTimeout(() => setPhase('deleting'), 400);
    } else {
      if (text.length > 0) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length - 1)), 35);
      } else {
        setIndex(i => (i + 1) % words.length);
        setPhase('typing');
        return undefined;
      }
    }
    return () => window.clearTimeout(timer);
  }, [phase, text, index, words, reduced]);

  return (
    <span style={{ color, fontWeight: 800, display: 'inline-flex', alignItems: 'baseline' }}>
      <span>{text}</span>
      {!reduced && <span aria-hidden="true" style={{ display: 'inline-block', width: 3, height: '0.9em', marginLeft: 4, background: color, animation: 'asyncbench-caret 1s steps(2) infinite', verticalAlign: 'baseline' }} />}
    </span>
  );
};

/** Comptador numeric animat: anima de 0 fins al valor objectiu amb easing. */
const StreamingNumber = ({ value, duration = 900 }: { value: number; duration?: number }) => {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const prev = useRef(0);

  useEffect(() => {
    if (reduced) { setDisplay(value); return undefined; }
    const start = prev.current;
    const delta = value - start;
    if (delta === 0) { setDisplay(value); return undefined; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduced]);

  return <>{display.toLocaleString('ca-ES')}</>;
};

const CATALOG_BASE = '/api/proxy/catalog-service';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';
const METRICS_BASE = '/api/proxy/metrics-api';

// ── Icones SVG en linia ───────────────────────────────────────────────────────
// Usem SVG en linia per no dependre de cap llibreria d'icones externa.
// Cada icona es un functional component que retorna un <svg>.
// mida: 13-20px segons el context d'us.

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
const IconInfo      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;

// IconChevron: icona de fletxa que rota 180deg quan open=true (per al toggle de l'onboarding)
const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease' }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ── Dades de navegacio principal ──────────────────────────────────────────────
// Cada entrada es una targeta d'acces rapid a les 4 seccions de l'app.
// color: color identificatiu de la seccio (usat al top-border i icon background)
// badge: text petit que descriu breument la seccio
const PAGES = [
  { href: '/catalog',    label: 'Catàleg',    desc: 'Arquitectures, protocols i plataformes disponibles.',           Icon: IconCatalog,   color: '#3b82f6', badge: '3 categories' },
  { href: '/escenaris',  label: 'Escenaris',  desc: 'Crea combinacions de benchmark amb durada, ràtio i payload.',   Icon: IconScenarios, color: '#8b5cf6', badge: 'YAML + UI'   },
  { href: '/execucions', label: 'Execucions', desc: 'Llança escenaris contra AKS i monitoritza en temps real.',      Icon: IconRun,       color: '#22c55e', badge: 'AKS live'   },
  { href: '/resultats',  label: 'Resultats',  desc: 'Compara latència, throughput i errors entre escenaris.',        Icon: IconResults,   color: '#f59e0b', badge: 'Multi-factor' },
];

// ── Capacitats de la plataforma (grid 2x3) ────────────────────────────────────
const FEATURES = [
  { Icon: IconKafka,  title: 'Brokers reals',           desc: 'Kafka, RabbitMQ, NATS Server i Confluent sobre AKS.',          color: '#ef4444' },
  { Icon: IconCloud,  title: 'Desplegament automàtic',  desc: 'Escenaris convertits en Kubernetes Jobs i llançats al clúster.', color: '#3b82f6' },
  { Icon: IconMetric, title: 'Mètriques en temps real', desc: 'Latència, throughput i errors recollits i mostrats en directe.', color: '#22c55e' },
  { Icon: IconZap,    title: 'Puntuació format-aware',  desc: 'Score 0–100 que pondera P99, throughput, errors i latència.',   color: '#f59e0b' },
  { Icon: IconLayers, title: '5 arquitectures',         desc: 'EDA, QBA, LCA, EMA i SEA com a patrons de messaging.',          color: '#8b5cf6' },
  { Icon: IconAKS,    title: 'Azure Kubernetes Service',desc: 'Infraestructura escalable al nucli Azure amb namespaces aillats.',color: '#06b6d4' },
];

// ── Sequencia "Com comecar" (4 passos lineals) ────────────────────────────────
// Es mostra amb una linia connectors per indicar ordre sequencial
const GETTING_STARTED = [
  { step: 1, label: 'Explora el catàleg',   desc: 'Descobreix arquitectures, protocols i plataformes.',     href: '/catalog',    color: '#3b82f6', Icon: IconCatalog   },
  { step: 2, label: 'Crea un escenari',     desc: 'Combina broker, protocol i configuració de test.',       href: '/escenaris',  color: '#8b5cf6', Icon: IconScenarios },
  { step: 3, label: 'Executa el benchmark', desc: 'Llança el Job a AKS i monitoritza en temps real.',       href: '/execucions', color: '#22c55e', Icon: IconRun       },
  { step: 4, label: 'Analitza resultats',   desc: 'Compara escenaris per latència, throughput i errors.',   href: '/resultats',  color: '#f59e0b', Icon: IconResults   },
];

// ── Preview del cataleg (categories i elements) ───────────────────────────────
const CATALOG_CATEGORIES = [
  { label: 'Arquitectures', color: '#3b82f6', items: ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'] },
  { label: 'Protocols',     color: '#22c55e', items: ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'NATS'] },
  { label: 'Plataformes',   color: '#f59e0b', items: ['Confluent', 'RabbitMQ', 'EMQX', 'NATS'] },
];

// ── Contingut de la guia d'onboarding (col·lapsable) ──────────────────────────
const ONBOARDING_STEPS = [
  { Icon: IconCatalog,   color: '#3b82f6', title: 'Revisa el catàleg',    desc: 'Consulta arquitectures (EDA, QBA, LCA…), protocols (Kafka, MQTT, gRPC…) i plataformes disponibles.' },
  { Icon: IconScenarios, color: '#8b5cf6', title: 'Defineix un escenari', desc: 'Combina plataforma, protocol i arquitectura. Configura durada, ràtio i payload. Tria mode indefinit per proves llargues.' },
  { Icon: IconRun,       color: '#22c55e', title: 'Llança el benchmark',  desc: "El sistema desplega un Job a AKS. Des d'Execucions pots seguir l'estat en temps real i aturar quan vulguis." },
  { Icon: IconResults,   color: '#f59e0b', title: 'Compara resultats',    desc: 'A Resultats veus mètriques en directe (latència, throughput, errors). Compara escenaris amb puntuació multi-factor.' },
];

// ── OnboardingGuide: panell col·lapsable amb els 4 passos de la plataforma ────
// S'amaga per defecte i l'usuari pot obrir-lo fent clic.
// Util per a nous usuaris que no coneixen la plataforma.
const OnboardingGuide = () => {
  // open: controla si el panell esta desplegat o plegat
  const [open, setOpen] = useState(false);

  return (
    <div style={{ ...S.card, marginBottom: 20, borderLeft: '3px solid var(--accent)', padding: 0, overflow: 'hidden' }}>
      {/* Capçalera clicable que obre/tanca el panell */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 20px', fontFamily: 'var(--font)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)' }}><IconInfo /></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Com funciona la plataforma</span>
          <span style={{ fontSize: 10, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 7px', borderRadius: 10 }}>4 passos</span>
        </div>
        <IconChevron open={open} />
      </button>

      {/* Contingut desplegable: grid de 4 targetes, una per pas */}
      {open && (
        <div style={{ padding: '0 20px 18px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Plataforma per comparar arquitectures d'APIs asíncrones desplegades sobre Azure Kubernetes Service.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {ONBOARDING_STEPS.map((step, i) => (
              <div key={i} style={{
                padding: 14, background: 'var(--bg-subtle)', borderRadius: 9,
                border: `1px solid ${step.color}1a`, position: 'relative',
              }}>
                {/* Numero del pas (top-right, molt subtil) */}
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 11, fontWeight: 700, color: step.color + '35', fontFamily: 'var(--font-mono)' }}>
                  0{i + 1}
                </div>
                {/* Icona del pas */}
                <div style={{ width: 30, height: 30, borderRadius: 7, background: step.color + '14', color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <step.Icon />
                </div>
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

// ── HomePage: component principal ─────────────────────────────────────────────
const LearningOverview = () => (
  <div style={{ ...S.card, marginBottom: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18, flexWrap: 'wrap' as const }}>
      <div style={{ maxWidth: 760 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
          {EDUCATION.syncVsAsync.eyebrow}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Entendre el portal abans d'executar res
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {EDUCATION.syncVsAsync.description}
        </div>
      </div>
      <div style={{ minWidth: 220, maxWidth: 260, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>
          Idea clau
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          El portal no serveix només per llançar benchmarks. Serveix per <strong style={{ color: 'var(--text-primary)' }}>aprendre quina combinació d'arquitectura, protocol i plataforma encaixa millor</strong> segons el cas d'ús.
        </div>
      </div>
    </div>

    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 }}>
        {EDUCATION.syncVsAsync.title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {EDUCATION.syncVsAsync.items.map(item => (
          <div key={item.title} style={{ border: `1px solid ${item.accent}26`, background: `linear-gradient(180deg, ${item.accent}0c, var(--bg-card))`, borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 999, background: item.accent + '14', color: item.accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 10 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, marginBottom: 12 }}>
              {item.summary}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {item.bullets.map(bullet => (
                <div key={bullet} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.accent, marginTop: 6, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
        {EDUCATION.asyncFlow.eyebrow}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        {EDUCATION.asyncFlow.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
        {EDUCATION.asyncFlow.description}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {EDUCATION.asyncFlow.steps.map((step, index) => (
          <div key={step.label} style={{ border: '1px solid var(--border)', background: 'var(--bg-surface)', borderRadius: 10, padding: '14px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: step.accent, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                Pas {index + 1}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                0{index + 1}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {step.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {step.description}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
        {EDUCATION.concepts.eyebrow}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        {EDUCATION.concepts.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
        {EDUCATION.concepts.description}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {EDUCATION.concepts.items.map(item => (
          <div key={item.title} style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '14px 12px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.accent, display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const HomePage = () => {
  // Estats de hover per a diverses seccions (per als efectes visuals)
  // Cada un trac quina targeta/element esta en hover per aplicar estils dinamics
  const [hovCard,   setHovCard]   = useState<number | null>(null);   // targetes rapides
  const [hovFeat,   setHovFeat]   = useState<number | null>(null);   // grid de capacitats
  const [hovHero,   setHovHero]   = useState<number | null>(null);   // botons del hero
  const [hovFooter, setHovFooter] = useState<string | null>(null);   // links del footer
  const [hovStep,   setHovStep]   = useState<number | null>(null);   // passos "com comecar"
  const [visible,   setVisible]   = useState(false);                 // per a l'animacio d'entrada
  const [portalStats, setPortalStats] = useState({
    loading: true,
    components: 0,
    scenarios: 0,
    activeRuns: 0,
    historicalScenarios: 0,
    totalMeasures: 0,
  });

  useEffect(() => {
    document.title = 'Home | APIs Asíncrones';
    // Delay curt per activar l'animacio fadeUp just despres del primer render
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPortalStats = async () => {
      try {
        const [componentsRes, scenariosRes, activeRunsRes, summaryRes] = await Promise.all([
          fetch(`${CATALOG_BASE}/components`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${SCENARIOS_BASE}/scenarios`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${ORCHESTRATOR}/runs/active`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${METRICS_BASE}/metrics/summary`).then(r => r.ok ? r.json() : []).catch(() => []),
        ]);

        if (cancelled) return;

        const components = Array.isArray(componentsRes)
          ? componentsRes.filter((c: any) => c.predefined !== false && c.category !== 'gateway').length
          : 0;
        const scenarios = Array.isArray(scenariosRes) ? scenariosRes.length : 0;
        const activeRuns = Array.isArray(activeRunsRes) ? activeRunsRes.length : 0;
        const summary = Array.isArray(summaryRes) ? summaryRes : [];
        const historicalScenarios = new Set(summary.map((s: any) => s.scenarioId).filter(Boolean)).size;
        const totalMeasures = summary.reduce((sum: number, s: any) =>
          sum + (Number(s.pointCount ?? s.measureCount ?? 0) || 0), 0);

        setPortalStats({
          loading: false,
          components,
          scenarios,
          activeRuns,
          historicalScenarios,
          totalMeasures,
        });
      } catch (_) {
        if (!cancelled) setPortalStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadPortalStats();
    const i = setInterval(loadPortalStats, 30000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  // fade: helper que retorna un estil CSS per a l'animacio d'entrada
  // delay: ms d'espera before de comecar la transicio (per a efecte escalonat)
  // Transiciona opacity i translateY de forma combinada
  const fade = (delay = 0): React.CSSProperties => ({
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0)' : 'translateY(8px)',
    transition: `opacity 0.38s ease ${delay}ms, transform 0.38s ease ${delay}ms`,
  });

  return (
    <div style={{ ...S.page, maxWidth: 1200, paddingBottom: 56 }}>
      {/* Injeccio del CSS global (fonts, animacions, tokens) */}
      <style>{GLOBAL_CSS}</style>
      <style>{`
        @keyframes asyncbench-caret { 50% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .asyncbench-pages-grid a { transition: none !important; transform: none !important; }
        }
      `}</style>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      {/* Seccio principal: presenta la plataforma i dona els CTAs clau.
          Usa un gradient de fons subtil per donar profunditat sense ser excessiu. */}
      <div style={{
        ...fade(0),
        position: 'relative', overflow: 'hidden', borderRadius: 12,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        padding: '44px 48px', marginBottom: 18,
      }}>
        {/* Radials de fons: verds i blaus molt subtils, animen amb heroGlow */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)', animation: 'heroGlow 7s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: -70, left: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)', animation: 'heroGlow 7s ease-in-out infinite 3.5s' }} />
          {/* Linia inferior: separador amb gradient de colors */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(34,197,94,0.30) 40%, rgba(59,130,246,0.20) 60%, transparent)' }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 660 }}>
          {/* Badge d'estat: indica que la plataforma esta activa */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(34,197,94,0.07)', color: '#22c55e',
            padding: '3px 11px', borderRadius: 20, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase' as const,
            border: '1px solid rgba(34,197,94,0.20)', marginBottom: 16,
          }}>
            {/* Punt verd que pulsa per indicar activitat en temps real */}
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s ease infinite' }} />
            Plataforma de Benchmark - AKS Live
          </div>

          {/*
            Titol principal demanat per l'usuari:
            "Benchmarks reals sota la mateixa càrrega".
            Hem dividit la frase en dues linies perque pugui anar amb el
            typewriter de plataformes (Kafka, RabbitMQ, NATS...) i alhora
            quedar visualment forta i clara per a un public no expert.
          */}
          <h1 style={{ margin: '0 0 12px', fontSize: 34, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Benchmarks reals{' '}
            <span style={{ color: 'var(--text-primary)' }}>sota la mateixa càrrega</span>
            <br />
            <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>
              comparant{' '}
              <Typewriter words={['Kafka', 'RabbitMQ', 'NATS', 'Confluent', 'gRPC', 'MQTT']} color="#22c55e" />
            </span>
          </h1>

          {/* Descripcio educativa: ara explica que fa la plataforma a algu
              que no en sap res, no nomes a un expert. */}
          <p style={{ margin: '0 0 26px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560 }}>
            Una intranet d'aprenentatge i recerca per descobrir quines combinacions
            d'arquitectura, protocol i plataforma de missatgeria asíncrona es comporten
            millor segons el cas d'us. Defineix l'escenari, llança el benchmark sobre
            Azure Kubernetes Service i compara latencia, throughput i taxa d'error en
            directe.
          </p>

          {/* CTAs: tres botons d'accio */}
          {/* El primer es el primari (verd, prominent), els altres son secundaris */}
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' as const }}>
            {[
              { label: 'Crear escenari',  href: '/escenaris', primary: true  },
              { label: 'Veure catàleg',   href: '/catalog',   primary: false },
              { label: 'Veure resultats', href: '/resultats', primary: false },
            ].map((btn, i) => (
              <a key={i} href={btn.href}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', cursor: 'pointer',
                  border: btn.primary ? '1px solid rgba(34,197,94,0.35)' : '1px solid var(--border)',
                  background:    btn.primary ? '#22c55e' : 'var(--bg-card)',
                  color:         btn.primary ? '#020617' : 'var(--text-secondary)',
                  boxShadow:     btn.primary ? '0 2px 10px rgba(34,197,94,0.22)' : 'none',
                  transition:    'all 0.18s ease',
                  // Hover: el boto s'eleva lleugerament
                  transform:     hovHero === i ? 'translateY(-1px)' : 'none',
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

      {/* ── BASE CONCEPTUAL ──────────────────────────────────────────────────
           Seccio educativa per a tribunal i alumnes que potser no coneixen
           el detall tecnic de les APIs asincrones. Explica de zero:
             - Que es API síncrona vs asíncrona
             - Que es una arquitectura i un protocol
             - Que volem dir per latencia, throughput i taxa d'error
           Volem que la pagina pugui llegir-se sense obrir cap altra peça.
      */}
      <div style={{ ...fade(20), ...S.card, marginBottom: 22, padding: 28 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
            Base conceptual
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Que cal saber abans de mirar els resultats
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 720 }}>
            Aquest portal compara plataformes de missatgeria asíncrona. Si mai
            n'has llegit cap definicio, aquests son els conceptes minims que
            necessites tenir clars per entendre les xifres.
          </p>
        </div>

        {/* ── API síncrona vs asíncrona ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 18 }}>
          <div style={{ padding: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>
              API síncrona
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              El client espera la resposta
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Tu fas una crida (per exemple HTTP), el servidor processa la
              feina i et retorna la resposta. Mentre dura, el codi del
              client esta bloquejat. Es el patro classic de REST.
            </p>
          </div>
          <div style={{ padding: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>
              API asíncrona
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              Missatges que viatgen sense esperar resposta directa
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              El productor publica un missatge en un broker (Kafka, NATS,
              RabbitMQ...) i continua treballant immediatament. Un o mes
              consumidors el llegeixen quan poden. Permet desacoblar
              sistemes i escalar millor sota carregues fortes.
            </p>
          </div>
        </div>

        {/* ── Arquitectura, protocol, plataforma ── */}
        <div style={{ marginTop: 6, padding: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
            Anatomia d'un escenari de benchmark
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Arquitectura</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                El patro general de com flueixen les dades. Per exemple
                <em> Event-Driven </em> (els components reaccionen a
                esdeveniments) o <em>Queue-Based</em> (cua amb consumidors
                competidors).
              </p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Protocol</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                El "llenguatge" tecnic per moure missatges: AMQP per a cues
                tradicionals, MQTT per a IoT, Kafka per a logs particionats,
                NATS per a fire-and-forget, etc.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Plataforma</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                El broker concret que fem servir per executar el protocol:
                Apache Kafka, RabbitMQ, NATS Server, Confluent... Cadascun
                te els seus avantatges segons el cas d'us.
              </p>
            </div>
          </div>
        </div>

        {/*
          Diagrama visual: com viatja un missatge.
          Un esquema SVG curt productor → broker → consumidor amb cua
          intermitja. L'objectiu es que algu que llegeix el portal per
          primer cop entengui en 5 segons que mesurem quan parlem de
          "latencia" (P→B→C) i "throughput" (msgs/s).
        */}
        <div style={{ padding: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>
            Per on viatja un missatge
          </div>
          <svg viewBox="0 0 600 130" width="100%" style={{ maxWidth: 720, display: 'block', margin: '0 auto' }} role="img" aria-label="Diagrama de flux: productor envia un missatge al broker, que el lliura al consumidor.">
            {/* Productor */}
            <rect x="10" y="40" width="120" height="50" rx="8" fill="#3b82f6" opacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
            <text x="70" y="65" textAnchor="middle" fontSize="13" fontWeight="700" fill="#3b82f6">Productor</text>
            <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#3b82f6" opacity="0.9">load-generator</text>

            {/* Fletxa productor → broker */}
            <line x1="135" y1="65" x2="225" y2="65" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" />
            <polygon points="225,60 235,65 225,70" fill="#22c55e" />
            <text x="180" y="55" textAnchor="middle" fontSize="10" fill="var(--text-secondary)">publish</text>

            {/* Broker */}
            <rect x="240" y="25" width="120" height="80" rx="10" fill="#22c55e" opacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
            <text x="300" y="55" textAnchor="middle" fontSize="13" fontWeight="700" fill="#22c55e">Broker</text>
            <text x="300" y="72" textAnchor="middle" fontSize="10" fill="#22c55e" opacity="0.9">Kafka / RabbitMQ /</text>
            <text x="300" y="86" textAnchor="middle" fontSize="10" fill="#22c55e" opacity="0.9">NATS / Confluent</text>

            {/* Cua / topic visual */}
            <g>
              <rect x="252" y="93" width="6" height="6" rx="1" fill="#22c55e" opacity="0.4" />
              <rect x="262" y="93" width="6" height="6" rx="1" fill="#22c55e" opacity="0.6" />
              <rect x="272" y="93" width="6" height="6" rx="1" fill="#22c55e" opacity="0.8" />
              <rect x="282" y="93" width="6" height="6" rx="1" fill="#22c55e" />
            </g>

            {/* Fletxa broker → consumidor */}
            <line x1="365" y1="65" x2="455" y2="65" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
            <polygon points="455,60 465,65 455,70" fill="#f59e0b" />
            <text x="410" y="55" textAnchor="middle" fontSize="10" fill="var(--text-secondary)">deliver</text>

            {/* Consumidor */}
            <rect x="470" y="40" width="120" height="50" rx="8" fill="#f59e0b" opacity="0.15" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="530" y="65" textAnchor="middle" fontSize="13" fontWeight="700" fill="#f59e0b">Consumidor</text>
            <text x="530" y="82" textAnchor="middle" fontSize="10" fill="#f59e0b" opacity="0.9">load-generator</text>

            {/* Etiqueta de latencia */}
            <line x1="70" y1="115" x2="530" y2="115" stroke="var(--text-disabled)" strokeDasharray="3 3" />
            <text x="300" y="125" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-secondary)">latència = temps total de viatge | throughput = missatges/s</text>
          </svg>
        </div>

        {/* ── Que mesurem: definicions clau ── */}
        <div style={{ padding: 16, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
            Les tres mètriques que has d'entendre
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>Latencia</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Quan triga un missatge des que es publica fins que el consumidor
                el rep. Es mesura en mil·lisegons. Treballem amb percentils:
                <strong> P50</strong> (mediana) i <strong>P99</strong> (el pitjor 1% dels casos).
                Mes baix = millor.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>Throughput</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Quants missatges per segon es processen amb exit. Es la mesura
                de "quanta carrega aguanta" la combinacio. Mes alt = millor.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>Taxa d'error</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Percentatge de missatges que han fallat respecte als enviats
                (caigudes, timeouts, rebutjos del broker...). Mes baix = millor;
                idealment 0%.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── GUIA D'ONBOARDING (col·lapsable) ───────────────────────────────── */}
      {/* Col·lapsada per defecte per no sobrecarregar la pantalla inicial */}
      <div style={fade(30)}><LearningOverview /></div>
      <div style={fade(40)}><OnboardingGuide /></div>

      <div style={{ ...fade(70), ...S.card, marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap' as const }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
              Estat actual
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Panell operatiu del portal</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.55 }}>
              Resum del que hi ha definit i executat ara mateix. S&apos;actualitza automàticament cada 30 segons.
            </div>
          </div>
          <a href="/resultats" style={{ ...S.btn, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Veure Resultats <IconArrow />
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Components', value: portalStats.components, color: '#3b82f6', desc: 'Catàleg disponible' },
            { label: 'Escenaris', value: portalStats.scenarios, color: '#8b5cf6', desc: 'Configuracions definides' },
            { label: 'Actius', value: portalStats.activeRuns, color: '#22c55e', desc: 'Execucions en curs' },
            { label: 'Amb històric', value: portalStats.historicalScenarios, color: '#f59e0b', desc: 'Escenaris ja executats' },
            { label: 'Mesures registrades', value: portalStats.totalMeasures, color: '#06b6d4', desc: 'Punts de telemetria acumulats a Resultats' },
          ].map(stat => (
            <div key={stat.label} style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: stat.color, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)' }}>
                {portalStats.loading ? '-' : <StreamingNumber value={stat.value} />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.45 }}>
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TARGETES D'ACCES RAPID ─────────────────────────────────────────── */}
      {/* Grid de 4 targetes, una per seccio principal de l'app.
          Cada una te: icona, badge, titol, descripcio i link "Obrir". */}
      <div className="asyncbench-pages-grid" style={{ ...fade(100), display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22, position: 'relative' }}>
        {PAGES.map((page, i) => {
          const hov = hovCard === i; // si aquesta targeta concreta esta en hover
          return (
            <a key={i} href={page.href}
              className="card-hover"
              style={{
                ...S.card,
                textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 10,
                cursor: 'pointer', padding: 18, position: 'relative', overflow: 'hidden',
                // Linia de color superior: identifica la seccio visualment
                borderTop:      `3px solid ${page.color}`,
                border:         `1px solid ${hov ? page.color + '40' : 'var(--border)'}`,
                borderTopColor: page.color,
                background:     hov
                  ? `radial-gradient(240px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${page.color}18, transparent 60%), var(--bg-card)`
                  : 'var(--bg-card)',
                transform:      hov ? 'translateY(-3px)' : 'none',
                boxShadow:      hov ? `0 8px 22px ${page.color}15` : 'var(--shadow-sm)',
                transition:     'transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease',
              } as React.CSSProperties}
              onMouseEnter={() => setHovCard(i)}
              onMouseLeave={() => setHovCard(null)}
              onMouseMove={e => {
                const el = e.currentTarget as HTMLElement;
                const r = el.getBoundingClientRect();
                el.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
                el.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
              }}
            >
              {/* Part superior: icona + badge de la seccio */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: page.color + '12', color: page.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <page.Icon />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: page.color + '10', color: page.color, border: `1px solid ${page.color}1e` }}>
                  {page.badge}
                </span>
              </div>

              {/* Part principal: nom i descripcio de la seccio */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{page.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{page.desc}</div>
              </div>

              {/* Peu: link "Obrir" que canvia de color en hover */}
              <div style={{
                marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600,
                color: hov ? page.color : 'var(--text-disabled)',
                transition: 'color 0.15s',
              }}>
                Obrir <IconArrow />
              </div>
            </a>
          );
        })}
      </div>

      {/* ── COM COMECAR: passos sequencials ────────────────────────────────── */}
      {/* 4 passos en linia amb una linia connector per mostrar el flux.
          Clicar cada pas navega a la seccio corresponent. */}
      <div style={{ ...fade(180), ...S.card, marginBottom: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 18 }}>
          Com començar
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, position: 'relative' }}>
          {/* Linia connector que uneix visualment els 4 passos */}
          <div style={{ position: 'absolute', top: 20, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg, #3b82f650, #8b5cf650, #22c55e50, #f59e0b50)', zIndex: 0 }} />

          {GETTING_STARTED.map((step, i) => {
            const hov = hovStep === i;
            return (
              <a key={i} href={step.href}
                style={{
                  textDecoration: 'none', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', padding: '0 12px', textAlign: 'center',
                  position: 'relative', zIndex: 1,
                  transition: 'transform 0.18s ease',
                  transform: hov ? 'translateY(-2px)' : 'none',
                }}
                onMouseEnter={() => setHovStep(i)}
                onMouseLeave={() => setHovStep(null)}
              >
                {/* Cercle numerado: mostra el numero o un check en hover */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: hov ? step.color : 'var(--bg-card)',
                  border: `2px solid ${hov ? step.color : step.color + '55'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10, color: hov ? '#fff' : step.color,
                  fontWeight: 800, fontSize: 15, fontFamily: 'var(--font-mono)',
                  transition: 'all 0.2s ease',
                  boxShadow: hov ? `0 4px 12px ${step.color}35` : 'none',
                }}>
                  {/* En hover mostra un check per indicar que es clicable */}
                  {hov ? <IconCheck /> : step.step}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: hov ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 4, transition: 'color 0.15s' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {step.desc}
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── CATALEG RAPID + CAPACITATS ─────────────────────────────────────── */}
      {/* Layout 1/3 + 2/3: a l'esquerra el preview del cataleg,
          a la dreta el grid de capacitats de la plataforma */}
      <div style={{ ...fade(240), display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 22 }}>

        {/* Preview del cataleg: llista rapida de categories i elements */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
            Catàleg ràpid
          </div>
          {CATALOG_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: cat.color, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>
                {cat.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {cat.items.map(item => (
                  <span key={item} style={{ ...S.badge(cat.color), fontSize: 10 }}>{item}</span>
                ))}
              </div>
            </div>
          ))}
          {/* Link al cataleg complet */}
          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <a href="/catalog" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Veure cataleg complet <IconArrow />
            </a>
          </div>
        </div>

        {/* Grid de capacitats: 6 funcions clau de la plataforma */}
        <div style={{ ...S.card }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 }}>
            Capacitats de la plataforma
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            {FEATURES.map((f, i) => {
              const hov = hovFeat === i;
              return (
                <div key={i}
                  style={{
                    padding: 11, borderRadius: 8,
                    border: `1px solid ${hov ? f.color + '38' : 'var(--border)'}`,
                    background: hov ? f.color + '08' : 'var(--bg-subtle)',
                    transition: 'all 0.17s ease', cursor: 'default',
                  }}
                  onMouseEnter={() => setHovFeat(i)}
                  onMouseLeave={() => setHovFeat(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <span style={{ color: hov ? f.color : 'var(--text-secondary)', transition: 'color 0.15s', display: 'flex' }}>
                      <f.Icon />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FOOTER DE NAVEGACIO ────────────────────────────────────────────── */}
      {/* Links rapids a les seccions principals, alineats a la dreta */}
      <div style={{ ...fade(320), ...S.card, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' as const, gap: 5, padding: '10px 18px' }}>
        {[
          { label: 'Catàleg',    href: '/catalog'    },
          { label: 'Escenaris',  href: '/escenaris'  },
          { label: 'Execucions', href: '/execucions' },
          { label: 'Resultats',  href: '/resultats'  },
        ].map(link => (
          <a key={link.href} href={link.href}
            style={{
              fontSize: 12, fontWeight: 500,
              color:      hovFooter === link.href ? 'var(--accent)' : 'var(--text-disabled)',
              textDecoration: 'none', padding: '4px 8px', borderRadius: 5,
              border:     `1px solid ${hovFooter === link.href ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.15s ease',
            }}
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
