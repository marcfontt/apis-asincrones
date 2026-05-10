import { CATEGORY_COLORS, S } from '../theme';
import { useTranslation } from '../i18n';
import {
  ALL_ARCHITECTURES,
  ALL_PLATFORMS,
  ALL_PROTOCOLS,
  COMPATIBILITY,
  DISABLED_PLATFORMS,
  getCompatibilityDecision,
  getCompatibilityStatusColor,
  type CompatibilityStatus,
} from '../shared/catalog/compatibility';

type CompatibilityMatrixProps = {
  title?: string;
  description?: string;
  compact?: boolean;
};

const compactCellWidth = (disabled: boolean) => (disabled ? 132 : 126);

const StatusPill = ({ status, label }: { status: CompatibilityStatus; label: string }) => {
  const color = getCompatibilityStatusColor(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 24,
        minWidth: 84,
        borderRadius: 999,
        border: `1px solid ${color}36`,
        background: `${color}12`,
        color,
        fontSize: 10,
        fontWeight: 850,
        padding: '3px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
};

const MatrixTable = ({
  title,
  rows,
  color,
  kind,
  t,
}: {
  title: string;
  rows: string[];
  color: string;
  kind: 'architecture' | 'protocol';
  t: (key: string) => string;
}) => (
  <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>
        {t('catalog.compatibility.matrixCaption')}
      </span>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-subtle)' }}>
            <th style={{ ...S.th, minWidth: 140 }}>{title}</th>
            {ALL_PLATFORMS.map(platform => {
              const disabled = DISABLED_PLATFORMS.includes(platform);
              return (
                <th
                  key={platform}
                  style={{
                    ...S.th,
                    textAlign: 'center',
                    minWidth: compactCellWidth(disabled),
                    opacity: disabled ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'grid', gap: 2 }}>
                    <span>{platform}</span>
                    {disabled && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-disabled)' }}>
                        {t('catalog.compatibility.notDeployed')}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row} style={S.tableRow}>
              <td style={{ ...S.td, fontWeight: 700 }}>{row}</td>
              {ALL_PLATFORMS.map(platform => {
                const disabled = DISABLED_PLATFORMS.includes(platform);
                const decision = getCompatibilityDecision(platform, kind, row);
                return (
                  <td
                    key={`${platform}-${row}`}
                    style={{
                      ...S.td,
                      textAlign: 'center',
                      opacity: disabled ? 0.65 : 1,
                    }}
                    title={t(decision.reasonKey)}
                  >
                    <StatusPill status={decision.status} label={t(decision.labelKey)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const CompatibilityMatrix = ({
  title,
  description,
  compact = false,
}: CompatibilityMatrixProps) => {
  const { t } = useTranslation();
  const archColor = CATEGORY_COLORS.architecture;
  const protocolColor = CATEGORY_COLORS.protocol;
  const platformColor = CATEGORY_COLORS.platform;
  const heading = title || t('catalog.compatibility.matrixTitle');
  const body = description || t('catalog.compatibility.matrixDescription');

  return (
    <div
      style={{
        ...S.card,
        marginBottom: 20,
        padding: 0,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
      }}
    >
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ ...S.badge(platformColor), fontSize: 10 }}>{t('catalog.compatibility.platform')}</span>
          <span style={{ ...S.badge(archColor), fontSize: 10 }}>{t('catalog.compatibility.architecture')}</span>
          <span style={{ ...S.badge(protocolColor), fontSize: 10 }}>{t('catalog.compatibility.protocol')}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {heading}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {body}
        </p>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {ALL_PLATFORMS.map(platform => {
            const entry = COMPATIBILITY[platform];
            const disabled = DISABLED_PLATFORMS.includes(platform);
            return (
              <div
                key={platform}
                style={{
                  background: disabled ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  border: `1px solid ${disabled ? 'var(--border)' : `${platformColor}22`}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  opacity: disabled ? 0.72 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{platform}</span>
                  {disabled ? (
                    <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{t('catalog.compatibility.notDeployed')}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {entry.architectures.length} {t('catalog.compatibility.archShort')} · {entry.protocols.length} {t('catalog.compatibility.protocolShort')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '18px 20px 20px', display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 16 }}>
        <MatrixTable title={t('catalog.compatibility.architectures')} rows={ALL_ARCHITECTURES} color={archColor} kind="architecture" t={t} />
        <MatrixTable title={t('catalog.compatibility.protocols')} rows={ALL_PROTOCOLS} color={protocolColor} kind="protocol" t={t} />
      </div>
    </div>
  );
};

export default CompatibilityMatrix;
