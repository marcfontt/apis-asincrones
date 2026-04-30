import React from 'react';
import { S } from '../theme';

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 850,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-disabled)',
};

const paragraphStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  lineHeight: 1.65,
  color: 'var(--text-secondary)',
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
  fontWeight: 900,
  letterSpacing: '-0.02em',
  color: 'var(--text-primary)',
};

const DiagramHeader = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 16,
      alignItems: 'flex-start',
      marginBottom: 18,
      flexWrap: 'wrap',
      minWidth: 0,
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ ...labelStyle, marginBottom: 6 }}>{eyebrow}</div>
      <h2 style={headingStyle}>{title}</h2>
    </div>
    <p style={{ ...paragraphStyle, maxWidth: 540, minWidth: 0 }}>{children}</p>
  </div>
);

const miniBadge = (color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 8px',
  borderRadius: 999,
  border: `1px solid ${color}33`,
  background: `${color}14`,
  color,
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

const flowBox = (color: string): React.CSSProperties => ({
  border: `1px solid ${color}36`,
  background: `linear-gradient(180deg, ${color}12, var(--bg-subtle))`,
  borderRadius: 10,
  padding: 15,
  minHeight: 144,
  display: 'flex',
  flexDirection: 'column',
});

const RouteStep = ({
  n,
  title,
  detail,
  color,
}: {
  n: number;
  title: string;
  detail: string;
  color: string;
}) => (
  <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 9, alignItems: 'center' }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        fontFamily: 'var(--font-mono)',
        fontWeight: 900,
        fontSize: 11,
      }}
    >
      {n}
    </div>
    <div
      style={{
        minHeight: 34,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        display: 'grid',
        alignContent: 'center',
        padding: '5px 10px',
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 850 }}>{title}</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{detail}</div>
    </div>
  </div>
);

