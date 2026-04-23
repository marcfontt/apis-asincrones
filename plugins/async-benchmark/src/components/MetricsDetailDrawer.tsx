import React from 'react';

type DrawerBadge = {
  label: React.ReactNode;
  color: string;
};

type DrawerStat = {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  color?: string;
};

type DrawerSection = {
  title: string;
  items: Array<{
    label: string;
    value: React.ReactNode;
  }>;
};

type MetricsDetailDrawerProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  accent?: string;
  badges?: DrawerBadge[];
  stats?: DrawerStat[];
  sections?: DrawerSection[];
  children?: React.ReactNode;
  onClose: () => void;
};

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const MetricsDetailDrawer = ({
  open,
  eyebrow,
  title,
  subtitle,
  accent = 'var(--accent)',
  badges = [],
  stats = [],
  sections = [],
  children,
  onClose,
}: MetricsDetailDrawerProps) => {
  if (!open) return null;

  return (
    <div
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3200,
        background: 'rgba(2,6,23,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        padding: 24,
      }}
    >
      <aside
        style={{
          width: '100%',
          maxWidth: 820,
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          padding: 28,
          fontFamily: 'var(--font)',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: accent,
                  marginBottom: 8,
                }}
              >
                {eyebrow}
              </div>
            )}
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {title}
            </div>
            {subtitle && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-label="Tanca el panell"
          >
            <CloseIcon />
          </button>
        </div>

        {badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {badges.map((badge, index) => (
              <span
                key={`${String(badge.label)}-${index}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 999,
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: badge.color,
                  background: `${badge.color}14`,
                  border: `1px solid ${badge.color}26`,
                }}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {stats.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
              marginBottom: 18,
            }}
          >
            {stats.map(stat => (
              <div
                key={stat.label}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  padding: '14px 14px 12px',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                  {stat.label}
                </div>
                <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: stat.color || 'var(--text-primary)' }}>
                  {stat.value}
                </div>
                {stat.helper && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {stat.helper}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {sections.map(section => (
          <section key={section.title} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-disabled)', marginBottom: 10 }}>
              {section.title}
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {section.items.map((item, index) => (
                <div
                  key={`${section.title}-${item.label}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr',
                    gap: 12,
                    padding: '11px 14px',
                    borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                    background: index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-surface)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {children}
      </aside>
    </div>
  );
};

export default MetricsDetailDrawer;
