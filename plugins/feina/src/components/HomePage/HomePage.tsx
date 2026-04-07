import { useEffect, useState } from 'react';
import { S, GLOBAL_CSS } from '../../theme';

const STEPS = [
  { num: 1, color: '#2563eb', title: 'Explora el Catàleg',      desc: 'Revisa les arquitectures, protocols, plataformes i gateways disponibles.', href: '/catalog',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { num: 2, color: '#16a34a', title: 'Configura un Escenari',   desc: 'Defineix arquitectura, protocol i plataforma. Ajusta la carrega.',           href: '/escenaris', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
  { num: 3, color: '#d97706', title: 'Llança el Benchmark',     desc: 'El sistema desplega automàticament la infraestructura a Kubernetes.',         href: '/escenaris', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
  { num: 4, color: '#7c3aed', title: 'Analitza els Resultats',  desc: "Compara latència, throughput i taxa d'error en temps real.",                  href: '/resultats', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
];

const CATEGORIES = [
  { key: 'architecture', name: 'Arquitectures', count: 5, color: '#2563eb', items: ['EDA','QBA','LCA','EMA','SEA'],                                                      href: '/catalog' },
  { key: 'protocol',     name: 'Protocols',     count: 8, color: '#16a34a', items: ['MQTT','AMQP','gRPC','WebSockets','SSE','CoAP','NATS','Kafka'],                      href: '/catalog' },
  { key: 'platform',     name: 'Plataformes',   count: 5, color: '#d97706', items: ['Apache Kafka','RabbitMQ','Confluent','Apache Pulsar','NATS Server'],                 href: '/catalog' },
  { key: 'gateway',      name: 'Gateways',      count: 6, color: '#7c3aed', items: ['Kong OSS','AWS EventBridge','Azure Event Grid','Google Eventarc','Solace PubSub+','Mosquitto'], href: '/catalog' },
];

const QUICK_SCENARIOS = [
  { name: 'Kafka EDA - Alta Càrrega',       architecture: 'EDA', protocol: 'Kafka', platform: 'Kafka',       description: 'Throughput màxim amb Apache Kafka. Ideal per validar limits de capacitat.',    defaults: { duration: 60, rate: 1000, payloadSize: 256 }, accentColor: '#ef4444' },
  { name: 'MQTT IoT - Baix Consum',         architecture: 'EDA', protocol: 'MQTT',  platform: 'RabbitMQ',    description: 'Protocol lleuger per a escenaris IoT. Baix overhead, latència minima.',        defaults: { duration: 30, rate: 500,  payloadSize: 128 }, accentColor: '#16a34a' },
  { name: 'gRPC - Serialització Binària',   architecture: 'LCA', protocol: 'gRPC',  platform: 'NATS Server', description: 'Comunicació RPC asíncrona amb serialització binària.',                        defaults: { duration: 45, rate: 2000, payloadSize: 512 }, accentColor: '#7c3aed' },
  { name: 'WebSockets - Temps Real',        architecture: 'SEA', protocol: 'WS',    platform: 'Kafka',       description: 'Connexió bidireccional persistent per a streaming en temps real.',             defaults: { duration: 60, rate: 800,  payloadSize: 256 }, accentColor: '#d97706' },
];

const STATS = [
  { label: 'Arquitectures', value: '5',    color: '#2563eb', href: '/catalog' },
  { label: 'Protocols',     value: '8',    color: '#16a34a', href: '/catalog' },
  { label: 'Plataformes',   value: '5',    color: '#d97706', href: '/catalog' },
  { label: 'Combinacions',  value: '200+', color: '#7c3aed', href: '/escenaris' },
];

const DATA_FORMATS = [
  { key: 'default',   label: 'Per defecte', color: '#64748b', icon: '📦', desc: 'Payload generic de mida fixa. Base de referencia per a totes les comparatives.',                                        payload: '256 B',   rate: 'variable' },
  { key: 'iot',       label: 'IoT',         color: '#10b981', icon: '🌡', desc: 'Simulacio de sensors: temperatura, humitat, estat. Missatges petits i alta freqüència.',                               payload: '64-128 B', rate: 'alt' },
  { key: 'financial', label: 'Financer',    color: '#0ea5e9', icon: '💹', desc: 'Operacions de trading i dades de mercat. Baix volum per missatge, latència critica.',                                  payload: '512 B',   rate: 'moderat' },
  { key: 'video-4k',  label: 'Video 4K',    color: '#8b5cf6', icon: '🎬', desc: 'Fragments de stream de video en resolucio 4K. Alta pressio sobre el broker i la xarxa.',                              payload: '64 KB',   rate: 'baix' },
  { key: 'video-8k',  label: 'Video 8K',    color: '#7c3aed', icon: '🎥', desc: 'Cas extrem de streaming 8K. Mesura la capacitat maxima del sistema en condicions de càrrega màxima.', payload: '256 KB',  rate: 'molt baix' },
];

export const HomePage = () => {
  const [hoveredStep,     setHoveredStep]     = useState<number | null>(null);
  const [hoveredScenario, setHoveredScenario] = useState<number | null>(null);
  const [hoveredCat,      setHoveredCat]      = useState<number | null>(null);
  const [hoveredStat,     setHoveredStat]     = useState<number | null>(null);
  const [hoveredFormat,   setHoveredFormat]   = useState<number | null>(null);
  const [hoveredHeroBtn,  setHoveredHeroBtn]  = useState<number | null>(null);
  const [hoveredFooter,   setHoveredFooter]   = useState<number | null>(null);

  useEffect(() => { document.title = 'Inici | APIs Asíncrones'; }, []);

  const handleCreateScenario = (sc: typeof QUICK_SCENARIOS[0]) => {
    const params = new URLSearchParams({
      create: 'true', name: sc.name, architecture: sc.architecture,
      protocol: sc.protocol, platform: sc.platform,
      duration: String(sc.defaults.duration), rate: String(sc.defaults.rate),
      payloadSize: String(sc.defaults.payloadSize),
    });
    window.location.href = '/escenaris?' + params.toString();
  };

  return (
    <div style={{ ...S.page, paddingTop: 32 }}>
      <style>{GLOBAL_CSS}</style>

      {/* Hero */}
      <div style={{ marginBottom: 36, padding: '36px 40px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 420, height: '100%', background: 'linear-gradient(135deg, transparent 40%, rgba(37,99,235,0.04) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--badge-blue-bg)', color: 'var(--badge-blue-fg)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 20, marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--badge-blue-fg)', display: 'inline-block' }} />
            Plataforma de Benchmark · AKS
          </div>
          <h1 style={{ margin: '0 0 12px', fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Mesura el rendiment de les<br /><span style={{ color: 'var(--accent)' }}>APIs Asíncrones</span> en temps real
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, margin: '0 0 28px', lineHeight: 1.65, maxWidth: 600 }}>
            Dissenya escenaris de benchmark, desplega infraestructura real sobre Kubernetes i analitza latència, throughput i fiabilitat.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/escenaris?create=true"
              onMouseEnter={() => setHoveredHeroBtn(0)} onMouseLeave={() => setHoveredHeroBtn(null)}
              style={{ ...S.btnPrimary, textDecoration: 'none', fontSize: 14, opacity: hoveredHeroBtn === 0 ? 0.88 : 1, transform: hoveredHeroBtn === 0 ? 'translateY(-1px)' : 'none', transition: 'opacity 0.15s, transform 0.15s' }}>+ Crear escenari</a>
            <a href="/resultats"
              onMouseEnter={() => setHoveredHeroBtn(1)} onMouseLeave={() => setHoveredHeroBtn(null)}
              style={{ ...S.btn, textDecoration: 'none', fontSize: 14, opacity: hoveredHeroBtn === 1 ? 0.88 : 1, transform: hoveredHeroBtn === 1 ? 'translateY(-1px)' : 'none', transition: 'opacity 0.15s, transform 0.15s' }}>Resultats en viu</a>
            <a href="/catalog"
              onMouseEnter={() => setHoveredHeroBtn(2)} onMouseLeave={() => setHoveredHeroBtn(null)}
              style={{ ...S.btn, textDecoration: 'none', fontSize: 14, opacity: hoveredHeroBtn === 2 ? 0.88 : 1, transform: hoveredHeroBtn === 2 ? 'translateY(-1px)' : 'none', transition: 'opacity 0.15s, transform 0.15s' }}>Explorar catàleg</a>
          </div>

          {/* Stats interactives */}
          <div style={{ display: 'flex', gap: 20, marginTop: 28, paddingTop: 24, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {STATS.map((stat, i) => (
              <a key={stat.label} href={stat.href}
                onMouseEnter={() => setHoveredStat(i)} onMouseLeave={() => setHoveredStat(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                  padding: '6px 12px', borderRadius: 8, border: '1px solid transparent',
                  background: hoveredStat === i ? stat.color + '22' : 'transparent',
                  borderColor: hoveredStat === i ? stat.color + '55' : 'transparent',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: stat.color + '14', color: stat.color, flexShrink: 0, fontSize: 16, fontWeight: 800 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 12, color: hoveredStat === i ? stat.color : 'var(--text-secondary)', fontWeight: hoveredStat === i ? 700 : 500, transition: 'color 0.15s' }}>
                  {stat.label}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Com funciona */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Com funciona</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {STEPS.map((step, i) => (
            <a key={step.num} href={step.href}
              onMouseEnter={() => setHoveredStep(i)} onMouseLeave={() => setHoveredStep(null)}
              style={{
                ...S.card, padding: 18, textDecoration: 'none', display: 'block',
                borderTop: `2px solid ${step.color}`,
                boxShadow: hoveredStep === i ? `0 4px 20px ${step.color}28` : 'none',
                transform: hoveredStep === i ? 'translateY(-2px)' : 'none',
                background: hoveredStep === i ? step.color + '12' : 'var(--bg-card)',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                  {step.num}
                </div>
                <span style={{ color: hoveredStep === i ? step.color : 'var(--text-disabled)', transition: 'color 0.15s' }}>{step.icon}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: hoveredStep === i ? step.color : 'var(--text-primary)', lineHeight: 1.3, transition: 'color 0.15s' }}>{step.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{step.desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Escenaris predefinits */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Escenaris predefinits</h2>
          <a href="/escenaris" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Veure tots</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {QUICK_SCENARIOS.map((sc, i) => (
            <div key={sc.name}
              onMouseEnter={() => setHoveredScenario(i)} onMouseLeave={() => setHoveredScenario(null)}
              style={{
                ...S.card, borderLeft: `3px solid ${sc.accentColor}`,
                display: 'flex', flexDirection: 'column', gap: 12,
                background: hoveredScenario === i ? sc.accentColor + '12' : 'var(--bg-card)',
                boxShadow: hoveredScenario === i ? `0 4px 20px ${sc.accentColor}28` : 'none',
                transform: hoveredScenario === i ? 'translateY(-1px)' : 'none',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)', lineHeight: 1.3 }}>{sc.name}</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{sc.description}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ ...S.badge('#2563eb'), fontSize: 11 }}>{sc.architecture}</span>
                <span style={{ ...S.badge('#16a34a'), fontSize: 11 }}>{sc.protocol}</span>
                <span style={{ ...S.badge('#d97706'), fontSize: 11 }}>{sc.platform}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-disabled)', fontFamily: 'var(--font-mono)' }}>
                  <span>{sc.defaults.duration}s</span><span>{sc.defaults.rate} msg/s</span><span>{sc.defaults.payloadSize}B</span>
                </div>
                <button onClick={() => handleCreateScenario(sc)}
                  style={{ background: sc.accentColor, color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Crear
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formats de dades */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Formats de dades</h2>
          <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>Seleccionables a cada escenari</span>
        </div>
        <p style={{ margin: '-6px 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Cada format simula un cas d&apos;ús real i determina la mida del payload, la freqüència d&apos;enviament i la pressió sobre el broker.
          El format <strong>Per defecte</strong> s&apos;utilitza com a línia base de comparació neutral.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {DATA_FORMATS.map((fmt, i) => (
            <div key={fmt.key}
              onMouseEnter={() => setHoveredFormat(i)} onMouseLeave={() => setHoveredFormat(null)}
              style={{
                ...S.card, padding: '16px 14px', cursor: 'default',
                borderTop: `2px solid ${fmt.color}`,
                background: hoveredFormat === i ? fmt.color + '16' : 'var(--bg-card)',
                boxShadow: hoveredFormat === i ? `0 4px 16px ${fmt.color}22` : 'none',
                transform: hoveredFormat === i ? 'translateY(-2px)' : 'none',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 8 }}>{fmt.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: fmt.color, marginBottom: 6 }}>{fmt.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{fmt.desc}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Payload</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: fmt.color }}>{fmt.payload}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Freqüència</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmt.rate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Components del cataleg */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Components del cataleg</h2>
          <a href="/catalog" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Explorar</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {CATEGORIES.map((cat, i) => (
            <a key={cat.key} href={cat.href}
              onMouseEnter={() => setHoveredCat(i)} onMouseLeave={() => setHoveredCat(null)}
              style={{
                ...S.card, textDecoration: 'none', display: 'block',
                borderTop: `2px solid ${cat.color}`,
                background: hoveredCat === i ? cat.color + '15' : 'var(--bg-card)',
                boxShadow: hoveredCat === i ? `0 4px 20px ${cat.color}28` : 'none',
                transform: hoveredCat === i ? 'translateY(-2px)' : 'none',
                transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: cat.color }}>{cat.name}</div>
                <span style={{ ...S.badge(cat.color), fontSize: 11 }}>{cat.count}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {cat.items.slice(0, 4).map(item => (
                  <div key={item} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '3px 8px', background: 'var(--bg-hover)', borderRadius: 4, border: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item}
                  </div>
                ))}
                {cat.items.length > 4 && <div style={{ fontSize: 11, color: 'var(--text-disabled)', paddingLeft: 8, marginTop: 2 }}>+{cat.items.length - 4} mes</div>}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>APIs Asíncrones</strong> - Plataforma de benchmark per a APIs sobre AKS
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Escenaris', href: '/escenaris' }, { label: 'Execucions', href: '/execucions' }, { label: 'Resultats', href: '/resultats' }].map((link, i) => (
            <a key={link.href} href={link.href}
              onMouseEnter={() => setHoveredFooter(i)} onMouseLeave={() => setHoveredFooter(null)}
              style={{ fontSize: 12, fontWeight: 600, color: hoveredFooter === i ? 'var(--accent)' : 'var(--text-secondary)', textDecoration: 'none', padding: '4px 10px', borderRadius: 6, border: `1px solid ${hoveredFooter === i ? 'var(--accent)' : 'var(--border)'}`, background: hoveredFooter === i ? 'rgba(37,99,235,0.07)' : 'var(--bg-card)', transition: 'all 0.15s ease' }}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