export const BrokerFlowDiagram = () => (
  <section style={{ ...S.card, padding: 22, overflow: 'hidden', minWidth: 0 }}>
    <DiagramHeader eyebrow="Esquema base" title="Com funciona un broker">
      La prova sempre segueix el mateix recorregut: un productor genera payloads, el broker els rep i els encamina, i un consumidor confirma què ha arribat. Així es pot comparar cada combinació amb la mateixa càrrega.
    </DiagramHeader>

    <div className="async-flow-stage" style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1.18fr 64px 1fr', gap: 0, alignItems: 'stretch' }}>
      <div style={flowBox('#2563eb')}>
        <span style={miniBadge('#2563eb')}>Productor</span>
        <div style={{ marginTop: 14, fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>t0</div>
        <p style={{ ...paragraphStyle, marginTop: 8 }}>
          El generador de càrrega crea missatges amb un format, payload i ràtio definits a l'escenari.
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 14 }}>
          {['JSON', 'IoT', 'vídeo', 'financer'].map(tag => (
            <span key={tag} style={{ ...miniBadge('#2563eb'), fontSize: 10 }}>{tag}</span>
          ))}
        </div>
      </div>

      <div className="async-flow-arrow" aria-hidden="true">
        <span>envia</span>
      </div>

      <div style={{ ...flowBox('#f59e0b'), padding: 17 }}>
        <span style={miniBadge('#f59e0b')}>Broker</span>
        <div style={{ display: 'grid', gap: 8, marginTop: 13 }}>
          <RouteStep n={1} title="Entrada" detail="rep el missatge" color="#f59e0b" />
          <RouteStep n={2} title="Ruta" detail="topic, cua o subject" color="#f59e0b" />
          <RouteStep n={3} title="Partició / ACK" detail="ordena, confirma o distribueix" color="#f59e0b" />
        </div>
      </div>

      <div className="async-flow-arrow async-flow-arrow-green" aria-hidden="true">
        <span>entrega</span>
      </div>

      <div style={flowBox('#16a34a')}>
        <span style={miniBadge('#16a34a')}>Consumidor</span>
        <div style={{ marginTop: 14, fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>t1</div>
        <p style={{ ...paragraphStyle, marginTop: 8 }}>
          El consumidor rep el missatge. La diferència entre t0 i t1 és la latència que veu l'usuari.
        </p>
        <div style={{ marginTop: 'auto', paddingTop: 14, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>Missatges rebuts</span>
            <strong style={{ color: 'var(--text-primary)' }}>comptador final</strong>
          </div>
        </div>
      </div>
    </div>

    <div
      style={{
        marginTop: 14,
        border: '1px solid rgba(245,158,11,0.28)',
        background: 'rgba(245,158,11,0.08)',
        borderRadius: 10,
        padding: '10px 12px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ ...miniBadge('#f59e0b'), flexShrink: 0 }}>Latència</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        Temps total del missatge: des que el productor l'envia fins que el consumidor el rep. No cal que l'usuari separi cada tram per entendre el resultat principal.
      </span>
    </div>
  </section>
);

const anatomyParts = [
  {
    title: 'Backstage UI',
    color: '#2563eb',
    text: "És la pantalla de treball: esculls components, crees escenaris, llances execucions i mires resultats.",
  },
  {
    title: 'Backend compositor',
    color: '#7c3aed',
    text: 'Converteix l\'escenari en una prova executable. Aquí viuen les regles del TFG, no al frontend.',
  },
  {
    title: 'AKS',
    color: '#0891b2',
    text: 'És el clúster on corren brokers, generadors de càrrega i serveis de suport.',
  },
  {
    title: 'Broker / protocol',
    color: '#f59e0b',
    text: 'És la peça comparada: Kafka, RabbitMQ, NATS o compatible, amb el protocol triat.',
  },
  {
    title: 'Mètriques',
    color: '#16a34a',
    text: 'Cada run publica mesures amb latència, throughput, errors i comptadors de missatges.',
  },
  {
    title: 'Resultats',
    color: '#dc2626',
    text: 'La UI compara execucions i ajuda a defensar quin disseny funciona millor.',
  },
];

export const BrokerAnatomyDiagram = () => (
  <section style={{ ...S.card, padding: 22, overflow: 'hidden', minWidth: 0 }}>
    <DiagramHeader eyebrow="Estructura del portal" title="Quin paper fa cada peça">
      Aquest mapa separa la pantalla, la preparació de la prova, l'execució al clúster i la comparació final. La idea és entendre el flux sense entrar en detalls interns.
    </DiagramHeader>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 10 }}>
      {anatomyParts.map((part, index) => (
        <div
          key={part.title}
          style={{
            border: `1px solid ${part.color}30`,
            borderTop: `3px solid ${part.color}`,
            background: 'var(--bg-subtle)',
            borderRadius: 10,
            padding: 14,
            minHeight: 168,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: `${part.color}16`,
              color: part.color,
              border: `1px solid ${part.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
              fontWeight: 900,
            }}
          >
            {index + 1}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>{part.title}</div>
            <p style={paragraphStyle}>{part.text}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const latencySegments = [
  { label: 'Enviament', width: '18%', color: '#2563eb', detail: 'el productor crea el missatge' },
  { label: 'Entrada', width: '16%', color: '#0891b2', detail: 'arriba al broker' },
  { label: 'Broker', width: '26%', color: '#f59e0b', detail: 'ruta, partició, cua o ACK' },
  { label: 'Protocol', width: '18%', color: '#7c3aed', detail: 'adaptació si aplica' },
  { label: 'Recepció', width: '22%', color: '#16a34a', detail: 'el consumidor rep el missatge' },
];

export const LatencyMapDiagram = () => (
  <section style={{ ...S.card, padding: 22, overflow: 'hidden', minWidth: 0 }}>
    <DiagramHeader eyebrow="Lectura de mesures" title="On es veu la latència">
      Per a la Home només cal una idea: la latència és el temps que tarda el missatge a arribar. Després, a Resultats, es pot mirar amb més detall amb P50, P95 i P99.
    </DiagramHeader>

    <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-subtle)', padding: 16 }}>
      <div
        className="async-latency-segments"
        style={{ display: 'flex', minHeight: 86, borderRadius: 9, overflowX: 'auto', overflowY: 'hidden', border: '1px solid var(--border)' }}
      >
        {latencySegments.map(segment => (
          <div
            key={segment.label}
            className="async-latency-segment"
            style={{
              width: segment.width,
              background: `linear-gradient(180deg, ${segment.color}22, ${segment.color}0c)`,
              borderRight: segment.label === 'Recepció' ? 'none' : '1px solid var(--border)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 106,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, color: segment.color }}>{segment.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.35 }}>{segment.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
        {[
          { label: 'Latència', color: '#f59e0b', start: 0, end: 100, text: 't0 productor -> t1 consumidor' },
          { label: 'Temps dins del broker', color: '#2563eb', start: 34, end: 60, text: 'entrada -> ruta/ACK' },
          { label: 'Cost del protocol', color: '#7c3aed', start: 60, end: 78, text: 'traducció o entrega' },
        ].map(row => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 180px', gap: 10, alignItems: 'center' }} className="async-responsive-grid">
            <div style={{ fontSize: 12, fontWeight: 900, color: row.color }}>{row.label}</div>
            <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: `${row.start}%`, width: `${row.end - row.start}%`, top: 0, bottom: 0, background: row.color, borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{row.text}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default BrokerFlowDiagram;
