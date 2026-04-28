import React from 'react';
import { S } from '../theme';

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-disabled)',
};

const paragraphStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  lineHeight: 1.62,
  color: 'var(--text-secondary)',
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
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
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap' }}>
    <div>
      <div style={{ ...labelStyle, marginBottom: 6 }}>{eyebrow}</div>
      <h2 style={headingStyle}>{title}</h2>
    </div>
    <p style={{ ...paragraphStyle, maxWidth: 520 }}>{children}</p>
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
  fontWeight: 800,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

const flowBox = (color: string): React.CSSProperties => ({
  border: `1px solid ${color}36`,
  background: `linear-gradient(180deg, ${color}12, var(--bg-subtle))`,
  borderRadius: 10,
  padding: 14,
  minHeight: 118,
});

export const BrokerFlowDiagram = () => (
  <section style={{ ...S.card, padding: 22, overflow: 'hidden' }}>
    <DiagramHeader eyebrow="Esquema base" title="Com funciona un broker">
      Un productor publica missatges, el broker els ordena o distribueix segons el model triat, i un o més consumidors els llegeixen. La prova compara aquest recorregut sota la mateixa càrrega.
    </DiagramHeader>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 12, alignItems: 'stretch' }} className="async-responsive-grid">
      <div style={flowBox('var(--brand)')}>
        <span style={miniBadge('var(--brand)')}>Productor</span>
        <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>t0</div>
        <p style={{ ...paragraphStyle, marginTop: 8 }}>
          El generador de càrrega envia payloads amb una ràtio i durada definides per l'escenari.
        </p>
      </div>

      <div style={{ ...flowBox('var(--rabbit)'), position: 'relative', padding: 16 }}>
        <span style={miniBadge('var(--rabbit)')}>Broker</span>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {['Ingress', 'Topic / cua / subject', 'Particions o rutes', 'ACK / offset'].map((part, index) => (
            <div key={part} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: index === 1 ? 'var(--rabbit)' : 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: index === 1 ? '#09090b' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>
                {index + 1}
              </div>
              <div style={{ height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>
                {part}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={flowBox('var(--nats)')}>
        <span style={miniBadge('var(--nats)')}>Consumidor</span>
        <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>t1</div>
        <p style={{ ...paragraphStyle, marginTop: 8 }}>
          El client rep el missatge. La diferència t1 - t0 és la latència end-to-end.
        </p>
      </div>
    </div>

    <svg width="100%" height="54" viewBox="0 0 920 54" role="img" aria-label="Flux productor broker consumidor" style={{ marginTop: 6, overflow: 'visible' }}>
      <defs>
        <marker id="broker-flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#58a6ff" />
        </marker>
      </defs>
      <line x1="150" y1="24" x2="375" y2="24" stroke="#58a6ff" strokeWidth="2" markerEnd="url(#broker-flow-arrow)" />
      <line x1="545" y1="24" x2="770" y2="24" stroke="#22c55e" strokeWidth="2" markerEnd="url(#broker-flow-arrow)" />
      <text x="260" y="18" textAnchor="middle" fill="#8b949e" fontSize="11" fontFamily="JetBrains Mono, monospace">publish</text>
      <text x="660" y="18" textAnchor="middle" fill="#8b949e" fontSize="11" fontFamily="JetBrains Mono, monospace">deliver</text>
      <line x1="150" y1="42" x2="770" y2="42" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 5" />
      <text x="460" y="53" textAnchor="middle" fill="#f59e0b" fontSize="11" fontFamily="JetBrains Mono, monospace">latència end-to-end</text>
    </svg>
  </section>
);

const anatomyParts = [
  {
    title: 'Frontal Backstage',
    color: '#6366f1',
    text: "L'usuari tria escenari, perfil de càrrega i execució. No orquestra mesures; només inicia el flux.",
  },
  {
    title: 'Backend compositor',
    color: '#2D6BE4',
    text: 'Tradueix el contracte Scenario a desplegaments Helm i jobs de prova sobre AKS.',
  },
  {
    title: 'Gateway / protocol',
    color: '#14b8a6',
    text: 'Adapta WebSocket, MQTT, gRPC o protocol natiu quan cal exposar el broker al client.',
  },
  {
    title: 'Broker intern',
    color: '#f59e0b',
    text: 'Topic, cua, subject, particions, ACKs i offsets. Aquí es mesura la latència de broker.',
  },
  {
    title: 'Mètriques',
    color: '#22c55e',
    text: 'Exporters i Prometheus capturen CPU, memòria, errors i percentils sense inventar mètrica artesanal.',
  },
];

export const BrokerAnatomyDiagram = () => (
  <section style={{ ...S.card, padding: 22 }}>
    <DiagramHeader eyebrow="Ubicació de peces" title="On viu cada part">
      Aquest mapa separa UI, composició, protocol i broker real. Això evita confondre el portal amb l'orquestrador i deixa clar què s'està mesurant.
    </DiagramHeader>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(130px, 1fr))', gap: 10 }} className="async-responsive-grid">
      {anatomyParts.map((part, index) => (
        <div key={part.title} style={{ border: `1px solid ${part.color}30`, borderTop: `3px solid ${part.color}`, background: 'var(--bg-subtle)', borderRadius: 10, padding: 14, minHeight: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${part.color}16`, color: part.color, border: `1px solid ${part.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
            {index + 1}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>{part.title}</div>
            <p style={paragraphStyle}>{part.text}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const latencySegments = [
  { label: 'Publish', width: '18%', color: '#2D6BE4', detail: 'timestamp t0 al productor' },
  { label: 'Ingress', width: '16%', color: '#14b8a6', detail: 'xarxa i entrada al broker' },
  { label: 'Broker', width: '24%', color: '#f59e0b', detail: 'persistència, ACK, routing' },
  { label: 'Gateway', width: '18%', color: '#818cf8', detail: 'traducció protocol si existeix' },
  { label: 'Receive', width: '24%', color: '#22c55e', detail: 'recepció i timestamp t1' },
];

export const LatencyMapDiagram = () => (
  <section style={{ ...S.card, padding: 22 }}>
    <DiagramHeader eyebrow="Lectura de mètriques" title="On està la latència">
      Les mètriques no són equivalents: la latència end-to-end cobreix tot el recorregut, mentre que la latència de broker només cobreix la part interna del broker.
    </DiagramHeader>

    <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-subtle)', padding: 16 }}>
      <div style={{ display: 'flex', minHeight: 82, borderRadius: 9, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {latencySegments.map(segment => (
          <div key={segment.label} style={{ width: segment.width, background: `linear-gradient(180deg, ${segment.color}22, ${segment.color}0c)`, borderRight: segment.label === 'Receive' ? 'none' : '1px solid var(--border)', padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 96 }}>
            <div style={{ fontSize: 12, fontWeight: 850, color: segment.color }}>{segment.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.35 }}>{segment.detail}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {[
          { label: 'Latència end-to-end', color: '#f59e0b', start: 0, end: 100, text: 'publish t0 → receive t1' },
          { label: 'Latència de broker', color: '#2D6BE4', start: 34, end: 58, text: 'ingress broker → ACK/routing' },
          { label: 'Overhead protocol/gateway', color: '#818cf8', start: 58, end: 76, text: 'adaptació WS/MQTT/gRPC si aplica' },
        ].map(row => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '170px 1fr 180px', gap: 10, alignItems: 'center' }} className="async-responsive-grid">
            <div style={{ fontSize: 12, fontWeight: 800, color: row.color }}>{row.label}</div>
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
