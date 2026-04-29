import { useEffect, useState, type CSSProperties } from 'react';
import { S } from '../theme';
import { EDUCATION } from '../shared/content/education';
import { BrokerAnatomyDiagram, BrokerFlowDiagram, LatencyMapDiagram } from '../components/BrokerEducation';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';

const RUTA_API_CATALEG = '/api/proxy/catalog-service';
const RUTA_API_ESCENARIS = '/api/proxy/scenario-service';
const RUTA_API_ORQUESTRADOR = '/api/proxy/benchmark-orchestrator';
const RUTA_API_METRIQUES = '/api/proxy/metrics-api';

const IconoFlecha = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconoCatalogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconoEscenarios = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconoEjecuciones = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconoResultados = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="12" width="4" height="9" />
    <rect x="10" y="7" width="4" height="14" />
    <rect x="17" y="3" width="4" height="18" />
  </svg>
);

const paginasDelPortal = [
  {
    href: '/catalog',
    label: 'Catàleg',
    desc: 'Arquitectures, protocols, plataformes i versions utilitzades per crear escenaris.',
    Icono: IconoCatalogo,
    color: '#6366f1',
  },
  {
    href: '/escenaris',
    label: 'Escenaris',
    desc: 'Defineix càrrega, payload, format, broker, protocol i arquitectura.',
    Icono: IconoEscenarios,
    color: '#2D6BE4',
  },
  {
    href: '/execucions',
    label: 'Execucions',
    desc: 'Llança runs al clúster AKS i monitoritza pendents, actius i finalitzats.',
    Icono: IconoEjecuciones,
    color: '#22c55e',
  },
  {
    href: '/resultats',
    label: 'Resultats',
    desc: 'Compara latència, throughput, percentils i error rate entre execucions.',
    Icono: IconoResultados,
    color: '#00C896',
  },
];

const metricasPrincipales = [
  {
    title: 'Latència end-to-end',
    color: '#f59e0b',
    text: 'Temps des del publish del productor fins a la recepció del consumidor. És la mètrica central per entendre experiència real.',
  },
  {
    title: 'Throughput sostingut',
    color: '#22c55e',
    text: 'Missatges per segon en règim estable, ignorants transitoris. Serveix per saber quan una combinació sature.',
  },
  {
    title: 'Error rate i pèrdua',
    color: '#ef4444',
    text: 'Percentatge de missatges fallits, no rebuts o rebutjats. Un resultat ràpid però poc fiable no és defensable.',
  },
];

const pasosDeEjecucion = [
  { n: '1', label: 'Crear escenari', sub: 'contracte broker + protocol + càrrega', color: '#6366f1' },
  { n: '2', label: 'Desplegar a AKS', sub: 'Helm + namespaces + recursos', color: '#2D6BE4' },
  { n: '3', label: 'Generar càrrega', sub: 'k6/load-generator amb warmup', color: '#22c55e' },
  { n: '4', label: 'Scraping', sub: 'Prometheus i exporters', color: '#00C896' },
  { n: '5', label: 'Comparar', sub: 'historial i percentils', color: '#818cf8' },
];

const partsDelSistema = [
  {
    title: 'Backstage UI',
    subtitle: 'Frontend del portal',
    text: "L'usuari tria components, crea escenaris i consulta execucions sense sortir de Backstage.",
    color: '#6366f1',
  },
  {
    title: 'Backend compositor',
    subtitle: 'Regles del TFG',
    text: 'Converteix el contracte Scenario en manifests, jobs i configuracio de prova reproduible.',
    color: '#2D6BE4',
  },
  {
    title: 'AKS',
    subtitle: 'Execucio a Kubernetes',
    text: 'Allotja brokers, gateways i generadors de carrega en namespaces controlats.',
    color: '#22c55e',
  },
  {
    title: 'Broker i gateway',
    subtitle: 'Sistema mesurat',
    text: 'Kafka, NATS, RabbitMQ o compatible reben payloads identics sota el mateix perfil.',
    color: '#f59e0b',
  },
  {
    title: 'Metrics API',
    subtitle: 'Dades persistides',
    text: 'Recull mesures de runs i prepara latencia, throughput, errors i percentils per comparar.',
    color: '#00C896',
  },
  {
    title: 'Resultats',
    subtitle: 'Lectura defensable',
    text: 'Mostra conclusions relatives al conjunt filtrat i explica que s ha mesurat.',
    color: '#818cf8',
  },
];

const smallCard = (color: string): CSSProperties => ({
  border: `1px solid ${color}26`,
  background: `linear-gradient(180deg, ${color}0d, var(--bg-card))`,
  borderRadius: 10,
  padding: 16,
});

const formatNumero = (valor: number) => valor.toLocaleString('ca-ES');

