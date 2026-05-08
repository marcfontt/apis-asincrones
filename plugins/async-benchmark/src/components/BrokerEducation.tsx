import React from 'react';
import { S } from '../theme';
import { useTranslation } from '../i18n';

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

export const BrokerFlowDiagram = () => {
  const { t } = useTranslation();

  return (
    <section style={{ ...S.card, padding: 22, overflow: 'hidden', minWidth: 0 }}>
      <DiagramHeader eyebrow={t('home.brokerFlow.eyebrow')} title={t('home.brokerFlow.title')}>
        {t('home.brokerFlow.description')}
      </DiagramHeader>

      <div className="async-flow-stage" style={{ display: 'grid', gridTemplateColumns: '1fr 64px 1.18fr 64px 1fr', gap: 0, alignItems: 'stretch' }}>
        <div style={flowBox('#2563eb')}>
          <span style={miniBadge('#2563eb')}>{t('home.brokerFlow.producer')}</span>
          <div style={{ marginTop: 14, fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{t('home.brokerFlow.producerAction')}</div>
          <p style={{ ...paragraphStyle, marginTop: 8 }}>
            {t('home.brokerFlow.producerText')}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 14 }}>
            {['JSON', 'IoT', t('home.brokerFlow.tagVideo'), t('home.brokerFlow.tagFinance')].map(tag => (
              <span key={tag} style={{ ...miniBadge('#2563eb'), fontSize: 10 }}>{tag}</span>
            ))}
          </div>
        </div>

        <div className="async-flow-arrow" aria-hidden="true">
          <span>{t('home.brokerFlow.send')}</span>
        </div>

        <div style={{ ...flowBox('#f59e0b'), padding: 17 }}>
          <span style={miniBadge('#f59e0b')}>{t('home.brokerFlow.broker')}</span>
          <div style={{ display: 'grid', gap: 8, marginTop: 13 }}>
            <RouteStep n={1} title={t('home.brokerFlow.brokerStep1Title')} detail={t('home.brokerFlow.brokerStep1Detail')} color="#f59e0b" />
            <RouteStep n={2} title={t('home.brokerFlow.brokerStep2Title')} detail={t('home.brokerFlow.brokerStep2Detail')} color="#f59e0b" />
            <RouteStep n={3} title={t('home.brokerFlow.brokerStep3Title')} detail={t('home.brokerFlow.brokerStep3Detail')} color="#f59e0b" />
          </div>
        </div>

        <div className="async-flow-arrow async-flow-arrow-green" aria-hidden="true">
          <span>{t('home.brokerFlow.deliver')}</span>
        </div>

        <div style={flowBox('#16a34a')}>
          <span style={miniBadge('#16a34a')}>{t('home.brokerFlow.consumer')}</span>
          <div style={{ marginTop: 14, fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{t('home.brokerFlow.consumerAction')}</div>
          <p style={{ ...paragraphStyle, marginTop: 8 }}>
            {t('home.brokerFlow.consumerText')}
          </p>
          <div style={{ marginTop: 'auto', paddingTop: 14, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
              <span>{t('home.brokerFlow.received')}</span>
              <strong style={{ color: 'var(--text-primary)' }}>{t('home.brokerFlow.finalCounter')}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrokerFlowDiagram;
