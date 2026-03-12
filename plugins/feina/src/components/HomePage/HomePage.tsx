import { useEffect, useState } from 'react';

const STEPS = [
  { num: 1, title: 'Explora el Catàleg', desc: 'Consulta les arquitectures, protocols, plataformes i gateways disponibles. Entén les combinacions possibles abans de dissenyar el teu escenari.' },
  { num: 2, title: 'Crea un Escenari', desc: 'Defineix un escenari de benchmark: tria la combinació de tecnologies, configura la càrrega (missatges/segon, duració, mida del payload) i desa\'l.' },
  { num: 3, title: 'Executa el Benchmark', desc: 'Llança l\'escenari. El sistema desplegarà automàticament la infraestructura necessària (broker, gateway, producers, consumers) a Kubernetes.' },
  { num: 4, title: 'Analitza els Resultats', desc: 'Consulta les mètriques en temps real (Live) o l\'historial de totes les execucions. Compara latència, throughput i taxa d\'error entre combinacions.' },
];

const CATEGORIES = [
  { name: 'Arquitectures', count: 5, color: '#a5d8ff', items: ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'] },
  { name: 'Protocols', count: 8, color: '#b2f2bb', items: ['WebSockets', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'] },
  { name: 'Plataformes', count: 5, color: '#ffd8a8', items: ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'] },
  { name: 'Gateways', count: 6, color: '#d0bfff', items: ['Kong OSS', 'AWS EventBridge', 'Azure Event Grid', 'Google Eventarc', 'Solace PubSub+', 'Mosquitto'] },
];

export const HomePage = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>APIs Asíncrones — Benchmark Platform</h1>
        <p style={{ color: '#666', fontSize: 16, marginTop: 8 }}>
          Plataforma per experimentar, comparar i analitzar el rendiment de combinacions d'APIs asíncrones.
          Desplega arquitectures reals sobre Kubernetes i mesura latència, throughput i fiabilitat.
        </p>
        <span style={{ fontSize: 13, color: '#999' }}>{time.toLocaleString('ca')}</span>
      </div>

      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 24, marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 20 }}>Com funciona?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STEPS.map(s => (
            <div key={s.num} style={{ background: 'white', borderRadius: 8, padding: 16, borderTop: '3px solid #4a9eed' }}>
              <div style={{ background: '#4a9eed', color: 'white', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginBottom: 10 }}>{s.num}</div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 20 }}>Contingut del Catàleg</h2>
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

    </div>
  );
};