export const HomePage = () => {
  const [estadisticasPortal, setEstadisticasPortal] = useState({
    loading: true,
    components: 0,
    scenarios: 0,
    activeRuns: 0,
    historicalScenarios: 0,
    totalMeasures: 0,
  });

  useEffect(() => {
    document.title = 'Home | Apis Asíncrones';
  }, []);

  useEffect(() => {
    let peticionCancelada = false;

    const cargarEstadisticasPortal = async () => {
      try {
        const [respuestaComponentes, respuestaEscenarios, respuestaRunsActivos, respuestaResumenMetricas] = await Promise.all([
          fetch(`${RUTA_API_CATALEG}/components`).then(respuesta => (respuesta.ok ? respuesta.json() : [])).catch(() => []),
          fetch(`${RUTA_API_ESCENARIS}/scenarios`).then(respuesta => (respuesta.ok ? respuesta.json() : [])).catch(() => []),
          fetch(`${RUTA_API_ORQUESTRADOR}/runs/active`).then(respuesta => (respuesta.ok ? respuesta.json() : [])).catch(() => []),
          fetch(`${RUTA_API_METRIQUES}/metrics/summary`).then(respuesta => (respuesta.ok ? respuesta.json() : [])).catch(() => []),
        ]);

        if (peticionCancelada) return;

        const totalComponentesVisibles = Array.isArray(respuestaComponentes)
          ? respuestaComponentes.filter((componente: any) => componente.predefined !== false && componente.category !== 'gateway').length
          : 0;
        const totalEscenarios = Array.isArray(respuestaEscenarios) ? respuestaEscenarios.length : 0;
        const totalRunsActivos = Array.isArray(respuestaRunsActivos) ? respuestaRunsActivos.length : 0;
        const resumenMetricas = Array.isArray(respuestaResumenMetricas) ? respuestaResumenMetricas : [];
        const totalEscenariosConHistorial = new Set(resumenMetricas.map((resumen: any) => resumen.scenarioId).filter(Boolean)).size;
        const totalMedidas = resumenMetricas.reduce((suma: number, resumen: any) =>
          suma + (Number(resumen.pointCount ?? resumen.measureCount ?? 0) || 0), 0);

        setEstadisticasPortal({
          loading: false,
          components: totalComponentesVisibles,
          scenarios: totalEscenarios,
          activeRuns: totalRunsActivos,
          historicalScenarios: totalEscenariosConHistorial,
          totalMeasures: totalMedidas,
        });
      } catch {
        if (!peticionCancelada) {
          setEstadisticasPortal(estadisticasAnteriores => ({ ...estadisticasAnteriores, loading: false }));
        }
      }
    };

    cargarEstadisticasPortal();
    const intervaloActualizacion = window.setInterval(cargarEstadisticasPortal, 30000);
    return () => {
      peticionCancelada = true;
      window.clearInterval(intervaloActualizacion);
    };
  }, []);

  const estadisticas = [
    { label: 'Components', value: estadisticasPortal.components, color: '#6366f1', desc: 'Catàleg disponible' },
    { label: 'Escenaris', value: estadisticasPortal.scenarios, color: '#2D6BE4', desc: 'Configurats' },
    { label: 'Runs actius', value: estadisticasPortal.activeRuns, color: '#22c55e', desc: 'Ara al clúster' },
    { label: 'Mesures', value: estadisticasPortal.totalMeasures, color: '#00C896', desc: 'Punts de telemetria' },
  ];

  return (
    <div style={{ ...S.page, maxWidth: 1220, paddingBottom: 64 }}>
      <GlobalBenchmarkStyles />

      <section style={{
        ...S.card,
        position: 'relative',
        overflow: 'hidden',
        padding: '40px 44px',
        marginBottom: 18,
        borderRadius: 14,
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(0,200,150,0.045) 52%, rgba(45,107,228,0.055) 100%)',
      }}>
        <div aria-hidden style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 76% 22%, rgba(0,200,150,0.08) 0%, transparent 54%), radial-gradient(ellipse at 12% 80%, rgba(45,107,228,0.08) 0%, transparent 55%)',
        }} />

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1.32fr) minmax(300px, 0.78fr)', gap: 28, alignItems: 'center' }} className="async-responsive-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <img src="/assets/async-logo-icon.svg" alt="" style={{ width: 42, height: 42, display: 'block' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--teal)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Benchmark Portal
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  Backstage + AKS + Prometheus
                </div>
              </div>
            </div>

            <h1 style={{ margin: 0, maxWidth: 680, fontSize: 42, lineHeight: 1.06, fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--text-primary)' }}>
              Apis Asíncrones
            </h1>
            <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--teal)' }}>
              Benchmarks reals sota la mateixa càrrega
            </p>
            <p style={{ margin: '18px 0 24px', maxWidth: 720, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
              Portal Backstage per comparar, amb dades, combinacions de broker, protocol i arquitectura executades sobre AKS. L'objectiu no és fer una demo bonica: és entendre quin disseny aguanta millor cada perfil de càrrega.
            </p>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <a href="/escenaris" style={{ ...S.btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#22c55e', boxShadow: '0 6px 18px rgba(34,197,94,0.24)' }}>
                Crear escenari <IconoFlecha />
              </a>
              <a href="/catalog" style={{ ...S.btn, textDecoration: 'none' }}>Veure catàleg</a>
              <a href="/resultats" style={{ ...S.btn, textDecoration: 'none' }}>Comparar resultats</a>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {estadisticas.map(stat => (
              <div key={stat.label} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{stat.label}</div>
                <div style={{ fontSize: 26, fontWeight: 850, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
                  {estadisticasPortal.loading ? '-' : formatNumero(stat.value)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Estructura del sistema
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              De la seleccio de l'escenari fins als resultats
            </h2>
          </div>
          <p style={{ margin: 0, maxWidth: 560, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Aquest mapa resumeix les peces del TFG sense confondre rols: Backstage es el portal, el backend compon la prova, AKS executa els components i la Metrics API conserva les mesures.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))', gap: 10 }} className="async-responsive-grid">
          {partsDelSistema.map((part, index) => (
            <div key={part.title} style={{ border: `1px solid ${part.color}30`, borderTop: `3px solid ${part.color}`, borderRadius: 10, background: 'var(--bg-subtle)', padding: 14, minHeight: 178 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${part.color}16`, border: `1px solid ${part.color}30`, color: part.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 850 }}>
                  {index + 1}
                </div>
                {index < partsDelSistema.length - 1 && (
                  <span aria-hidden style={{ color: 'var(--text-disabled)', fontSize: 18, fontWeight: 800 }}>→</span>
                )}
              </div>
              <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 4 }}>{part.title}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: part.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{part.subtitle}</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.56 }}>{part.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            {EDUCATION.syncVsAsync.eyebrow}
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Què cal saber abans d'interpretar els resultats
          </h2>
          <p style={{ margin: '8px 0 0', maxWidth: 860, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {EDUCATION.syncVsAsync.description}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
          {EDUCATION.syncVsAsync.items.map(item => (
            <div key={item.title} style={smallCard(item.accent)}>
              <div style={{ fontSize: 13, fontWeight: 850, color: item.accent, marginBottom: 8 }}>{item.title}</div>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{item.summary}</p>
              <div style={{ display: 'grid', gap: 7 }}>
                {item.bullets.map(bullet => (
                  <div key={bullet} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: item.accent, marginTop: 6, flexShrink: 0 }} />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 4 }}>
          <div style={{ border: '1px solid var(--border)', borderLeft: '3px solid #3b82f6', borderRadius: 9, padding: 14, background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: '#3b82f6', marginBottom: 6 }}>Missatge</div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Unitat real de càrrega</strong>: cada paquet que el productor envia al broker (un JSON financer, un frame de vídeo, una lectura IoT...). El comptador "missatges" indica quants n'han passat durant l'execució.
            </p>
          </div>
          <div style={{ border: '1px solid var(--border)', borderLeft: '3px solid #22c55e', borderRadius: 9, padding: 14, background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: 13, fontWeight: 850, color: '#22c55e', marginBottom: 6 }}>Mesura</div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Punt de telemetria</strong> persistit cada pocs segons amb el resum d'aquell tram (latència mitjana, throughput, errors). L'historial agrega aquestes mesures, no els missatges un a un.
            </p>
          </div>
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Execució
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Què passa quan llances un benchmark
            </h2>
          </div>
          <p style={{ margin: 0, maxWidth: 560, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            El valor acadèmic del portal depèn que aquest flux sigui repetible. Cada run ha de travessar els mateixos passos i produir mètriques comparables.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(120px, 1fr))', gap: 0, position: 'relative', marginBottom: 6 }} className="async-responsive-grid">
          <div aria-hidden className="async-hide-mobile" style={{ position: 'absolute', top: 22, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg,#6366f150,#2D6BE450,#22c55e50,#00C89650,#818cf850)', zIndex: 0 }} />
          {pasosDeEjecucion.map(paso => (
            <div key={paso.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px 12px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${paso.color}14`, border: `2px solid ${paso.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, color: paso.color, fontWeight: 850, fontSize: 15, fontFamily: 'var(--font-mono)' }}>
                {paso.n}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 3 }}>{paso.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{paso.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.28fr) minmax(280px, 0.72fr)', gap: 18, marginBottom: 18 }} className="async-responsive-grid">
        <BrokerFlowDiagram />
        <div style={{ ...S.card, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Mètriques principals
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {metricasPrincipales.map(metric => (
              <div key={metric.title} style={{ borderLeft: `3px solid ${metric.color}`, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 850, color: metric.color, marginBottom: 4 }}>{metric.title}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.58 }}>{metric.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginBottom: 18 }}>
        <BrokerAnatomyDiagram />
        <LatencyMapDiagram />
      </div>

      <section style={{ ...S.card, padding: 22 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Pàgines interiors
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            On continua cada tasca
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {paginasDelPortal.map(page => (
            <a key={page.href} href={page.href} style={{ ...S.card, textDecoration: 'none', borderTop: `3px solid ${page.color}`, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 154, transition: 'transform 0.16s ease, border-color 0.16s ease' }} className="card-hover">
              <div style={{ width: 38, height: 38, borderRadius: 8, background: `${page.color}14`, color: page.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <page.Icono />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 5 }}>{page.label}</div>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.58 }}>{page.desc}</p>
              </div>
              <div style={{ marginTop: 'auto', color: page.color, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                Obrir <IconoFlecha />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
