import { useEffect, useState, type CSSProperties } from 'react';
import { S, GLOBAL_CSS } from '../theme';
import { EDUCATION } from '../shared/content/education';

const CATALOG_BASE = '/api/proxy/catalog-service';
const SCENARIOS_BASE = '/api/proxy/scenario-service';
const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';
const METRICS_BASE = '/api/proxy/metrics-api';

const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconCatalog = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
const IconScenarios = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const IconRun = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>;
const IconResults = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="12" width="4" height="9" /><rect x="10" y="7" width="4" height="14" /><rect x="17" y="3" width="4" height="18" /></svg>;

const pages = [
  { href: '/catalog', label: 'Catàleg', desc: 'Arquitectures, protocols, plataformes i versions utilitzades.', Icon: IconCatalog, color: '#3b82f6' },
  { href: '/escenaris', label: 'Escenaris', desc: 'Defineix càrrega, payload, format i combinació tècnica.', Icon: IconScenarios, color: '#8b5cf6' },
  { href: '/execucions', label: 'Execucions', desc: 'Segueix els runs en AKS, pendents, completats i errors.', Icon: IconRun, color: '#22c55e' },
  { href: '/resultats', label: 'Resultats', desc: 'Compara latència, throughput, percentils i error rate.', Icon: IconResults, color: '#f59e0b' },
];

// Flux que segueix cada missatge durant un benchmark.
// L'ordre, els colors i els textos van pensats perque es llegeixin
// d'esquerra a dreta en un sol cop d'ull. La latencia es el temps
// total productor→consumidor; el throughput, els missatges per segon.
const flow = [
  { label: 'Productor', color: '#2563eb', text: 'Publica missatges amb una ràtio (msg/s) i un payload definits a l\'escenari.' },
  { label: 'Broker', color: '#f59e0b', text: 'Kafka, Confluent, RabbitMQ o NATS Server reben i distribueixen la càrrega dins l\'AKS.' },
  { label: 'Protocol', color: '#8b5cf6', text: 'Kafka, AMQP, MQTT, gRPC, WS o NATS marquen com viatja cada missatge.' },
  { label: 'Consumidor', color: '#22c55e', text: 'Rep els missatges; aqui es tanca el cicle i podem calcular latència i throughput.' },
];

const metricCards = [
  {
    title: 'Latència',
    color: '#f59e0b',
    text: 'Temps que triga un missatge des que es publica fins que arriba al consumidor. Es mesura en mil·lisegons. Més baix és millor.',
  },
  {
    title: 'Throughput',
    color: '#22c55e',
    text: 'Missatges processats per segon. Indica quanta càrrega sostinguda suporta la combinació. Més alt és millor.',
  },
  {
    title: 'Error rate',
    color: '#ef4444',
    text: 'Percentatge de missatges fallits, perduts o rebutjats. Ha de ser proper a 0 perquè el resultat sigui defensable.',
  },
];

const smallCard = (color: string): CSSProperties => ({
  border: `1px solid ${color}26`,
  background: `linear-gradient(180deg, ${color}0d, var(--bg-card))`,
  borderRadius: 10,
  padding: 16,
});

