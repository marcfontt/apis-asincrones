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
  monoId?: string;
  accent?: string;
  badges?: DrawerBadge[];
  stats?: DrawerStat[];
  sections?: DrawerSection[];
  children?: React.ReactNode;
  onClose: () => void;
};

const MODAL_KEYFRAMES = `
@keyframes asyncbench-modal-in { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes asyncbench-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
`;

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
  monoId,
  accent = 'var(--accent)',
  badges = [],
  stats = [],
  sections = [],
  children,
  onClose,
}: MetricsDetailDrawerProps) => {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        animation: 'asyncbench-backdrop-in 160ms ease-out',
      }}
      role="dialog"
      aria-modal="true"
    >
      <style>{MODAL_KEYFRAMES}</style>
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
          animation: 'asyncbench-modal-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
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
            {monoId && (
              <div style={{ marginTop: 8 }}>
                <code
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    letterSpacing: '0.02em',
                    wordBreak: 'break-all',
                  }}
                >
                  {monoId}
                </code>
              </div>
            )}
            {subtitle && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
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
                  gap: 7,
                  borderRadius: 999,
                  padding: '5px 11px 5px 9px',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: badge.color,
                    boxShadow: `0 0 0 2px ${badge.color}22`,
                  }}
                />
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
