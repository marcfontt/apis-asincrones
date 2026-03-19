import { useEffect, useState } from 'react';

const STEPS = [
  { num: 1, title: 'Explora el Catàleg', desc: 'Consulta les arquitectures, protocols, plataformes i gateways disponibles. Entén les combinacions possibles abans de dissenyar el teu escenari.', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9eed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>) },
  { num: 2, title: 'Crea un Escenari', desc: "Defineix un escenari de benchmark: tria la combinació de tecnologies, configura la càrrega (missatges/segon, duració, mida del payload) i desa'l.", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9eed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>) },
  { num: 3, title: 'Executa el Benchmark', desc: "Llança l'escenari. El sistema desplegarà automàticament la infraestructura necessària (broker, gateway, producers, consumers) a Kubernetes.", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9eed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>) },
  { num: 4, title: 'Analitza els Resultats', desc: "Consulta les mètriques en temps real (Live) o l'historial de totes les execucions. Compara latència, throughput i taxa d'error entre combinacions.", icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9eed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>) },
];

const CATEGORIES = [
  { name: 'Arquitectures', count: 5, color: '#a5d8ff', items: ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'] },
  { name: 'Protocols', count: 8, color: '#b2f2bb', items: ['WebSockets', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'] },
  { name: 'Plataformes', count: 5, color: '#ffd8a8', items: ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'] },
  { name: 'Gateways', count: 6, color: '#d0bfff', items: ['Kong OSS', 'AWS EventBridge', 'Azure Event Grid', 'Google Eventarc', 'Solace PubSub+', 'Mosquitto'] },
];

const PREDEFINED_SCENARIOS = [
  {
    name: 'Kafka EDA Bàsic',
    architecture: 'EDA',
    protocol: 'Kafka',
    platform: 'Kafka',
    description: 'Event-Driven amb Apache Kafka com a broker i protocol. Proves de throughput alt.',
    color: '#b2f2bb',
    defaults: { duration: 60, rate: 1000, payloadSize: 256 },
  },
  {
    name: 'MQTT IoT Lightweight',
    architecture: 'EDA',
    protocol: 'MQTT',
    platform: 'RabbitMQ',
    description: 'Protocol lleuger per a IoT amb RabbitMQ. Baixa latència, baix consum.',
    color: '#d0bfff',
    defaults: { duration: 30, rate: 500, payloadSize: 128 },
  },
  {
    name: 'gRPC Alta Velocitat',
    architecture: 'LCA',
    protocol: 'gRPC',
    platform: 'NATS Server',
    description: 'Comunicació RPC asíncrona amb serialització binària. Màxima eficiència.',
    color: '#a5d8ff',
    defaults: { duration: 45, rate: 2000, payloadSize: 512 },
  },
  {
    name: 'WebSockets Temps Real',
    architecture: 'SEA',
    protocol: 'WS',
    platform: 'Kafka',
    description: 'Connexió bidireccional persistent per a streaming de dades en temps real.',
    color: '#ffd8a8',
    defaults: { duration: 60, rate: 800, payloadSize: 256 },
  },
];

export const HomePage = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const handleCreateScenario = (scenario: typeof PREDEFINED_SCENARIOS[0]) => {
    const params = new URLSearchParams({
      create: 'true',
      name: scenario.name,
      architecture: scenario.architecture,
      protocol: scenario.protocol,
      platform: scenario.platform,
      duration: String(scenario.defaults.duration),
      rate: String(scenario.defaults.rate),
      payloadSize: String(scenario.defaults.payloadSize),
    });
    window.location.href = `/escenaris?${params.toString()}`;
  };

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>APIs Asíncrones Benchmark Platform</h1>
        <p style={{ color: '#666', fontSize: 16, marginTop: 8 }}>
          Plataforma per experimentar, comparar i analitzar el rendiment de combinacions d'APIs asíncrones.
          Desplega arquitectures reals sobre Kubernetes i mesura latència, throughput i fiabilitat.
        </p>
        <span style={{ fontSize: 13, color: '#999' }}>{time.toLocaleString('ca')}</span>
      </div>

      {/* Com funciona */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 24, marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 20 }}>Com funciona?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ background: 'white', borderRadius: 8, padding: 16, borderTop: '3px solid #4a9eed' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ background: '#4a9eed', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{s.num}</div>
                {s.icon}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Escenaris Predeterminats */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Escenaris Predeterminats</h2>
          <a href="/escenaris" style={{ color: '#4a9eed', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Veure tots els escenaris →
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {PREDEFINED_SCENARIOS.map(sc => (
            <div key={sc.name} style={{ background: 'white', borderRadius: 8, padding: 20, border: '1px solid #e0e0e0', borderLeft: `4px solid ${sc.color}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{sc.name}</div>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: '0 0 12px' }}>{sc.description}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ background: '#e8f4fd', color: '#1a73e8', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{sc.architecture}</span>
                  <span style={{ background: '#e6f4ea', color: '#137333', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{sc.protocol}</span>
                  <span style={{ background: '#fef7e0', color: '#b06000', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{sc.platform}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#999' }}>
                  <span>{sc.defaults.duration}s duració</span>
                  <span>{sc.defaults.rate} msg/s</span>
                  <span>{sc.defaults.payloadSize}B payload</span>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <button onClick={() => handleCreateScenario(sc)} style={{ background: '#4a9eed', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Crear escenari
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contingut del Catàleg */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Contingut del Catàleg</h2>
          <a href="/catalog" style={{ color: '#4a9eed', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Explorar catàleg →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {CATEGORIES.map(c => (
            <div key={c.name} style={{ background: c.color, borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: '#444', marginBottom: 10 }}>{c.count} components</div>
              {c.items.map(i => (
                <div key={i} style={{ fontSize: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 4, padding: '2px 6px', marginBottom: 4 }}>{i}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Accions ràpides */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 24 }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 20 }}>Accions ràpides</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <a href="/catalog" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#4a9eed', color: 'white', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            Explorar catàleg
          </a>
          <a href="/escenaris?create=true" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#333', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600, border: '1px solid #ddd' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Crear escenari
          </a>
          <a href="/resultats" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'white', color: '#333', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600, border: '1px solid #ddd' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            Veure resultats
          </a>
        </div>
      </div>

    </div>
  );
};