const FlowDiagram = () => (
  <div style={{ ...S.card, padding: 20, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Flux productor a consumidor
        </div>
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          Què passa en una execució
        </h2>
      </div>
      <p style={{ margin: 0, maxWidth: 560, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        La comparació és justa perquè cada escenari passa pel mateix flux lògic i es mesura amb les mateixes unitats.
      </p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
      {flow.map((item, index) => (
        <div key={item.label} style={{ position: 'relative', ...smallCard(item.color) }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: item.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            {index + 1}. {item.label}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item.text}</p>
          {index < flow.length - 1 && (
            <span aria-hidden style={{ position: 'absolute', right: -9, top: '50%', transform: 'translateY(-50%)', color: item.color, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 999, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
              <IconArrow />
            </span>
          )}
        </div>
      ))}
    </div>

    {/*
      Anotacio visual de les dues metriques principals que surten del flux.
      Latencia = temps de viatge productor→consumidor (ms).
      Throughput = quants missatges es processen per segon.
      Es pinta com a barra horitzontal sota les targes per reforcar
      visualment que aquestes metriques mesuren tot el flux, no nomes una part.
    */}
    <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-subtle)', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#f59e0b' }} />
        <strong style={{ color: 'var(--text-primary)' }}>Latència (ms)</strong>: temps total productor → consumidor.
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: '#22c55e' }} />
        <strong style={{ color: 'var(--text-primary)' }}>Throughput (msg/s)</strong>: missatges processats per segon de mitjana.
      </span>
    </div>
  </div>
);

export const HomePage = () => {
  const [portalStats, setPortalStats] = useState({
    loading: true,
    components: 0,
    scenarios: 0,
    activeRuns: 0,
    historicalScenarios: 0,
    totalMeasures: 0,
  });

  useEffect(() => {
    document.title = 'Home | App is Asynchronous';
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPortalStats = async () => {
      try {
        const [componentsRes, scenariosRes, activeRunsRes, summaryRes] = await Promise.all([
          fetch(`${CATALOG_BASE}/components`).then(r => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`${SCENARIOS_BASE}/scenarios`).then(r => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`${ORCHESTRATOR}/runs/active`).then(r => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`${METRICS_BASE}/metrics/summary`).then(r => (r.ok ? r.json() : [])).catch(() => []),
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
        setPortalStats({ loading: false, components, scenarios, activeRuns, historicalScenarios, totalMeasures });
      } catch {
        if (!cancelled) setPortalStats(prev => ({ ...prev, loading: false }));
      }
    };
    loadPortalStats();
    const interval = window.setInterval(loadPortalStats, 30000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  return (
    <div style={{ ...S.page, maxWidth: 1200, paddingBottom: 56 }}>
      <style>{GLOBAL_CSS}</style>

      <section style={{
        ...S.card,
        padding: '36px 40px',
        marginBottom: 18,
        borderRadius: 10,
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(34,197,94,0.045) 52%, rgba(59,130,246,0.045) 100%)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.8fr)', gap: 24, alignItems: 'center' }}>
          <div>
            {/*
              Titol del portal: 'App is Asynchronous'.
              Hem tret el subtitol antic 'Benchmarks reals sota la mateixa
              carrega' per netejar la primera impressio. La descripcio sota
              ja deixa clar que comparem combinacions broker/protocol/arq.
            */}
            <h1 style={{ margin: 0, fontSize: 40, lineHeight: 1.05, fontWeight: 900, letterSpacing: '-0.035em', color: 'var(--text-primary)' }}>
              App is Asynchronous
            </h1>
            <p style={{ margin: '16px 0 24px', maxWidth: 720, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
              Portal Backstage per comparar, amb dades, combinacions de broker, protocol i arquitectura executades sobre AKS. L'objectiu no és veure una demo bonica, sinó entendre quin disseny funciona millor per cada perfil de càrrega.
            </p>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
              <a href="/escenaris" style={{ ...S.btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#22c55e', boxShadow: '0 6px 18px rgba(34,197,94,0.24)' }}>
                Crear escenari <IconArrow />
              </a>
              <a href="/catalog" style={{ ...S.btn, textDecoration: 'none' }}>Veure catàleg</a>
              <a href="/resultats" style={{ ...S.btn, textDecoration: 'none' }}>Comparar resultats</a>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Components', value: portalStats.components, color: '#3b82f6' },
              { label: 'Escenaris', value: portalStats.scenarios, color: '#8b5cf6' },
              { label: 'Runs actius', value: portalStats.activeRuns, color: '#22c55e' },
              { label: 'Mesures', value: portalStats.totalMeasures, color: '#06b6d4' },
            ].map(stat => (
              <div key={stat.label} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{stat.label}</div>
                <div style={{ fontSize: 26, fontWeight: 850, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {portalStats.loading ? '-' : stat.value.toLocaleString('ca-ES')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ ...S.card, marginBottom: 18, padding: 22 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            {EDUCATION.syncVsAsync.eyebrow}
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
            Què cal saber abans d'interpretar els resultats
          </h2>
          <p style={{ margin: '8px 0 0', maxWidth: 860, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {EDUCATION.syncVsAsync.description}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
          {EDUCATION.syncVsAsync.items.map(item => (
            <div key={item.title} style={smallCard(item.accent)}>
              <div style={{ fontSize: 13, fontWeight: 800, color: item.accent, marginBottom: 8 }}>{item.title}</div>
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

        {/*
          Bloc destacat: la diferencia entre 'missatge' i 'mesura'.
          Es la confusio mes frequent quan algu obre el portal per primer
          cop. Posar-la aqui, abans del flux i les metriques, fa que la
          resta del text s'entengui millor.
        */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 4 }}>
          <div style={{ border: '1px solid var(--border)', borderLeft: '3px solid #3b82f6', borderRadius: 9, padding: 14, background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#3b82f6', marginBottom: 6 }}>Missatge</div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Unitat real de càrrega</strong>: cada paquet que el productor envia al broker (un JSON financer, un frame de vídeo, una lectura IoT...). El comptador "missatges" indica quants n'han passat durant l'execució.
            </p>
          </div>
          <div style={{ border: '1px solid var(--border)', borderLeft: '3px solid #22c55e', borderRadius: 9, padding: 14, background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#22c55e', marginBottom: 6 }}>Mesura</div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Punt de telemetria</strong> persistit cada pocs segons amb el resum d'aquell tram (latència mitjana, throughput, errors). L'historial agrega aquestes mesures, no els missatges un a un.
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(300px, 0.7fr)', gap: 18, marginBottom: 18 }}>
        <FlowDiagram />
        <div style={{ ...S.card, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Mètriques principals
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {metricCards.map(metric => (
              <div key={metric.title} style={{ borderLeft: `3px solid ${metric.color}`, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: metric.color, marginBottom: 4 }}>{metric.title}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.58 }}>{metric.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {pages.map(page => (
          <a key={page.href} href={page.href} style={{ ...S.card, textDecoration: 'none', borderTop: `3px solid ${page.color}`, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: `${page.color}14`, color: page.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <page.Icon />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 5 }}>{page.label}</div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.58 }}>{page.desc}</p>
            </div>
            <div style={{ marginTop: 'auto', color: page.color, fontSize: 12, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              Obrir <IconArrow />
            </div>
          </a>
        ))}
      </section>
    </div>
  );
};

export default HomePage;
