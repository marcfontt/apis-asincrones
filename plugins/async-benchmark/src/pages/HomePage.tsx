import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from '../i18n';
import { S } from '../theme';
import { BrokerFlowDiagram } from '../components/BrokerEducation';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';
import { DEMO_SCENARIO_URL, TutorialButton } from '../components/TutorialOverlay';
import { GuideItemCard, GuidePanel, GuideStepFlow } from '../components/GuidePanel';

const API_CATALOG = '/api/proxy/catalog-service';
const API_SCENARIO = '/api/proxy/scenario-service';
const API_ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';
const API_METRICS = '/api/proxy/metrics-api';

const HOME_CSS = `
  .home-hero-panel {
    transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition);
  }

  .home-hero-panel:hover {
    border-color: rgba(37,99,235,0.24) !important;
    box-shadow: var(--shadow-lg) !important;
  }

  .home-flow-card {
    transition: transform var(--transition), border-color var(--transition), background var(--transition), box-shadow var(--transition);
  }

  .home-flow-card:hover {
    transform: translateY(-4px);
    border-color: var(--flow-color, var(--accent)) !important;
    background: var(--bg-card) !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--flow-color, var(--accent)) 16%, transparent), 0 8px 24px rgba(0,0,0,0.13) !important;
  }

  .home-flow-card:active {
    transform: translateY(-1px);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--flow-color, var(--accent)) 24%, transparent), 0 4px 12px rgba(0,0,0,0.10) !important;
  }

  .home-flow-card:focus-within,
  .home-flow-card:focus {
    outline: 3px solid color-mix(in srgb, var(--flow-color, var(--accent)) 30%, transparent);
    outline-offset: 2px;
  }

  .home-btn-primary {
    transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
  }

  .home-btn-primary:hover {
    transform: translateY(-2px);
    filter: brightness(1.08);
    box-shadow: 0 10px 24px rgba(37,99,235,0.22) !important;
  }

  .home-btn-primary:active {
    transform: translateY(0px);
    filter: brightness(0.96);
  }

  .home-btn-secondary {
    transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
  }

  .home-btn-secondary:hover {
    transform: translateY(-2px);
    border-color: var(--border-strong) !important;
    background: var(--bg-hover) !important;
    box-shadow: var(--shadow-md) !important;
  }

  .home-btn-secondary:active {
    transform: translateY(0px);
  }

  .home-page-card {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }

  .home-page-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 32px rgba(0,0,0,0.15) !important;
    border-color: var(--border-strong) !important;
  }

  .home-page-card:active {
    transform: translateY(-2px);
    box-shadow: 0 5px 16px rgba(0,0,0,0.10) !important;
  }

  .home-pulse-dot {
    animation: homePulseDot 1.8s ease-in-out infinite;
  }

  @keyframes homePulseDot {
    0%, 100% { transform: scale(1); opacity: 0.72; }
    50% { transform: scale(1.18); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-pulse-dot,
    .home-flow-card,
    .home-hero-panel,
    .home-btn-primary,
    .home-btn-secondary,
    .home-page-card {
      animation: none !important;
      transition-duration: 1ms !important;
      transform: none !important;
    }
  }
`;

const IconFletxa = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconCataleg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const IconEscenaris = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M20 18V6" />
    <path d="M4 8h8" />
    <path d="M12 12h8" />
    <path d="M4 16h16" />
  </svg>
);

const IconExecucions = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

const IconResultats = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="7" width="4" height="14" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>
);

const miniCard = (color: string): CSSProperties => ({
  border: `1px solid ${color}28`,
  background: `linear-gradient(180deg, ${color}0d, var(--bg-card))`,
  borderRadius: 10,
  padding: 16,
});

const LOCALE_BY_LANGUAGE: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-US',
};

const getLocale = (language: string) => LOCALE_BY_LANGUAGE[language] || 'ca-ES';
const formatNumero = (valor: number, locale: string) => valor.toLocaleString(locale);

