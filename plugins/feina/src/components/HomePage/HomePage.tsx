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

import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

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
    totalSamples: 0,
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
        const totalSamples = summary.reduce((sum: number, s: any) =>
          sum + (Number(s.messagesRecv ?? s.count ?? 0) || 0), 0);

        setPortalStats({
          loading: false,
          components,
          scenarios,
          activeRuns,
          historicalScenarios,
          totalSamples,
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

          {/* Titol principal: nom de la plataforma amb accent de color */}
          <h1 style={{ margin: '0 0 12px', fontSize: 34, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            APIs Asíncrones<br />
            <span style={{ color: '#22c55e', fontWeight: 800 }}>Benchmark Platform</span>
          </h1>

          {/* Descripcio: resum de que fa la plataforma en 2 frases */}
          <p style={{ margin: '0 0 26px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 520 }}>
            Compara arquitectures event-driven sobre Azure Kubernetes Service. Defineix escenaris, executa benchmarks i analitza P50, P99, throughput i latència en temps real.
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

      {/* ── GUIA D'ONBOARDING (col·lapsable) ───────────────────────────────── */}
      {/* Col·lapsada per defecte per no sobrecarregar la pantalla inicial */}
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
            Veure Historial <IconArrow />
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Components', value: portalStats.components, color: '#3b82f6', desc: 'Catàleg disponible' },
            { label: 'Escenaris', value: portalStats.scenarios, color: '#8b5cf6', desc: 'Configuracions definides' },
            { label: 'Actius', value: portalStats.activeRuns, color: '#22c55e', desc: 'Execucions en curs' },
            { label: 'Amb històric', value: portalStats.historicalScenarios, color: '#f59e0b', desc: 'Escenaris ja executats' },
            { label: 'Mostres totals', value: portalStats.totalSamples, color: '#06b6d4', desc: 'Acumulades a resultats' },
          ].map(stat => (
            <div key={stat.label} style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: stat.color, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)' }}>
                {portalStats.loading ? '-' : stat.value}
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
      <div style={{ ...fade(100), display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {PAGES.map((page, i) => {
          const hov = hovCard === i; // si aquesta targeta concreta esta en hover
          return (
            <a key={i} href={page.href}
              className="card-hover"
              style={{
                ...S.card,
                textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 10,
                cursor: 'pointer', padding: 18,
                // Linia de color superior: identifica la seccio visualment
                borderTop:      `3px solid ${page.color}`,
                border:         `1px solid ${hov ? page.color + '40' : 'var(--border)'}`,
                borderTopColor: page.color,
                background:     hov ? `linear-gradient(160deg, var(--bg-card), ${page.color}07)` : 'var(--bg-card)',
                transform:      hov ? 'translateY(-3px)' : 'none',
                boxShadow:      hov ? `0 8px 22px ${page.color}15` : 'var(--shadow-sm)',
                transition:     'all 0.2s ease',
              }}
              onMouseEnter={() => setHovCard(i)}
              onMouseLeave={() => setHovCard(null)}
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
