import { useEffect, useState } from 'react';
import { COLORS, CATEGORY_COLORS, S } from '../../theme';

const STEPS = [
  {
    num: 1,
    title: 'Explora el Catàleg',
    desc: "Consulta les arquitectures, protocols, plataformes i gateways disponibles. Entén les combinacions possibles abans de dissenyar el teu escenari.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    num: 2,
    title: 'Crea un Escenari',
    desc: "Defineix un escenari de benchmark: tria la combinació de tecnologies, configura la càrrega (missatges/segon, duració, mida del payload) i desa'l.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    num: 3,
    title: 'Executa el Benchmark',
    desc: "Llança l'escenari. El sistema desplegarà la infraestructura necessària (broker, gateway, producers, consumers) a Kubernetes.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d29922" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    num: 4,
    title: 'Analitza els Resultats',
    desc: "Consulta les mètriques en temps real (Live) o l'historial de totes les execucions. Compara latència, throughput i taxa d'error entre combinacions.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bc8cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const PREDEFINED_SCENARIOS = [
  {
    name: 'Kafka — EDA Bàsic',
    architecture: 'EDA',
    protocol: 'Kafka',
    platform: 'Kafka',
    description: 'Escenari Event-Driven amb Apache Kafka com a broker i protocol. Ideal per a proves de throughput alt.',
    color: CATEGORY_COLORS.protocol,
    defaults: { duration: 60, rate: 1000, payloadSize: 256 },
  },
  {
    name: 'MQTT — IoT Lightweight',
    architecture: 'EDA',
    protocol: 'MQTT',
    platform: 'RabbitMQ',
    description: 'Protocol lleuger per a dispositius IoT amb RabbitMQ com a broker. Baixa latència, baix consum.',
    color: CATEGORY_COLORS.gateway,
    defaults: { duration: 30, rate: 500, payloadSize: 128 },
  },
  {
    name: 'gRPC — Alta Velocitat',
    architecture: 'LCA',
    protocol: 'gRPC',
    platform: 'NATS Server',
    description: 'Comunicació RPC asíncrona amb serialització binària. Màxima eficiència en throughput.',
    color: CATEGORY_COLORS.architecture,
    defaults: { duration: 45, rate: 2000, payloadSize: 512 },
  },
  {
    name: 'WebSockets — Temps Real',
    architecture: 'SEA',
    protocol: 'WS',
    platform: 'Kafka',
    description: 'Connexió bidireccional persistent per a streaming de dades en temps real.',
    color: '#39d0d4',
    defaults: { duration: 60, rate: 800, payloadSize: 256 },
  },
];

const CATEGORIES = [
  { name: 'Arquitectures', count: 5, color: CATEGORY_COLORS.architecture, items: ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'] },
  { name: 'Protocols', count: 8, color: CATEGORY_COLORS.protocol, items: ['WebSockets', 'SSE', 'gRPC', 'MQTT', 'AMQP', 'CoAP', 'NATS', 'Kafka'] },
  { name: 'Plataformes', count: 5, color: CATEGORY_COLORS.platform, items: ['Kafka', 'RabbitMQ', 'Confluent', 'Pulsar', 'NATS Server'] },
  { name: 'Gateways', count: 6, color: CATEGORY_COLORS.gateway, items: ['Kong OSS', 'EventBridge', 'Event Grid', 'Eventarc', 'Solace', 'Mosquitto'] },
];

export const HomePage = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h1 style={{ fontSize: 28, margin: 0, fontWeight: 700, color: COLORS.textPrimary }}>
            APIs Asíncrones — Benchmark Platform
          </h1>
        </div>
        <p style={{ color: COLORS.textSecondary, fontSize: 15, marginTop: 8, maxWidth: 720, lineHeight: 1.6 }}>
          Plataforma per experimentar, comparar i analitzar el rendiment de combinacions d&apos;APIs asíncrones.
          Desplega arquitectures reals sobre Kubernetes i mesura latència, throughput i fiabilitat.
        </p>
        <span style={{ fontSize: 12, color: COLORS.textDisabled, fontFamily: 'monospace' }}>
          {time.toLocaleString('ca-ES')}
        </span>
      </div>

      {/* Com funciona */}
      <div style={{ ...S.card, marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 18, color: COLORS.textPrimary, fontWeight: 600 }}>
          Com funciona?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STEPS.map(s => (
            <div
              key={s.num}
              style={{
                background: COLORS.bgMain,
                borderRadius: 8,
                padding: 20,
                border: `1px solid ${COLORS.border}`,
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: COLORS.bgHover,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {s.icon}
                </div>
                <span style={{ fontSize: 11, color: COLORS.textDisabled, fontWeight: 600, fontFamily: 'monospace' }}>
                  PAS {s.num}
                </span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14, color: COLORS.textPrimary }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Escenaris Predeterminats */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: COLORS.textPrimary, fontWeight: 600 }}>
              Escenaris Predeterminats
            </h2>
            <p style={{ margin: '4px 0 0', color: COLORS.textSecondary, fontSize: 13 }}>
              Configuracions de prova preparades per executar directament
            </p>
          </div>
          <a
            href="/escenaris?create=true"
            style={{
              ...S.btn,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Crear escenari personalitzat
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {PREDEFINED_SCENARIOS.map(sc => (
            <div
              key={sc.name}
              style={{
                ...S.card,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: `3px solid ${sc.color}`,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = COLORS.bgHover)}
              onMouseLeave={e => (e.currentTarget.style.background = COLORS.bgCard)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>{sc.name}</span>
                </div>
                <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5, margin: '0 0 14px' }}>
                  {sc.description}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={S.badge(CATEGORY_COLORS.architecture)}>{sc.architecture}</span>
                  <span style={S.badge(CATEGORY_COLORS.protocol)}>{sc.protocol}</span>
                  <span style={S.badge(CATEGORY_COLORS.platform)}>{sc.platform}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLORS.textDisabled, fontFamily: 'monospace' }}>
                  <span>{sc.defaults.duration}s</span>
                  <span>{sc.defaults.rate} msg/s</span>
                  <span>{sc.defaults.payloadSize}B payload</span>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button
                  style={{ ...S.btnPrimary, fontSize: 13, padding: '6px 14px' }}
                  onClick={() => handleCreateScenario(sc)}
                >
                  Crear escenari
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contingut del Catàleg */}
      <div>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 18, color: COLORS.textPrimary, fontWeight: 600 }}>
          Contingut del Catàleg
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {CATEGORIES.map(c => (
            <div
              key={c.name}
              style={{
                ...S.card,
                borderTop: `3px solid ${c.color}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.textPrimary }}>{c.name}</span>
                <span
                  style={{
                    background: c.color + '22',
                    color: c.color,
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {c.count}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {c.items.map(i => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: COLORS.textSecondary,
                      background: COLORS.bgMain,
                      borderRadius: 4,
                      padding: '4px 10px',
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    {i}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
