import { useEffect, useState, type CSSProperties } from 'react';
import { S } from '../theme';
import { BrokerAnatomyDiagram, BrokerFlowDiagram, LatencyMapDiagram } from '../components/BrokerEducation';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';

const RUTA_API_CATALEG = '/api/proxy/catalog-service';
const RUTA_API_ESCENARIS = '/api/proxy/scenario-service';
const RUTA_API_ORQUESTRADOR = '/api/proxy/benchmark-orchestrator';
const RUTA_API_METRIQUES = '/api/proxy/metrics-api';

const HOME_CSS = `
  .home-hero-panel {
    transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition);
  }

  .home-hero-panel:hover {
    border-color: rgba(37,99,235,0.24) !important;
    box-shadow: var(--shadow-lg) !important;
  }

  .home-flow-card {
    transition: transform var(--transition), border-color var(--transition), background var(--transition);
  }

  .home-flow-card:hover {
    transform: translateY(-4px);
    border-color: var(--border-strong) !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.13) !important;
  }

  .home-flow-card:active {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.10) !important;
  }

  .home-btn-primary {
    transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
  }

  .home-btn-primary:hover {
    transform: translateY(-2px);
    filter: brightness(1.08);
    box-shadow: 0 10px 26px rgba(22,163,74,0.30) !important;
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
    border-color: var(--accent) !important;
    background: rgba(37,99,235,0.08) !important;
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

const paginesDelPortal = [
  {
    href: '/catalog',
    label: 'Catàleg',
    desc: 'Components, versions i configuració necessària per replicar les proves.',
    Icona: IconCataleg,
    color: '#f59e0b',
  },
  {
    href: '/escenaris',
    label: 'Escenaris',
    desc: 'Defineix broker, arquitectura, protocol, format, càrrega, ràtio i payload.',
    Icona: IconEscenaris,
    color: '#2563eb',
  },
  {
    href: '/execucions',
    label: 'Execucions',
    desc: 'Llança runs al clúster, atura proves i revisa l’estat de cada execució.',
    Icona: IconExecucions,
    color: '#16a34a',
  },
  {
    href: '/resultats',
    label: 'Resultats',
    desc: 'Compara latència, throughput, errors i percentils per execució o escenari.',
    Icona: IconResultats,
    color: '#dc2626',
  },
];

const metriquesPrincipals = [
  {
    title: 'Latència P99',
    color: '#f59e0b',
    text: 'Temps que tarda un missatge des que surt del productor fins que arriba al consumidor. El percentil 99 revela el pitjor cas real: el 99% dels missatges arriben per sota d\'aquest valor. Una latència P99 baixa és clau per a sistemes de temps real.',
  },
  {
    title: 'Throughput',
    color: '#16a34a',
    text: 'Quantitat de missatges processats per segon durant la prova. Indica la capacitat màxima del broker sota la càrrega configurada. Un throughput alt amb latència estable és el signe d\'un sistema ben dimensionat.',
  },
  {
    title: 'Taxa d\'error',
    color: '#dc2626',
    text: 'Percentatge de missatges que fallen, es perden o no arriben correctament al consumidor. Inclou errors de xarxa, timeouts i missatges descartats pel broker. Un valor superior al 0,1% acostuma a ser un indicador d\'alerta.',
  },
];

const passosExecucio = [
  {
    n: '1',
    label: 'Crear escenari',
    sub: 'tries broker, arquitectura, protocol i format',
    color: '#2563eb',
  },
  {
    n: '2',
    label: 'Preparar execució',
    sub: 'el backend aplica durada, ràtio i payload',
    color: '#7c3aed',
  },
  {
    n: '3',
    label: 'Executar a AKS',
    sub: 'el generador envia payloads al broker',
    color: '#0891b2',
  },
  {
    n: '4',
    label: 'Guardar mesures',
    sub: 'cada run registra latència, throughput i errors',
    color: '#16a34a',
  },
  {
    n: '5',
    label: 'Comparar resultats',
    sub: 'l’historial permet veure què ha funcionat millor',
    color: '#dc2626',
  },
];

const partsDelSistema = [
  {
    title: 'Backstage',
    subtitle: 'Portal de treball',
    text: 'Pantalla on l’usuari crea escenaris, llança execucions i consulta resultats.',
    color: '#2563eb',
  },
  {
    title: 'Backend',
    subtitle: 'Compositor',
    text: 'Aplica les regles del TFG i converteix l’escenari en una prova executable.',
    color: '#7c3aed',
  },
  {
    title: 'AKS',
    subtitle: 'Clúster',
    text: 'Executa brokers, generadors de càrrega i serveis de mètriques en Kubernetes.',
    color: '#0891b2',
  },
  {
    title: 'Broker',
    subtitle: 'Sistema mesurat',
    text: 'Kafka, RabbitMQ, NATS o compatible reben els mateixos payloads sota càrrega.',
    color: '#f59e0b',
  },
  {
    title: 'Mètriques',
    subtitle: 'Dades del run',
    text: 'Cada execució publica mesures periòdiques amb comptadors i percentils.',
    color: '#16a34a',
  },
  {
    title: 'Comparació',
    subtitle: 'Resultat final',
    text: 'La UI mostra diferències entre combinacions i ajuda a defensar conclusions.',
    color: '#dc2626',
  },
];

const conceptesClau = [
  {
    title: 'Arquitectura',
    color: '#2563eb',
    text: 'La forma d’organitzar productor, broker i consumidor. Afecta com circula el missatge.',
  },
  {
    title: 'Protocol',
    color: '#7c3aed',
    text: 'Les regles de comunicació. Decideix com s’envia, confirma o lliura el missatge.',
  },
  {
    title: 'Format de dades',
    color: '#0891b2',
    text: 'El tipus de payload. No és igual enviar telemetria IoT que vídeo o transaccions.',
  },
  {
    title: 'Broker',
    color: '#f59e0b',
    text: 'La plataforma que rep i distribueix missatges. És la peça principal que comparem.',
  },
];

const miniCard = (color: string): CSSProperties => ({
  border: `1px solid ${color}28`,
  background: `linear-gradient(180deg, ${color}0d, var(--bg-card))`,
  borderRadius: 10,
  padding: 16,
});

const formatNumero = (valor: number) => valor.toLocaleString('ca-ES');

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

export const HomePage = () => {
  const [estadistiquesPortal, setEstadistiquesPortal] = useState({
    loading: true,
    components: 0,
    scenarios: 0,
    activeRuns: 0,
    historicalScenarios: 0,
    totalMeasures: 0,
  });

  useEffect(() => {
    document.title = 'Home | APIs Asíncrones';
  }, []);

  useEffect(() => {
    let peticioCancelada = false;

    const carregarEstadistiquesPortal = async () => {
      try {
        const [respostaComponents, respostaEscenaris, respostaRunsActius, respostaResumMetriques] = await Promise.all([
          fetch(`${RUTA_API_CATALEG}/components`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
          fetch(`${RUTA_API_ESCENARIS}/scenarios`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
          fetch(`${RUTA_API_ORQUESTRADOR}/runs/active`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
          fetch(`${RUTA_API_METRIQUES}/metrics/summary`).then(resposta => (resposta.ok ? resposta.json() : [])).catch(() => []),
        ]);

        if (peticioCancelada) return;

        const totalComponentsVisibles = Array.isArray(respostaComponents)
          ? respostaComponents.filter((component: any) => component.predefined !== false && component.category !== 'gateway').length
          : 0;
        const totalEscenaris = Array.isArray(respostaEscenaris) ? respostaEscenaris.length : 0;
        const totalRunsActius = Array.isArray(respostaRunsActius) ? respostaRunsActius.length : 0;
        const resumMetriques = Array.isArray(respostaResumMetriques) ? respostaResumMetriques : [];
        const totalEscenarisAmbHistorial = new Set(resumMetriques.map((resum: any) => resum.scenarioId).filter(Boolean)).size;
        const totalMesures = resumMetriques.reduce((suma: number, resum: any) =>
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

  const estadistiques = [
    { label: 'Components', value: estadistiquesPortal.components, color: '#f59e0b', desc: 'Catàleg disponible' },
    { label: 'Escenaris', value: estadistiquesPortal.scenarios, color: '#2563eb', desc: 'Configurats' },
    { label: 'Runs actius', value: estadistiquesPortal.activeRuns, color: '#16a34a', desc: 'Ara al clúster' },
    { label: 'Mesures', value: estadistiquesPortal.totalMeasures, color: '#dc2626', desc: 'Punts registrats' },
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
                  Benchmark Portal
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Backstage per crear proves, AKS per executar-les i mètriques per comparar resultats.
                </div>
              </div>
            </div>

            <h1 style={{ margin: 0, maxWidth: 720, fontSize: 43, lineHeight: 1.06, fontWeight: 950, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              APIs Asíncrones
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 900, color: 'var(--teal)' }}>
              Benchmarks reals sota la mateixa càrrega
            </p>
            <p style={{ margin: '18px 0 24px', maxWidth: 750, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.78 }}>
              Aquest portal compara combinacions de broker, protocol, arquitectura i format de dades. La idea és simple: executar proves equivalents i veure amb dades quin disseny respon millor.
            </p>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <a href="/escenaris" className="home-btn-primary" style={{ ...S.btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16a34a', boxShadow: '0 6px 18px rgba(22,163,74,0.22)' }}>
                Crear escenari
              </a>
              <a href="/catalog" className="home-btn-secondary" style={{ ...S.btn, textDecoration: 'none' }}>Veure catàleg</a>
              <a href="/resultats" className="home-btn-secondary" style={{ ...S.btn, textDecoration: 'none' }}>Comparar resultats</a>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {estadistiques.map(stat => (
              <div key={stat.label} style={{ border: `1px solid ${stat.color}24`, borderRadius: 10, padding: 14, background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{stat.label}</div>
                <div style={{ fontSize: 27, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
                  {estadistiquesPortal.loading ? '-' : formatNumero(stat.value)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <SectionHeader
          eyebrow="Estructura del sistema"
          title="De l’escenari als resultats"
          description="El portal no és el sistema que es mesura. Backstage és la interfície; el backend prepara la prova; AKS executa els components; i les mètriques permeten comparar."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))', gap: 10 }} className="async-responsive-grid">
          {partsDelSistema.map((part, index) => (
            <div key={part.title} className="home-flow-card" style={{ border: `1px solid ${part.color}30`, borderTop: `3px solid ${part.color}`, borderRadius: 10, background: 'var(--bg-subtle)', padding: 14, minHeight: 174 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${part.color}16`, border: `1px solid ${part.color}30`, color: part.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>
                  {index + 1}
                </div>
                {index < partsDelSistema.length - 1 && (
                  <span aria-hidden style={{ color: part.color, fontSize: 16, fontWeight: 900 }}>→</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>{part.title}</div>
              <div style={{ fontSize: 11, fontWeight: 850, color: part.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{part.subtitle}</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.58 }}>{part.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <SectionHeader
          eyebrow="Abans de mirar resultats"
          title="Què estàs comparant realment?"
          description="Una prova no compara noms comercials: compara un recorregut complet del missatge sota una càrrega concreta."
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
          eyebrow="Concepte clau"
          title="Com funciona un bròker?"
          description="Un bròker de missatgeria desacobla els productors dels consumidors: cada part treballa al seu ritme sense dependre de l'altra."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, alignItems: 'center', background: 'var(--bg-subtle)', borderRadius: 12, padding: '20px 16px' }} className="async-responsive-grid">
          {/* Producers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Productor A', 'Productor B', 'Productor C'].map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, border: '1px solid rgba(37,99,235,0.35)', borderRadius: 8, padding: '8px 12px', background: 'rgba(37,99,235,0.07)', fontSize: 12, fontWeight: 850, color: '#2563eb', textAlign: 'center' }}>
                  {label}
                  <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {['telemetria', 'events', 'transaccions'][i]}
                  </div>
                </div>
                <span aria-hidden style={{ color: '#2563eb', fontSize: 14, fontWeight: 900 }}>→</span>
              </div>
            ))}
          </div>

          {/* Broker (Topic) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 12px' }}>
            <div style={{ border: '2px solid rgba(245,158,11,0.5)', borderRadius: 12, padding: '14px 18px', background: 'rgba(245,158,11,0.08)', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Bròker</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Kafka · RabbitMQ<br />NATS · compatible
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>Topic / Queue</div>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
              Emmagatzema i redistribueix missatges independentment de productors i consumidors
            </p>
          </div>

          {/* Consumers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Consumidor X', 'Consumidor Y', 'Consumidor Z'].map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{ color: '#16a34a', fontSize: 14, fontWeight: 900 }}>→</span>
                <div style={{ flex: 1, border: '1px solid rgba(22,163,74,0.35)', borderRadius: 8, padding: '8px 12px', background: 'rgba(22,163,74,0.07)', fontSize: 12, fontWeight: 850, color: '#16a34a', textAlign: 'center' }}>
                  {label}
                  <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {['streaming', 'analítica', 'alertes'][i]}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.26fr) minmax(280px, 0.74fr)', gap: 18, marginBottom: 18, alignItems: 'start' }} className="async-responsive-grid">
        <BrokerFlowDiagram />
        <div style={{ ...S.card, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 850, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Mètriques principals
          </div>
          <div style={{ display: 'grid', gap: 10, gridTemplateRows: 'repeat(3, 1fr)' }}>
            {metriquesPrincipals.map(metric => (
              <div key={metric.title} style={{ borderLeft: `3px solid ${metric.color}`, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 8, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: metric.color, marginBottom: 6 }}>{metric.title}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.62, flex: 1 }}>{metric.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <SectionHeader
          eyebrow="Execució"
          title="Què passa quan llances un benchmark?"
          description="Cada run ha de passar pels mateixos passos perquè després la comparació sigui defensable."
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(140px, 1fr))', gap: 12 }} className="async-responsive-grid">
          {passosExecucio.map((pas, index) => (
            <div key={pas.n} className="home-flow-card" style={{ position: 'relative', border: `1px solid ${pas.color}30`, borderRadius: 10, background: 'var(--bg-subtle)', padding: 15, minHeight: 150 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                <div className={index === 2 ? 'home-pulse-dot' : undefined} style={{ width: 40, height: 40, borderRadius: 10, background: `${pas.color}16`, border: `1px solid ${pas.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pas.color, fontWeight: 900, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                  {pas.n}
                </div>
                {index < passosExecucio.length - 1 && (
                  <span aria-hidden className="async-hide-mobile" style={{ color: pas.color, fontSize: 18, fontWeight: 900 }}>→</span>
                )}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>{pas.label}</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{pas.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginBottom: 18 }}>
        <BrokerAnatomyDiagram />
        <LatencyMapDiagram />
      </div>

      <section style={{ ...S.card, padding: 22 }}>
        <SectionHeader eyebrow="Pàgines interiors" title="On continua cada tasca" />

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
                Obrir <IconFletxa />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
