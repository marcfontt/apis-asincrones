import { useEffect, useState } from 'react';

const STEPS = [
  {
    num: 1, icon: '📦', title: 'Explora el Catàleg',
    desc: 'Consulta les 24 combinacions predefinides: 5 arquitectures, 8 protocols, 5 plataformes i 6 gateways. Entén quines combinacions tenen sentit tècnic abans de dissenyar el teu escenari.',
    link: '/catalog', linkText: 'Veure Catàleg',
  },
  {
    num: 2, icon: '⚙️', title: 'Crea un Escenari',
    desc: 'Defineix un escenari de benchmark: tria la plataforma (Kafka, RabbitMQ...), l\'arquitectura compatible (EDA, QBA...), el protocol i configura la càrrega — missatges/segon, duració i mida del payload.',
    link: '/escenaris', linkText: 'Crear Escenari',
  },
  {
    num: 3, icon: '🚀', title: 'Executa el Benchmark',
    desc: 'Llança l\'escenari. El sistema desplegarà automàticament la infraestructura necessària al clúster Kubernetes d\'Azure (AKS): broker, producers i consumers configurats i a punt.',
    link: '/escenaris', linkText: 'Executar',
  },
  {
    num: 4, icon: '📊', title: 'Analitza els Resultats',
    desc: 'Consulta les mètriques en temps real o l\'historial complet. Compara latència, throughput i taxa d\'error entre combinacions per prendre decisions d\'arquitectura basades en dades reals.',
    link: '/resultats', linkText: 'Veure Resultats',
  },
];

const CATEGORIES = [
  {
    key: 'architectures', name: 'Arquitectures', count: 5,
    accent: '#0969da',
    desc: 'Patrons de disseny per sistemes event-driven',
    items: [
      { name: 'EDA', full: 'Event-Driven Architecture' },
      { name: 'QBA', full: 'Queue-Based Architecture' },
      { name: 'LCA', full: 'Log-Centric Architecture' },
      { name: 'EMA', full: 'Event Mesh Architecture' },
      { name: 'SEA', full: 'Streaming Event Architecture' },
    ],
  },
  {
    key: 'protocols', name: 'Protocols', count: 8,
    accent: '#1a7f37',
    desc: 'Protocols de comunicació asíncrona',
    items: [
      { name: 'WebSockets', full: 'Full-duplex sobre HTTP' },
      { name: 'SSE', full: 'Server-Sent Events' },
      { name: 'gRPC', full: 'Google Remote Procedure Call' },
      { name: 'MQTT', full: 'IoT Messaging Protocol' },
      { name: 'AMQP', full: 'Advanced Message Queuing' },
      { name: 'CoAP', full: 'Constrained Application Protocol' },
      { name: 'NATS', full: 'Neural Autonomic Transport' },
      { name: 'Kafka', full: 'Apache Kafka Protocol' },
    ],
  },
  {
    key: 'platforms', name: 'Plataformes', count: 5,
    accent: '#9a6700',
    desc: 'Brokers i sistemes de missatgeria',
    items: [
      { name: 'Kafka', full: 'Apache Kafka — Log distribuït' },
      { name: 'RabbitMQ', full: 'Message broker AMQP' },
      { name: 'Confluent', full: 'Kafka gestionat al núvol' },
      { name: 'Pulsar', full: 'Multi-tenant, geo-replicat' },
      { name: 'NATS Server', full: 'Missatgeria lleugera i ràpida' },
    ],
  },
  {
    key: 'gateways', name: 'Gateways', count: 6,
    accent: '#8250df',
    desc: 'Event gateways i API managers',
    items: [
      { name: 'Kong OSS', full: 'API Gateway open-source' },
      { name: 'EventBridge', full: 'AWS Event Bus gestionat' },
      { name: 'Event Grid', full: 'Azure Event Grid' },
      { name: 'Eventarc', full: 'Google Cloud Eventarc' },
      { name: 'Solace', full: 'Solace PubSub+ Event Mesh' },
      { name: 'Mosquitto', full: 'Eclipse MQTT Broker' },
    ],
  },
];

const TECH_STACK = [
  { name: 'Azure AKS', desc: 'Kubernetes gestionat', icon: '☁️' },
  { name: 'Strimzi', desc: 'Kafka sobre K8s', icon: '📨' },
  { name: 'Elasticsearch', desc: 'Emmagatzematge de mètriques', icon: '🔍' },
  { name: 'Grafana', desc: 'Visualització en temps real', icon: '📈' },
  { name: 'Backstage', desc: 'Developer portal', icon: '🎛️' },
];

export const HomePage = () => {
  const [time, setTime] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState('architectures');

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeCat = CATEGORIES.find(c => c.key === activeCategory)!;

  return (
    <div style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>

      {/* HERO */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'inline-block', background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 600, marginBottom: 16, letterSpacing: 0.5 }}>
              TFG · Enginyeria Informàtica · UdG 2025
            </div>
            <h1 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.2, color: 'var(--text-primary)' }}>
              APIs Asíncrones<br />
              <span style={{ color: 'var(--accent)' }}>Benchmark Platform</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 560, margin: 0 }}>
              Plataforma per experimentar, comparar i analitzar el rendiment de combinacions d'APIs asíncrones.
              Desplega arquitectures reals sobre Kubernetes i mesura latència, throughput i fiabilitat.
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/escenaris" style={{ background: 'var(--accent)', color: 'white', padding: '10px 22px', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
                Crear Escenari →
              </a>
              <a href="/catalog" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '10px 22px', borderRadius: 6, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid var(--border)' }}>
                Explorar Catàleg
              </a>
            </div>
          </div>
          <div style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {time.toLocaleTimeString('ca')}
            </div>
            <div>{time.toLocaleDateString('ca', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
        {[
          { label: 'Arquitectures', value: '5', color: '#0969da' },
          { label: 'Protocols', value: '8', color: '#1a7f37' },
          { label: 'Plataformes', value: '5', color: '#9a6700' },
          { label: 'Gateways', value: '6', color: '#8250df' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* COM FUNCIONA */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>Com funciona?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ background: 'var(--accent)', color: 'white', width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{s.num}</div>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>{s.desc}</div>
              <a href={s.link} style={{ marginTop: 14, fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>{s.linkText} →</a>
            </div>
          ))}
        </div>
      </div>

      {/* CATÀLEG INTERACTIU */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Contingut del Catàleg</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>24 components predefinits en 4 categories</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setActiveCategory(c.key)} style={{
              padding: '8px 18px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: activeCategory === c.key ? c.accent : 'var(--bg-card)',
              color: activeCategory === c.key ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${activeCategory === c.key ? c.accent : 'var(--border)'}`,
            }}>{c.name} ({c.count})</button>
          ))}
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{activeCat.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, marginLeft: 10 }}>{activeCat.desc}</span>
            </div>
            <span style={{ background: activeCat.accent + '18', color: activeCat.accent, border: `1px solid ${activeCat.accent}44`, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{activeCat.count} components</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {activeCat.items.map(item => (
              <div key={item.name} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.full}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TECH STACK */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>Infraestructura</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {TECH_STACK.map(t => (
            <div key={t.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