const SectionHeader = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 }}>
    <div>
      <div style={{ fontSize: 11, fontWeight: 850, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {eyebrow}
      </div>
      <h2 style={{ margin: 0, fontSize: 21, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {title}
      </h2>
    </div>
    {description && (
      <p style={{ margin: 0, maxWidth: 580, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        {description}
      </p>
    )}
  </div>
);

const HomeGuide = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const steps = [
    { n: '1', label: t('home.executionSteps.0.label'), sub: t('home.executionSteps.0.sub'), color: '#2563eb' },
    { n: '2', label: t('home.executionSteps.1.label'), sub: t('home.executionSteps.1.sub'), color: '#7c3aed' },
    { n: '3', label: t('home.executionSteps.2.label'), sub: t('home.executionSteps.2.sub'), color: '#0891b2' },
    { n: '4', label: t('home.executionSteps.3.label'), sub: t('home.executionSteps.3.sub'), color: '#16a34a' },
    { n: '5', label: t('home.executionSteps.4.label'), sub: t('home.executionSteps.4.sub'), color: '#dc2626' },
  ];
  const items = [
    { title: t('home.guide.items.map.title'), text: t('home.guide.items.map.text'), color: '#2563eb' },
    { title: t('home.guide.items.catalog.title'), text: t('home.guide.items.catalog.text'), color: '#f59e0b' },
    { title: t('home.guide.items.scenarios.title'), text: t('home.guide.items.scenarios.text'), color: '#7c3aed' },
    { title: t('home.guide.items.results.title'), text: t('home.guide.items.results.text'), color: '#16a34a' },
  ];

  return (
    <GuidePanel
      title={t('home.guide.title')}
      subtitle={t('home.guide.subtitle')}
      open={open}
      onToggle={() => setOpen(value => !value)}
      showLabel={t('scenarios.guide.show')}
      hideLabel={t('scenarios.guide.hide')}
      marginBottom={18}
    >
      <GuideStepFlow steps={steps} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        {items.map(item => (
          <GuideItemCard key={item.title} title={item.title} text={item.text} color={item.color} />
        ))}
      </div>
    </GuidePanel>
  );
};

export const HomePage = () => {
  const { t, language } = useTranslation();
  const locale = getLocale(language);
  const [estadistiquesPortal, setEstadistiquesPortal] = useState({
    loading: true,
    components: 0,
    scenarios: 0,
    activeRuns: 0,
    historicalScenarios: 0,
    totalMeasures: 0,
  });

  useEffect(() => {
    document.title = `${t('home.title')} | ${t('home.portalLabel')}`;
  }, [t]);

  useEffect(() => {
    let peticioCancelada = false;

    const carregarEstadistiquesPortal = async () => {
      try {
        const [respostaComponents, respostaEscenaris, respostaRunsActius, respostaResumMesures] = await Promise.all([
          fetch(`${API_CATALOG}/components`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
          fetch(`${API_SCENARIO}/scenarios`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
          fetch(`${API_ORCHESTRATOR}/runs/active`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
          fetch(`${API_METRICS}/metrics/summary`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
        ]);

        if (peticioCancelada) return;

        const totalComponentsVisibles = Array.isArray(respostaComponents)
          ? respostaComponents.filter((component: any) => component.predefined !== false && component.category !== 'gateway').length
          : 0;
        const totalEscenaris = Array.isArray(respostaEscenaris) ? respostaEscenaris.length : 0;
        const totalRunsActius = Array.isArray(respostaRunsActius) ? respostaRunsActius.length : 0;
        const resumMesures = Array.isArray(respostaResumMesures) ? respostaResumMesures : [];
        const totalEscenarisAmbHistorial = new Set(resumMesures.map((resum: any) => resum.scenarioId).filter(Boolean)).size;
        const totalMesures = resumMesures.reduce((suma: number, resum: any) =>
          suma + (Number(resum.pointCount ?? resum.measureCount ?? 0) || 0), 0);

        setEstadistiquesPortal({
          loading: false,
          components: totalComponentsVisibles,
          scenarios: totalEscenaris,
          activeRuns: totalRunsActius,
          historicalScenarios: totalEscenarisAmbHistorial,
          totalMeasures: totalMesures,
        });
      } catch {
        if (!peticioCancelada) {
          setEstadistiquesPortal(estadistiquesAnteriors => ({ ...estadistiquesAnteriors, loading: false }));
        }
      }
    };

    carregarEstadistiquesPortal();
    const intervalActualitzacio = window.setInterval(carregarEstadistiquesPortal, 30000);
    return () => {
      peticioCancelada = true;
      window.clearInterval(intervalActualitzacio);
    };
  }, []);

  const paginesDelPortal = [
    { href: '/catalog', label: t('home.pages.0.label') , desc: t('home.pages.0.desc'), Icona: IconCataleg, color: '#f59e0b' },
    { href: '/escenaris', label: t('home.pages.1.label'), desc: t('home.pages.1.desc'), Icona: IconEscenaris, color: '#2563eb' },
    { href: '/execucions', label: t('home.pages.2.label'), desc: t('home.pages.2.desc'), Icona: IconExecucions, color: '#16a34a' },
    { href: '/resultats', label: t('home.pages.3.label'), desc: t('home.pages.3.desc'), Icona: IconResultats, color: '#dc2626' },
  ];

  const metriquesPrincipals = [
    { title: t('home.metrics.0.title'), color: '#f59e0b', text: t('home.metrics.0.text') },
    { title: t('home.metrics.1.title'), color: '#16a34a', text: t('home.metrics.1.text') },
    { title: t('home.metrics.2.title'), color: '#dc2626', text: t('home.metrics.2.text') },
  ];

  const passosExecucio = [
    { n: '1', label: t('home.executionSteps.0.label'), sub: t('home.executionSteps.0.sub'), color: '#2563eb' },
    { n: '2', label: t('home.executionSteps.1.label'), sub: t('home.executionSteps.1.sub'), color: '#7c3aed' },
    { n: '3', label: t('home.executionSteps.2.label'), sub: t('home.executionSteps.2.sub'), color: '#0891b2' },
    { n: '4', label: t('home.executionSteps.3.label'), sub: t('home.executionSteps.3.sub'), color: '#16a34a' },
    { n: '5', label: t('home.executionSteps.4.label'), sub: t('home.executionSteps.4.sub'), color: '#dc2626' },
  ];

  const partsDelSistema = [
    { title: t('home.systemParts.0.title'), subtitle: t('home.systemParts.0.subtitle'), text: t('home.systemParts.0.text'), color: '#2563eb' },
    { title: t('home.systemParts.1.title'), subtitle: t('home.systemParts.1.subtitle'), text: t('home.systemParts.1.text'), color: '#7c3aed' },
    { title: t('home.systemParts.2.title'), subtitle: t('home.systemParts.2.subtitle'), text: t('home.systemParts.2.text'), color: '#0891b2' },
    { title: t('home.systemParts.3.title'), subtitle: t('home.systemParts.3.subtitle'), text: t('home.systemParts.3.text'), color: '#f59e0b' },
    { title: t('home.systemParts.4.title'), subtitle: t('home.systemParts.4.subtitle'), text: t('home.systemParts.4.text'), color: '#16a34a' },
    { title: t('home.systemParts.5.title'), subtitle: t('home.systemParts.5.subtitle'), text: t('home.systemParts.5.text'), color: '#dc2626' },
  ];

  const conceptesClau = [
    { title: t('home.concepts.0.title'), color: '#2563eb', text: t('home.concepts.0.text') },
    { title: t('home.concepts.1.title'), color: '#7c3aed', text: t('home.concepts.1.text') },
    { title: t('home.concepts.2.title'), color: '#0891b2', text: t('home.concepts.2.text') },
    { title: t('home.concepts.3.title'), color: '#f59e0b', text: t('home.concepts.3.text') },
  ];


  const estadistiques = [
    { label: t('home.statsLabels.components'), value: estadistiquesPortal.components, color: '#f59e0b', desc: t('home.statsDesc.components') },
    { label: t('home.statsLabels.scenarios'), value: estadistiquesPortal.scenarios, color: '#2563eb', desc: t('home.statsDesc.scenarios') },
    { label: t('home.statsLabels.activeRuns'), value: estadistiquesPortal.activeRuns, color: '#16a34a', desc: t('home.statsDesc.activeRuns') },
    { label: t('home.statsLabels.measures'), value: estadistiquesPortal.totalMeasures, color: '#dc2626', desc: t('home.statsDesc.measures') },
  ];

  return (
    <div style={{ ...S.page, maxWidth: 1240, paddingBottom: 64 }}>
      <GlobalBenchmarkStyles />
      <style>{HOME_CSS}</style>

      <section
        className="home-hero-panel"
        style={{
          ...S.card,
          position: 'relative',
          overflow: 'hidden',
          padding: '42px 46px',
          marginBottom: 18,
          borderRadius: 14,
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(37,99,235,0.045) 45%, rgba(22,163,74,0.045) 100%)',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.32fr) minmax(300px, 0.78fr)',
            gap: 30,
            alignItems: 'center',
          }}
          className="async-responsive-grid"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <img src="/assets/async-logo-icon.svg" alt="" style={{ width: 44, height: 44, display: 'block' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--teal)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  {t('home.portalLabel')}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {t('home.heroSubtitle')}
                </div>
              </div>
            </div>

            <h1 style={{ margin: 0, maxWidth: 720, fontSize: 43, lineHeight: 1.06, fontWeight: 950, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {t('home.title')}
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 900, color: 'var(--teal)' }}>
              {t('home.subtitle')}
            </p>
            <p style={{ margin: '18px 0 24px', maxWidth: 750, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.78 }}>
              {t('home.description')}
            </p>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <a href="/escenaris" className="home-btn-primary" style={{ ...S.btnPrimary, textDecoration: 'none' }}>
                {t('home.btnCreateScenario')}
              </a>
              <a href="/catalog" className="home-btn-secondary" style={{ ...S.btn, textDecoration: 'none' }}>{t('home.btnViewCatalog')}</a>
              <a href="/resultats" className="home-btn-secondary" style={{ ...S.btn, textDecoration: 'none' }}>{t('home.btnCompareResults')}</a>
              <TutorialButton page="home" createExampleHref={DEMO_SCENARIO_URL} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {estadistiques.map(stat => (
              <div key={stat.label} style={{ border: `1px solid ${stat.color}24`, borderRadius: 10, padding: 14, background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{stat.label}</div>
                <div style={{ fontSize: 27, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
                  {estadistiquesPortal.loading ? '-' : formatNumero(stat.value, locale)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeGuide />

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <SectionHeader
          eyebrow={t('home.sections.conceptsEyebrow')}
          title={t('home.sections.conceptsTitle')}
          description={t('home.sections.conceptsDesc')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
          {conceptesClau.map(concepte => (
            <div key={concepte.title} style={miniCard(concepte.color)}>
              <div style={{ fontSize: 13, fontWeight: 900, color: concepte.color, marginBottom: 8 }}>{concepte.title}</div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.62 }}>{concepte.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <SectionHeader
          eyebrow={t('home.sections.systemEyebrow')}
          title={t('home.sections.systemTitle')}
          description={t('home.sections.systemDesc')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))', gap: 10 }} className="async-responsive-grid">
          {partsDelSistema.map((part, index) => (
            <div
              key={part.title}
              className="home-flow-card"
              tabIndex={0}
              style={{
                ['--flow-color' as any]: part.color,
                border: `1px solid ${part.color}30`,
                borderTop: `4px solid ${part.color}`,
                borderRadius: 10,
                background: 'var(--bg-subtle)',
                padding: 14,
                minHeight: 174,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${part.color}16`, border: `1px solid ${part.color}30`, color: part.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>
                  {index + 1}
                </div>
                <span style={{ fontSize: 10, fontWeight: 850, color: part.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{part.subtitle}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>{part.title}</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.58 }}>{part.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginBottom: 18 }}>
        <BrokerFlowDiagram />
        <section style={{ padding: '4px 0 0' }}>
          <div style={{ fontSize: 11, fontWeight: 850, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {t('home.sections.metricsLabel')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }} className="async-responsive-grid">
            {metriquesPrincipals.map(metric => (
              <div key={metric.title} style={{ position: 'relative', border: `1px solid ${metric.color}24`, borderLeft: `3px solid ${metric.color}`, padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8, minHeight: 132, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: metric.color, marginBottom: 6 }}>{metric.title}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.62, flex: 1 }}>{metric.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <SectionHeader
          eyebrow={t('home.sections.executionEyebrow')}
          title={t('home.sections.executionTitle')}
          description={t('home.sections.executionDesc')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(140px, 1fr))', gap: 12 }} className="async-responsive-grid">
          {passosExecucio.map((pas, index) => (
            <div
              key={pas.n}
              className="home-flow-card"
              tabIndex={0}
              style={{
                ['--flow-color' as any]: pas.color,
                position: 'relative',
                border: `1px solid ${pas.color}30`,
                borderRadius: 10,
                background: 'var(--bg-subtle)',
                padding: 15,
                minHeight: 150,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div className={index === 2 ? 'home-pulse-dot' : undefined} style={{ width: 40, height: 40, borderRadius: 10, background: `${pas.color}16`, border: `1px solid ${pas.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pas.color, fontWeight: 900, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                  {pas.n}
                </div>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>{pas.label}</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{pas.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...S.card, padding: 22 }}>
        <SectionHeader eyebrow={t('home.sections.pagesEyebrow')} title={t('home.sections.pagesTitle')} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {paginesDelPortal.map(page => (
            <a key={page.href} href={page.href} style={{ ...S.card, textDecoration: 'none', borderTop: `3px solid ${page.color}`, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 158 }} className="home-page-card">
              <div style={{ width: 40, height: 40, borderRadius: 9, background: `${page.color}14`, color: page.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <page.Icona />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 5 }}>{page.label}</div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{page.desc}</p>
              </div>
              <div style={{ marginTop: 'auto', color: page.color, fontSize: 12, fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
{t('home.btnOpen')} <IconFletxa />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
