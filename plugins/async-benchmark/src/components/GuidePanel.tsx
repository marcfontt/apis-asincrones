import { type ReactNode } from 'react';
import { S } from '../theme';

// Format comú per a les guies de cada pàgina.
// Ajuda a mantenir Catàleg, Escenaris, Execucions i Resultats amb la mateixa lectura.
const BookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const GuidePanel = ({
  title,
  subtitle,
  open,
  onToggle,
  showLabel,
  hideLabel,
  children,
  marginBottom = 24,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  children: ReactNode;
  marginBottom?: number;
}) => (
  <section style={{ ...S.card, marginBottom, padding: 0, overflow: 'hidden' }}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      style={{
        width: '100%',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--font)',
        textAlign: 'left',
        color: 'var(--text-primary)',
      }}
    >
      <span style={{ color: 'var(--accent)', display: 'flex' }}><BookIcon /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{title}</span>
        {subtitle && (
          <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {subtitle}
          </span>
        )}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginRight: 8, whiteSpace: 'nowrap' }}>
        {open ? hideLabel : showLabel}
      </span>
      <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><ChevronIcon open={open} /></span>
    </button>

    {open && (
      <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
        {children}
      </div>
    )}
  </section>
);

export const GuideItemCard = ({
  title,
  text,
  color,
  icon,
}: {
  title: string;
  text: string;
  color: string;
  icon?: ReactNode;
}) => (
  // Targeta curta per explicar una funció o decisió concreta dins d'una guia.
  <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '12px 14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>
      {icon && <span style={{ display: 'flex', color }}>{icon}</span>}
      <span>{title}</span>
    </div>
    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</p>
  </div>
);

export type GuideStep = {
  n: string;
  label: string;
  sub?: string;
  color: string;
};

export const GuideStepFlow = ({ steps }: { steps: GuideStep[] }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '16px 0 20px', overflowX: 'auto', paddingBottom: 4 }}>
    {steps.map((step, index) => (
      <div key={`${step.n}-${step.label}`} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '0 4px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${step.color}18`, border: `1.5px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: step.color, fontFamily: 'var(--font-mono)' }}>
            {step.n}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{step.label}</div>
          {step.sub && (
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', textAlign: 'center' }}>{step.sub}</div>
          )}
        </div>
        {index < steps.length - 1 && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, margin: '0 2px', marginBottom: 20 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    ))}
  </div>
);
