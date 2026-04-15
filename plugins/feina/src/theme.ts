
import React from 'react';

// ── Category colors (used by CatalogPage) ────────────────────────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  architecture: '#2563eb',
  protocol:     '#16a34a',
  platform:     '#f59e0b',
  gateway:      '#8b5cf6',
};

// ── Global CSS: tokens (light + dark) + animations + utilities ────────────────
export const GLOBAL_CSS = `
  /* ── Google Fonts ── */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

  /* ── Light mode tokens ── */
  :root {
    --font:       'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono:  'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

    --bg:          #f4f6f8;
    --bg-card:     #ffffff;
    --bg-hover:    #f1f5f9;
    --bg-subtle:   #f8fafc;

    --text-primary:   #0f172a;
    --text-secondary: #475569;
    --text-disabled:  #94a3b8;

    --border:      rgba(15,23,42,0.10);

    --accent:      #2563eb;
    --accent-soft: rgba(37,99,235,0.08);
    --success:     #16a34a;
    --error:       #dc2626;
    --warning:     #d97706;

    --shadow-sm:   0 1px 2px rgba(0,0,0,0.05);
    --shadow-md:   0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05);
    --shadow-lg:   0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10);

    --transition:  0.15s ease;

    --badge-green-bg: rgba(22,163,74,0.10);
    --badge-green-fg: #16a34a;
    --badge-blue-bg:  rgba(37,99,235,0.10);
    --badge-blue-fg:  #2563eb;

    --bg-border:      rgba(15,23,42,0.07);
  }

  /* ── Dark mode tokens (OLED dark) ── */
  [data-theme="dark"] {
    --bg:          #09090b;
    --bg-card:     #111318;
    --bg-hover:    #1a1d23;
    --bg-subtle:   #0d0e12;

    --text-primary:   #f0f6fc;
    --text-secondary: #8d96a0;
    --text-disabled:  #484f58;

    --border:      rgba(240,246,252,0.08);

    --accent:      #58a6ff;
    --accent-soft: rgba(88,166,255,0.12);
    --success:     #3fb950;
    --error:       #f85149;
    --warning:     #d29922;

    --shadow-sm:   0 1px 3px rgba(0,0,0,0.50);
    --shadow-md:   0 2px 8px rgba(0,0,0,0.60), 0 1px 2px rgba(0,0,0,0.40);
    --shadow-lg:   0 8px 24px rgba(0,0,0,0.70), 0 2px 8px rgba(0,0,0,0.50);

    --badge-green-bg: rgba(63,185,80,0.15);
    --badge-green-fg: #3fb950;
    --badge-blue-bg:  rgba(88,166,255,0.12);
    --badge-blue-fg:  #58a6ff;

    --bg-border:      rgba(240,246,252,0.06);
  }

  /* ── Animations ── */
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.55; transform: scale(1.35); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes heroGlow {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.7; }
  }

  /* ── Focus ring (accessibility — WCAG 2.4.7) ── */
  *:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* ── Button hover/active states ── */
  button:hover:not(:disabled), a[role="button"]:hover {
    filter: brightness(1.07);
  }
  button:active:not(:disabled) {
    transform: scale(0.97);
    transition: transform 0.08s ease;
  }
  button:disabled {
    opacity: 0.45 !important;
    cursor: not-allowed !important;
    pointer-events: none;
  }

  /* ── Dark mode: primary button glow (OLED feel) ── */
  [data-theme="dark"] button[style*="var(--accent)"],
  [data-theme="dark"] button[style*="--accent"] {
    box-shadow: 0 0 16px rgba(88,166,255,0.22), 0 2px 4px rgba(0,0,0,0.40) !important;
  }
  [data-theme="dark"] button[style*="var(--success)"],
  [data-theme="dark"] button[style*="--success"] {
    box-shadow: 0 0 16px rgba(63,185,80,0.22), 0 2px 4px rgba(0,0,0,0.40) !important;
  }

  /* ── Dark mode card: glass + glow on hover ── */
  [data-theme="dark"] .card-hover:hover {
    border-color: rgba(88,166,255,0.28) !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(88,166,255,0.12), 0 0 20px rgba(88,166,255,0.06) !important;
    background: linear-gradient(135deg, rgba(88,166,255,0.04) 0%, transparent 60%) !important;
  }

  /* ── Dark mode: glass card utility ── */
  [data-theme="dark"] .glass-card {
    background: rgba(17,19,24,0.85) !important;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(240,246,252,0.08) !important;
  }

  /* ── Dark mode: hero glow accent ── */
  [data-theme="dark"] .hero-glow::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(88,166,255,0.10), transparent);
    pointer-events: none;
  }

  /* ── Dark mode: table rows ── */
  [data-theme="dark"] tr:hover td {
    background: rgba(88,166,255,0.04) !important;
  }

  /* ── Dark mode: input focus ── */
  [data-theme="dark"] input:focus,
  [data-theme="dark"] select:focus,
  [data-theme="dark"] textarea:focus {
    border-color: #58a6ff !important;
    box-shadow: 0 0 0 3px rgba(88,166,255,0.15) !important;
    background-color: #0d0e12 !important;
  }

  /* ── Input focus state ── */
  input:focus, select:focus, textarea:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 3px var(--accent-soft) !important;
  }

  /* ── Table row hover ── */
  .card-hover {
    transition: background var(--transition), border-left-color var(--transition);
  }

  /* ── Custom scrollbar ── */
  ::-webkit-scrollbar        { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track  { background: transparent; }
  ::-webkit-scrollbar-thumb  { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-disabled); }

  /* ── Text selection ── */
  ::selection { background: var(--accent); color: #fff; }

  /* ── Dark mode: plugin page background ── */
  [data-theme="dark"] [class*="BackstageContent"],
  [data-theme="dark"] main > div {
    background-color: #09090b !important;
  }

  /* ── Reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// ── Style object — all values use CSS variables so dark/light works automatically ──
export const S = {

  page: {
    padding:    '28px 32px',
    maxWidth:   1300,
    margin:     '0 auto',
    fontFamily: 'var(--font)',
    color:      'var(--text-primary)',
    minHeight:  '100vh',
    background: 'var(--bg)',
    boxSizing:  'border-box' as const,
  } as React.CSSProperties,

  card: {
    background:   'var(--bg-card)',
    border:       '1px solid var(--border)',
    borderRadius: 12,
    padding:      24,
    boxShadow:    'var(--shadow-sm)',
  } as React.CSSProperties,

  btn: {
    display:     'inline-flex',
    alignItems:  'center',
    gap:         6,
    padding:     '7px 16px',
    borderRadius: 7,
    border:      '1px solid var(--border)',
    background:  'var(--bg-card)',
    color:       'var(--text-secondary)',
    fontSize:    13,
    fontWeight:  600,
    cursor:      'pointer',
    fontFamily:  'var(--font)',
    transition:  'all 0.15s ease',
    whiteSpace:  'nowrap' as const,
  } as React.CSSProperties,

  btnPrimary: {
    display:     'inline-flex',
    alignItems:  'center',
    gap:         6,
    padding:     '7px 16px',
    borderRadius: 7,
    border:      '1px solid transparent',
    background:  'var(--accent)',
    color:       '#fff',
    fontSize:    13,
    fontWeight:  600,
    cursor:      'pointer',
    fontFamily:  'var(--font)',
    boxShadow:   '0 1px 2px rgba(0,0,0,0.15)',
    transition:  'all 0.15s ease',
    whiteSpace:  'nowrap' as const,
  } as React.CSSProperties,

  th: {
    padding:         '10px 16px',
    textAlign:       'left'     as const,
    fontSize:        11,
    fontWeight:      700,
    color:           'var(--text-secondary)',
    textTransform:   'uppercase' as const,
    letterSpacing:   '0.06em',
    whiteSpace:      'nowrap'   as const,
    borderBottom:    '1px solid var(--border)',
    background:      'var(--bg-subtle)',
  } as React.CSSProperties,

  td: {
    padding:        '11px 16px',
    fontSize:       13,
    color:          'var(--text-primary)',
    borderBottom:   '1px solid var(--border)',
    verticalAlign:  'middle' as const,
  } as React.CSSProperties,

  tableRow: {
    transition: 'background var(--transition)',
  } as React.CSSProperties,

  tableHeader: {
    background: 'var(--bg-subtle)',
  } as React.CSSProperties,

  input: {
    padding:      '9px 12px',
    borderRadius: 7,
    border:       '1px solid var(--border)',
    background:   'var(--bg-card)',
    color:        'var(--text-primary)',
    fontSize:     13,
    fontFamily:   'var(--font)',
    outline:      'none',
    width:        '100%',
    transition:   'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing:    'border-box' as const,
  } as React.CSSProperties,

  badge: (color: string): React.CSSProperties => ({
    display:     'inline-flex',
    alignItems:  'center',
    padding:     '2px 9px',
    borderRadius: 20,
    fontSize:    12,
    fontWeight:  700,
    background:  color + '18',
    color,
    border:      '1px solid ' + color + '30',
    fontFamily:  'var(--font-mono)',
    whiteSpace:  'nowrap' as const,
  }),

  chip: (active: boolean, color?: string): React.CSSProperties => ({
    padding:     '5px 14px',
    borderRadius: 20,
    border:      `1px solid ${active ? (color ?? 'var(--accent)') : 'var(--border)'}`,
    background:  active ? (color ? color + '15' : 'var(--accent-soft)') : 'transparent',
    color:       active ? (color ?? 'var(--accent)') : 'var(--text-secondary)',
    fontSize:    13,
    fontWeight:  active ? 700 : 500,
    cursor:      'pointer',
    transition:  'all 0.15s ease',
    fontFamily:  'var(--font)',
    whiteSpace:  'nowrap' as const,
  }),
};
