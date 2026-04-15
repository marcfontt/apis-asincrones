
import { useEffect, useState, useRef } from 'react';
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
const IconLayers    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconAKS       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l4.8 4.8"/></svg>;
const IconMetric    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const IconCheck     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconChevron   = ({ open }: { open: boolean }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease' }}><polyline points="6 9 12 15 18 9"/></svg>;
const IconInfo      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconTerminal  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconCpu       = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>;

// ── Extra CSS ──────────────────────────────────────────────────────────────────
const HOME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:wght@400;500;600;700;800&display=swap');

  @keyframes terminalBlink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  @keyframes gridPulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.65; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 20px rgba(34,197,94,0.18), 0 2px 8px rgba(0,0,0,0.3); }
    50%       { box-shadow: 0 0 36px rgba(34,197,94,0.32), 0 2px 8px rgba(0,0,0,0.3); }
  }
  @keyframes waveform {
    0%   { d: path("M0,12 C4,6 8,18 12,12 C16,6 20,18 24,12"); }
    50%  { d: path("M0,12 C4,18 8,6 12,12 C16,18 20,6 24,12"); }
    100% { d: path("M0,12 C4,6 8,18 12,12 C16,6 20,18 24,12"); }
  }

  .home-terminal-line {
    animation: fadeUp 0.35s ease both;
  }
  .home-btn-primary {
    animation: glowPulse 3s ease-in-out infinite;
    transition: all 0.18s ease !important;
  }
  .home-btn-primary:hover {
    transform: translateY(-2px) scale(1.02) !important;
    animation: none !important;
    box-shadow: 0 0 40px rgba(34,197,94,0.42), 0 8px 24px rgba(0,0,0,0.35) !important;
  }
  .home-card-feature:hover .home-feat-icon {
    transform: scale(1.12) rotate(-3deg);
  }
  .home-feat-icon {
    transition: transform 0.2s ease;
  }
  .home-stat-val {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }
