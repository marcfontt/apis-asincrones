
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
  }

  /* ── Dark mode tokens (GitHub dark-inspired — desaturated tonal variants) ── */
  [data-theme="dark"] {
    --bg:          #0d1117;
    --bg-card:     #161b22;
    --bg-hover:    #1c2128;
    --bg-subtle:   #0d1117;

    --text-primary:   #e6edf3;
    --text-secondary: #8b949e;
    --text-disabled:  #484f58;

    --border:      rgba(230,237,243,0.10);

    --accent:      #58a6ff;
    --accent-soft: rgba(88,166,255,0.10);
    --success:     #3fb950;
    --error:       #f85149;
    --warning:     #d29922;

    --shadow-sm:   0 1px 2px rgba(0,0,0,0.30);
    --shadow-md:   0 1px 3px rgba(0,0,0,0.40);
    --shadow-lg:   0 4px 12px rgba(0,0,0,0.50);

    --badge-green-bg: rgba(63,185,80,0.15);
    --badge-green-fg: #3fb950;
    --badge-blue-bg:  rgba(88,166,255,0.12);
    --badge-blue-fg:  #58a6ff;
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

  /* ── Button hover/active states (supplement React hover state) ── */
  button:hover:not(:disabled), a[role="button"]:hover {
    filter: brightness(1.07);
  }
  button:active:not(:disabled) {
    transform: scale(0.97);
    transition: transform 0.08s ease;
  }
  /* Disabled state — reduced opacity + no pointer (WCAG 1.4.3 — disabled elements) */
  button:disabled {
    opacity: 0.45 !important;
    cursor: not-allowed !important;
    pointer-events: none;
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
`;

// ── Style object — all values use CSS variables so dark/light works automatically ──
export const S = {

  page: {
    padding:    '28px 32px',
    fontFamily: 'var(--font)',
    color:      'var(--text-primary)',
    minHeight:  '100vh',
    background: 'var(--bg)',
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

  // ── Factories ──

  /** Coloured badge pill. Uses 10% tinted bg + 20% tinted border of the given hex. */
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

  /** Filter chip. Active = accent fill; inactive = ghost. */
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
