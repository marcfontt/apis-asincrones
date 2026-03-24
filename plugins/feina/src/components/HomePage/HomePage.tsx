import { useEffect, useState } from 'react';

const STEPS = [
  { num: 1, title: 'Explora el Catàleg',    desc: 'Consulta les arquitectures, protocols, plataformes i gateways disponibles. Entén les combinacions possibles abans de dissenyar el teu escenari.',   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { num: 2, title: 'Crea un Escenari',       desc: "Defineix un escenari de benchmark: tria la combinació de tecnologies, configura la càrrega (missatges/segon, duració, mida del payload) i desa'l.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
  { num: 3, title: 'Executa el Benchmark',   desc: "Llança l'escenari. El sistema desplegarà automàticament la infraestructura necessària (broker, gateway, producers, consumers) a Kubernetes.",    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
  { num: 4, title: 'Analitza els Resultats', desc: "Consulta les mètriques en temps real (Live) o l'historial de totes les execucions. Compara latència, throughput i taxa d'error entre combinacions.", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
];

const CATEGORIES = [
  { name: 'Arquitectures', count: 5, accent: 'var(--accent)',   bg: 'rgba(88,166,255,0.1)',  items: ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'] },
  { name: 'Protocols',     count: 8, accent: 'var(--success)',  bg: 'rgba(63,185,80,0.1)',   items: ['WebSockets', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'] },
  { name: 'Plataformes',   count: 5, accent: 'var(--warning)',  bg: 'rgba(210,153,34,0.1)',  items: ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'] },
  { name: 'Gateways',      count: 6, accent: 'var(--special)',  bg: 'rgba(188,140,255,0.1)', items: ['Kong OSS', 'AWS EventBridge', 'Azure Event Grid', 'Google Eventarc', 'Solace PubSub+', 'Mosquitto'] },
];

const PREDEFINED_SCENARIOS = [
  { name: 'Kafka EDA Bàsic',      architecture: 'EDA', protocol: 'Kafka', platform: 'Kafka',       description: 'Event-Driven amb Apache Kafka com a broker i protocol. Proves de throughput alt.',        defaults: { duration: 60,  rate: 1000, payloadSize: 256 } },
  { name: 'MQTT IoT Lightweight', architecture: 'EDA', protocol: 'MQTT',  platform: 'RabbitMQ',    description: 'Protocol lleuger per a IoT amb RabbitMQ. Baixa latència, baix consum.',                   defaults: { duration: 30,  rate: 500,  payloadSize: 128 } },
  { name: 'gRPC Alta Velocitat',  architecture: 'LCA', protocol: 'gRPC',  platform: 'NATS Server', description: 'Comunicació RPC asíncrona amb serialització binària. Màxima eficiència.',                 defaults: { duration: 45,  rate: 2000, payloadSize: 512 } },
  { name: 'WebSockets Temps Real',architecture: 'SEA', protocol: 'WS',    platform: 'Kafka',       description: 'Connexió bidireccional persistent per a streaming de dades en temps real.',               defaults: { duration: 60,  rate: 800,  payloadSize: 256 } },
];

export const HomePage = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => { document.title = 'Home | APIs Asíncrones'; }, []);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const handleCreateScenario = (sc: typeof PREDEFINED_SCENARIOS[0]) => {
    const params = new URLSearchParams({
      create: 'true', name: sc.name, architecture: sc.architecture,
      protocol: sc.protocol, platform: sc.platform,
      duration: String(sc.defaults.duration), rate: String(sc.defaults.rate),
      payloadSize: String(sc.defaults.payloadSize),
    });
    window.location.href = `/escenaris?${params.toString()}`;
  };

  const card: React.CSSProperties    = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 };
  const section: React.CSSProperties = { ...card, padding: 24, marginBottom: 32 };

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto', background: 'var(--bg-main)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* Capçalera */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>APIs Asíncrones Benchmark Platform</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 8, lineHeight: 1.6 }}>
          Plataforma per experimentar, comparar i analitzar el rendiment de combinacions d'APIs asíncrones.
          Desplega arquitectures reals sobre Kubernetes i mesura latència, throughput i fiabilitat.
        </p>
        <span style={{ fontSize: 13, color: 'var(--text-disabled)', fontFamily: 'monospace' }}>{time.toLocaleString('ca-ES')}</span>
      </div>

      {/* Com funciona */}
      <div style={section}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Com funciona?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ ...card, borderTop: `3px solid var(--accent)`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ background: 'var(--accent)', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{s.num}</div>
                {s.icon}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Escenaris Predeterminats */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Escenaris Predeterminats</h2>
          <a href="/escenaris" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Veure tots els escenaris →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {PREDEFINED_SCENARIOS.map(sc => (
            <div key={sc.name} style={{ ...card, borderLeft: `4px solid var(--accent)`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--text-primary)' }}>{sc.name}</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 12px' }}>{sc.description}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ background: 'rgba(88,166,255,0.15)',  color: 'var(--accent)',   padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{sc.architecture}</span>
                  <span style={{ background: 'rgba(63,185,80,0.15)',   color: 'var(--success)',  padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{sc.protocol}</span>
                  <span style={{ background: 'rgba(210,153,34,0.15)',  color: 'var(--warning)',  padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>{sc.platform}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-disabled)', fontFamily: 'monospace' }}>
                  <span>{sc.defaults.duration}s durada</span>
                  <span>{sc.defaults.rate} msg/s</span>
                  <span>{sc.defaults.payloadSize}B payload</span>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <button onClick={() => handleCreateScenario(sc)} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Contingut del Catàleg</h2>
          <a href="/catalog" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Explorar catàleg →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {CATEGORIES.map(c => (
            <div key={c.name} style={{ background: c.bg, border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: c.accent }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{c.count} components</div>
              {c.items.map(item => (
                <div key={item} style={{ fontSize: 12, background: 'var(--bg-card)', borderRadius: 4, padding: '2px 8px', marginBottom: 4, color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{item}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Accions ràpides */}
      <div style={section}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Accions ràpides</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/catalog" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Explorar catàleg
          </a>
          <a href="/escenaris?create=true" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600, border: '1px solid var(--border)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Crear escenari
          </a>
          <a href="/resultats" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600, border: '1px solid var(--border)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Veure resultats
          </a>
        </div>
      </div>

    </div>
  );
};