`;

// ── Page sections data ─────────────────────────────────────────────────────────
const PAGES = [
  {
    href:    '/catalog',
    label:   'Catàleg',
    desc:    'Arquitectures, protocols i plataformes disponibles per combinar.',
    Icon:    IconCatalog,
    color:   '#3b82f6',
    badge:   '3 categories',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 100%)',
  },
  {
    href:    '/escenaris',
    label:   'Escenaris',
    desc:    'Crea i gestiona combinacions de benchmark. Configura durada, ràtio i payload.',
    Icon:    IconScenarios,
    color:   '#8b5cf6',
    badge:   'YAML + UI',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 100%)',
  },
  {
    href:    '/execucions',
    label:   'Execucions',
    desc:    'Llança escenaris contra AKS i monitoritza el progrés en temps real.',
    Icon:    IconRun,
    color:   '#22c55e',
    badge:   'AKS live',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)',
  },
  {
    href:    '/resultats',
    label:   'Resultats',
    desc:    "Compara latència, throughput i taxa d'error entre múltiples escenaris.",
    Icon:    IconResults,
    color:   '#f59e0b',
    badge:   'Multi-factor',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)',
  },
];

const FEATURES = [
  { Icon: IconKafka,  title: 'Brokers reals',           desc: 'Kafka, RabbitMQ, NATS Server i Confluent desplegats sobre AKS.', color: '#ef4444' },
  { Icon: IconCloud,  title: 'Desplegament automàtic',  desc: 'Escenaris es converteixen en Kubernetes manifests i es llancen al clúster.', color: '#3b82f6' },
  { Icon: IconMetric, title: 'Mètriques en temps real', desc: "Latència, throughput i errors recollits per l'agent de mètriques.", color: '#22c55e' },
  { Icon: IconZap,    title: 'Puntuació multi-factor',  desc: 'Score format-aware: P99 25%, throughput 20%, errors 20%, latència 20%, P50 15%.', color: '#f59e0b' },
  { Icon: IconLayers, title: '5 arquitectures',         desc: 'EDA, QBA, LCA, EMA i SEA implementades com a patrons de messaging.', color: '#8b5cf6' },
  { Icon: IconAKS,    title: 'Azure Kubernetes Service',desc: 'Infraestructura escalable al núvol Azure amb namespaces aïllats per escenari.', color: '#06b6d4' },
];

const GETTING_STARTED = [
  { step: 1, label: 'Explora el catàleg',   desc: "Descobreix arquitectures, protocols i plataformes.", href: '/catalog',    color: '#3b82f6', Icon: IconCatalog   },
  { step: 2, label: 'Crea un escenari',     desc: 'Combina broker, protocol i configuració de test.',  href: '/escenaris',  color: '#8b5cf6', Icon: IconScenarios },
  { step: 3, label: 'Executa el benchmark', desc: 'Llança el Job a AKS i monitoritza en temps real.',  href: '/execucions', color: '#22c55e', Icon: IconRun       },
  { step: 4, label: 'Analitza resultats',   desc: "Compara escenaris per latència, throughput i errors.", href: '/resultats', color: '#f59e0b', Icon: IconResults   },
];

const CATALOG_CATEGORIES = [
  { label: 'Arquitectures', color: '#3b82f6', items: ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'] },
  { label: 'Protocols',     color: '#22c55e', items: ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'NATS'] },
  { label: 'Plataformes',   color: '#f59e0b', items: ['Confluent', 'RabbitMQ', 'EMQX', 'NATS'] },
];

// Simulated terminal lines for the hero terminal widget
const TERMINAL_LINES = [
  { delay: 0,    color: '#64748b', text: '# benchmark-orchestrator v2.4.1' },
  { delay: 400,  color: '#22c55e', text: '✓ Connected to AKS cluster' },
  { delay: 800,  color: '#3b82f6', text: '→ Running: Kafka EDA · video-4k · 60s' },
  { delay: 1200, color: '#f59e0b', text: '  throughput  4 812 msg/s' },
  { delay: 1600, color: '#f59e0b', text: '  latency avg   18.4 ms' },
  { delay: 2000, color: '#8b5cf6', text: '  p99          42.1 ms' },
  { delay: 2400, color: '#ef4444', text: '  errors         0.00%' },
  { delay: 2800, color: '#22c55e', text: '✓ Score  87.3 / 100' },
];

const ONBOARDING_STEPS = [
  {
    Icon: IconCatalog,
    color: '#3b82f6',
    title: 'Revisa el catàleg',
    desc: 'Consulta totes les arquitectures (EDA, QBA, LCA...), protocols (Kafka, MQTT, gRPC...) i plataformes disponibles. Cada component inclou descripció i casos d\'ús.',
  },
  {
    Icon: IconScenarios,
    color: '#8b5cf6',
    title: 'Defineix un escenari',
    desc: 'Combina una plataforma, un protocol i una arquitectura. Configura durada, ràtio de missatges i mida de payload. Escull entre escenaris predefinits o totalment personalitzats.',
  },
  {
    Icon: IconRun,
    color: '#22c55e',
    title: 'Llança el benchmark',
    desc: 'El sistema desplega automàticament un Job a Azure Kubernetes Service. Des de la pàgina d\'Execucions pots seguir l\'estat en temps real i aturar-ho quan vulguis.',
  },
  {
    Icon: IconResults,
    color: '#f59e0b',
    title: 'Compara els resultats',
    desc: 'A Resultats veus les mètriques en directe (latència, throughput, errors). Un cop completats, compara tots els escenaris amb la taula multi-factor i les gràfiques d\'Historial.',
  },
];

// ── Onboarding Guide ───────────────────────────────────────────────────────────
const OnboardingGuide = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      ...S.card,
      marginBottom: 24,
      borderLeft: '3px solid var(--accent)',
      padding: '0',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '16px 24px', fontFamily: 'var(--font)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--accent)' }}><IconInfo /></span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Com funciona la plataforma
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 500, background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>
            4 passos
          </span>
        </div>
        <IconChevron open={open} />
      </button>

      {open && (
        <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Aquesta plataforma permet comparar arquitectures d'APIs asíncrones desplegades sobre Azure Kubernetes Service.
            Segueix aquests quatre passos per obtenir els teus primers resultats de benchmark.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {ONBOARDING_STEPS.map((step, i) => (
              <div key={i} style={{
                padding: '16px',
                background: 'var(--bg-subtle)',
                borderRadius: 10,
                border: `1px solid ${step.color}22`,
                position: 'relative',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: step.color + '14',
                  color: step.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <step.Icon />
                </div>
                <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 11, fontWeight: 800, color: step.color + '50', fontFamily: 'var(--font-mono)' }}>
                  0{i + 1}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {step.title}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Terminal widget ────────────────────────────────────────────────────────────
const TerminalWidget = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    TERMINAL_LINES.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(v => Math.max(v, i + 1)), line.delay));
    });
    const blink = setInterval(() => setCursor(c => !c), 530);
    return () => { timers.forEach(clearTimeout); clearInterval(blink); };
  }, []);

  return (
    <div style={{
      background: '#010409',
      border: '1px solid rgba(88,166,255,0.18)',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
      boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
      minWidth: 320,
      maxWidth: 400,
    }}>
      {/* Title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block', opacity: 0.7 }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', opacity: 0.7 }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block', opacity: 0.7 }} />
        <span style={{ fontSize: 10, color: '#484f58', marginLeft: 6, letterSpacing: '0.04em' }}>benchmark-cli</span>
        <span style={{ marginLeft: 'auto', color: '#484f58', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><IconTerminal /></span>
      </div>
      {/* Lines */}
      <div style={{ padding: '14px 16px', minHeight: 180 }}>
        {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="home-terminal-line" style={{ animationDelay: `${i * 0.04}s`, display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, lineHeight: 1.6 }}>
            <span style={{ color: '#2d4060', fontSize: 10, flexShrink: 0, userSelect: 'none' }}>❯</span>
            <span style={{ fontSize: 11.5, color: line.color, letterSpacing: '0.01em' }}>{line.text}</span>
          </div>
        ))}
        {visibleLines < TERMINAL_LINES.length && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{ color: '#2d4060', fontSize: 10, userSelect: 'none' }}>❯</span>
            <span style={{ width: 7, height: 13, background: '#22c55e', opacity: cursor ? 0.9 : 0, transition: 'opacity 0.1s', display: 'inline-block', borderRadius: 1 }} />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Animated stat counter ──────────────────────────────────────────────────────
const useCountUp = (target: number, duration = 1200, start = false) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return val;
};

// ── HomePage ───────────────────────────────────────────────────────────────────
export const HomePage = () => {
  const [hoveredCard,   setHoveredCard]   = useState<number | null>(null);
  const [hoveredFeat,   setHoveredFeat]   = useState<number | null>(null);
  const [hoveredHero,   setHoveredHero]   = useState<number | null>(null);
  const [hoveredFooter, setHoveredFooter] = useState<string | null>(null);
  const [hoveredStep,   setHoveredStep]   = useState<number | null>(null);
  const [visible,       setVisible]       = useState(false);
  const [statsVisible,  setStatsVisible]  = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Home | APIs Asíncrones';
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  // Intersection observer for stats
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fadeStyle = (delay = 0): React.CSSProperties => ({
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
  });

  // Animated counters
  const c5  = useCountUp(5,    900, statsVisible);
  const c5b = useCountUp(5,    950, statsVisible);
  const c4  = useCountUp(4,    850, statsVisible);
  const c4b = useCountUp(4,    800, statsVisible);

  const STAT_ITEMS = [
    { label: 'Arquitectures', value: c5,  suffix: '',  color: '#3b82f6', Icon: IconLayers },
    { label: 'Protocols',     value: c5b, suffix: '',  color: '#22c55e', Icon: IconKafka  },
    { label: 'Plataformes',   value: c4,  suffix: '',  color: '#f59e0b', Icon: IconCloud  },
    { label: 'Formats',       value: c4b, suffix: '',  color: '#8b5cf6', Icon: IconZap    },
    { label: 'Mètriques live', value: null, suffix: '', color: '#06b6d4', Icon: IconMetric },
    { label: 'AKS natiu',      value: null, suffix: '', color: '#64748b', Icon: IconAKS    },
  ];

  return (
    <div style={{ ...S.page, maxWidth: 1200, paddingBottom: 64, fontFamily: "'Fira Sans', var(--font)" }}>
      <style>{GLOBAL_CSS}</style>
      <style>{HOME_CSS}</style>

      {/* ── Hero ── */}
      <div style={{
        ...fadeStyle(0),
        position:     'relative',
        overflow:     'hidden',
        borderRadius: 16,
        background:   'var(--bg-card)',
        border:       '1px solid var(--border)',
        padding:      '52px 52px 48px',
        marginBottom: 24,
      }}>
        {/* Mesh background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 16 }}>
          {/* Green glow (CTA accent) */}
          <div style={{
            position: 'absolute', top: -120, right: -80,
            width: 500, height: 500, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, rgba(34,197,94,0.02) 50%, transparent 72%)',
            animation: 'heroGlow 6s ease-in-out infinite',
          }} />
          {/* Blue glow (mid-left) */}
          <div style={{
            position: 'absolute', bottom: -100, left: -60,
            width: 380, height: 380, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 55%, transparent 75%)',
            animation: 'heroGlow 6s ease-in-out infinite 3s',
          }} />
          {/* Dot grid pattern */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            animation: 'gridPulse 8s ease-in-out infinite',
          }} />
          {/* Bottom gradient line */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.45) 35%, rgba(59,130,246,0.35) 65%, transparent 100%)',
          }} />
        </div>

        {/* Content: two columns */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
          {/* Left column */}
          <div style={{ flex: '1 1 360px', minWidth: 0 }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(34,197,94,0.1)', color: '#22c55e',
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.05em', textTransform: 'uppercase' as const,
              border: '1px solid rgba(34,197,94,0.28)',
              marginBottom: 20,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulseDot 2s ease infinite' }} />
              Plataforma de Benchmark · AKS Live
            </div>

            <h1 style={{
              margin: '0 0 14px',
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
              color: 'var(--text-primary)',
              fontFamily: "'Fira Sans', var(--font)",
            }}>
              APIs Asíncrones<br />
              <span style={{ background: 'linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Benchmark Platform
              </span>
            </h1>

            <p style={{
              margin: '0 0 32px',
              fontSize: 15.5,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: 500,
              fontFamily: "'Fira Sans', var(--font)",
            }}>
              Compara arquitectures event-driven sobre Azure Kubernetes Service.
              Defineix escenaris, executa benchmarks i analitza mètriques P50·P99·throughput en temps real.
            </p>

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              {[
                { label: 'Crear escenari',  href: '/escenaris', primary: true  },
                { label: 'Veure catàleg',   href: '/catalog',   primary: false },
                { label: 'Veure resultats', href: '/resultats', primary: false },
              ].map((btn, i) => (
                <a
                  key={i}
                  href={btn.href}
                  className={btn.primary ? 'home-btn-primary' : undefined}
                  style={{
                    display:        'inline-flex',
                    alignItems:     'center',
                    gap:            6,
                    padding:        '9px 20px',
                    borderRadius:   8,
                    border:         btn.primary ? '1px solid rgba(34,197,94,0.5)' : '1px solid var(--border)',
                    background:     btn.primary ? '#22c55e' : 'var(--bg-card)',
                    color:          btn.primary ? '#020617' : 'var(--text-secondary)',
                    fontSize:       14,
                    fontWeight:     700,
                    cursor:         'pointer',
                    textDecoration: 'none',
                    fontFamily:     "'Fira Sans', var(--font)",
                    opacity:        hoveredHero === i && !btn.primary ? 0.85 : 1,
                    transform:      hoveredHero === i && !btn.primary ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow:      btn.primary ? undefined : hoveredHero === i ? 'var(--shadow-md)' : 'none',
                    transition:     btn.primary ? undefined : 'all 0.18s ease',
                  }}
                  onMouseEnter={() => !btn.primary && setHoveredHero(i)}
                  onMouseLeave={() => !btn.primary && setHoveredHero(null)}
                >
                  {btn.label} {btn.primary && <IconArrow />}
                </a>
              ))}
            </div>
          </div>

          {/* Right column: terminal */}
          <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end' }}>
            <TerminalWidget />
          </div>
        </div>

        {/* Stats strip */}
        <div ref={statsRef} style={{
          position:  'relative',
          marginTop: 36,
          borderTop: '1px solid var(--border)',
          paddingTop: 22,
          display:   'flex', gap: 28, flexWrap: 'wrap' as const,
          alignItems: 'center',
        }}>
          {STAT_ITEMS.map((stat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: stat.color, display: 'flex', flexShrink: 0 }}><stat.Icon /></span>
              {stat.value !== null ? (
                <span className="home-stat-val" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Fira Code', var(--font-mono)", animation: statsVisible ? 'countUp 0.5s ease both' : 'none', animationDelay: `${i * 0.06}s` }}>
                  {stat.value}
                </span>
              ) : null}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{stat.label}</span>
            </div>
          ))}
          {/* CPU badge */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '4px 10px' }}>
            <span style={{ color: '#22c55e', display: 'flex' }}><IconCpu /></span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e', fontFamily: "'Fira Code', var(--font-mono)" }}>Kubernetes · AKS</span>
          </div>
        </div>
      </div>

      {/* ── Onboarding Guide ── */}
      <div style={fadeStyle(40)}>
        <OnboardingGuide />
      </div>

      {/* ── Quick access cards ── */}
      <div style={{ ...fadeStyle(100), display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {PAGES.map((page, i) => {
          const isHov = hoveredCard === i;
          return (
            <a
              key={i}
              href={page.href}
              className="card-hover"
              style={{
                ...S.card,
                textDecoration: 'none',
                display:        'flex',
                flexDirection:  'column',
                gap:            12,
                cursor:         'pointer',
                transition:     'all 0.22s ease',
                transform:      isHov ? 'translateY(-5px)' : 'none',
                boxShadow:      isHov
                  ? `0 16px 32px ${page.color}20, 0 4px 8px ${page.color}10`
                  : 'var(--shadow-sm)',
                border:         `1px solid ${isHov ? page.color + '50' : 'var(--border)'}`,
                borderTop:      `3px solid ${page.color}`,
                padding:        20,
                background:     isHov ? page.gradient : 'var(--bg-card)',
              }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: isHov ? page.color + '22' : page.color + '12',
                  color:      page.color,
                  display:    'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s ease',
                  boxShadow:  isHov ? `0 0 16px ${page.color}30` : 'none',
                }}>
                  <page.Icon />
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: isHov ? page.color + '1e' : page.color + '10',
                  color: page.color,
                  border: `1px solid ${page.color}28`,
                  fontFamily: "'Fira Code', var(--font-mono)",
                  transition: 'all 0.2s ease',
                }}>
                  {page.badge}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontFamily: "'Fira Sans', var(--font)" }}>
                  {page.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {page.desc}
                </div>
              </div>

              <div style={{
                marginTop:  'auto',
                display:    'flex', alignItems: 'center', gap: 4,
                fontSize:   12, fontWeight: 600,
                color:      isHov ? page.color : 'var(--text-disabled)',
                transition: 'color 0.18s ease',
              }}>
                Obrir <IconArrow />
              </div>
            </a>
          );
        })}
      </div>

      {/* ── Getting Started ── */}
      <div style={{ ...fadeStyle(180), ...S.card, marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 22 }}>
          Com començar
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, position: 'relative' }}>
          {/* Connector line */}
          <div style={{
            position: 'absolute', top: 20, left: '12.5%', right: '12.5%',
            height: 1,
            background: 'linear-gradient(90deg, #3b82f660, #8b5cf660, #22c55e60, #f59e0b60)',
            zIndex: 0,
          }} />
          {GETTING_STARTED.map((step, i) => {
            const isHov = hoveredStep === i;
            return (
              <a
                key={i}
                href={step.href}
                style={{
                  textDecoration: 'none',
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  padding:        '0 16px',
                  textAlign:      'center',
                  position:       'relative',
                  zIndex:         1,
                  transition:     'transform 0.18s ease',
                  transform:      isHov ? 'translateY(-3px)' : 'none',
                }}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div style={{
                  width:          42, height: 42, borderRadius: '50%',
                  background:     isHov ? step.color : 'var(--bg-card)',
                  border:         `2px solid ${isHov ? step.color : step.color + '70'}`,
                  display:        'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom:   14, color: isHov ? '#020617' : step.color,
                  fontWeight:     800, fontSize: 16,
                  transition:     'all 0.22s ease',
                  boxShadow:      isHov ? `0 4px 18px ${step.color}45` : 'none',
                  fontFamily:     "'Fira Code', var(--font-mono)",
                }}>
                  {isHov ? <IconCheck /> : step.step}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isHov ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 6, transition: 'color 0.18s', fontFamily: "'Fira Sans', var(--font)" }}>
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

      {/* ── Catalog preview + Features (two columns) ── */}
      <div style={{ ...fadeStyle(260), display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 28 }}>

        {/* Left: Catalog preview */}
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
            Catàleg ràpid
          </div>
          {CATALOG_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cat.color, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                {cat.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                {cat.items.map(item => (
                  <span key={item} style={{ ...S.badge(cat.color), fontSize: 10, fontFamily: "'Fira Code', var(--font-mono)" }}>{item}</span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <a href="/catalog" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'Fira Sans', var(--font)" }}>
              Veure catàleg complet <IconArrow />
            </a>
          </div>
        </div>

        {/* Right: Feature grid */}
        <div style={{ ...S.card }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 16 }}>
            Capacitats de la plataforma
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {FEATURES.map((f, i) => {
              const isHov = hoveredFeat === i;
              return (
                <div
                  key={i}
                  className="home-card-feature"
                  style={{
                    padding:      14,
                    borderRadius: 10,
                    border:       `1px solid ${isHov ? f.color + '45' : 'var(--border)'}`,
                    background:   isHov ? f.color + '0d' : 'var(--bg-subtle)',
                    transition:   'all 0.18s ease',
                    cursor:       'default',
                  }}
                  onMouseEnter={() => setHoveredFeat(i)}
                  onMouseLeave={() => setHoveredFeat(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className="home-feat-icon" style={{ color: isHov ? f.color : 'var(--text-secondary)', transition: 'color 0.15s ease', display: 'flex' }}>
                      <f.Icon />
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Fira Sans', var(--font)" }}>{f.title}</span>
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
        ...fadeStyle(340),
        ...S.card,
        display:        'flex',
        justifyContent: 'flex-end',
        alignItems:     'center',
        flexWrap:       'wrap' as const,
        gap:            8,
        padding:        '14px 24px',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Catàleg',      href: '/catalog'    },
            { label: 'Escenaris',    href: '/escenaris'  },
            { label: 'Execucions',   href: '/execucions' },
            { label: 'Resultats',    href: '/resultats'  },
            { label: 'Configuració', href: '/settings'   },
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
                fontFamily:     "'Fira Sans', var(--font)",
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
