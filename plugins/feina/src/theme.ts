
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

  /* ── Dark mode tokens (GitHub dark-inspired) ── */
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

    --bg-border:      rgba(230,237,243,0.07);
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
    box-shadow: 0 0 12px rgba(88,166,255,0.18) !important;
  }
  [data-theme="dark"] button[style*="var(--success)"],
  [data-theme="dark"] button[style*="--success"] {
    box-shadow: 0 0 12px rgba(63,185,80,0.18) !important;
  }

  /* ── Card hover: subtle lift ── */
  [data-theme="dark"] .card-hover:hover {
    border-color: rgba(88,166,255,0.25) !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(88,166,255,0.10) !important;
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

  /* ── Dark mode: overrides Backstage/MUI white background ── */
  html[data-theme="dark"],
  html[data-theme="dark"] body {
    background-color: #0d1117 !important;
    color: #e6edf3;
  }
  html[data-theme="dark"] [class*="BackstageContent"],
  html[data-theme="dark"] [class*="MuiPaper-elevation0"],
  html[data-theme="dark"] [class*="makeStyles-root"],
  html[data-theme="dark"] main > div {
    background-color: #0d1117 !important;
  }

  /* ── Dark mode: sidebar & navigation drawer ── */
  html[data-theme="dark"] [class*="BackstageSidebar"],
  html[data-theme="dark"] [class*="makeStyles-drawer"],
  html[data-theme="dark"] nav[class*="MuiDrawer"],
  html[data-theme="dark"] [class*="MuiDrawer-paper"] {
    background-color: #010409 !important;
    border-right-color: #21262d !important;
  }
  html[data-theme="dark"] [class*="BackstageSidebarItem"],
  html[data-theme="dark"] [class*="makeStyles-buttonItem"],
  html[data-theme="dark"] [class*="BackstageSidebarItem-root"] {
    color: #8b949e !important;
  }
  html[data-theme="dark"] [class*="BackstageSidebarItem"][class*="selected"],
  html[data-theme="dark"] [class*="BackstageSidebarItem"][class*="open"],
  html[data-theme="dark"] [class*="makeStyles-selected"] {
    color: #e6edf3 !important;
    background-color: rgba(255,255,255,0.06) !important;
  }
  html[data-theme="dark"] [class*="BackstageSidebarLogo"],
  html[data-theme="dark"] [class*="makeStyles-logo"] {
    border-bottom-color: #21262d !important;
  }

  /* ── Dark mode: settings page ── */
  html[data-theme="dark"] [class*="MuiTab-root"] {
    color: #8b949e !important;
  }
  html[data-theme="dark"] [class*="MuiTab-root"][class*="Mui-selected"] {
    color: #58a6ff !important;
  }
  html[data-theme="dark"] [class*="MuiTabs-indicator"] {
    background-color: #58a6ff !important;
  }
  html[data-theme="dark"] [class*="MuiDivider-root"] {
    border-color: #21262d !important;
  }
  html[data-theme="dark"] [class*="MuiListItem-root"],
  html[data-theme="dark"] [class*="MuiListItemText-root"] span,
  html[data-theme="dark"] [class*="MuiTypography-root"] {
    color: #e6edf3 !important;
  }
  html[data-theme="dark"] [class*="MuiSwitch-track"] {
    background-color: #30363d !important;
  }
  html[data-theme="dark"] [class*="MuiSelect-root"],
  html[data-theme="dark"] [class*="MuiSelect-select"],
  html[data-theme="dark"] [class*="MuiInputBase-root"] {
    background-color: #161b22 !important;
    color: #e6edf3 !important;
    border-color: #30363d !important;
  }
  html[data-theme="dark"] [class*="MuiOutlinedInput-notchedOutline"] {
    border-color: #30363d !important;
  }
  html[data-theme="dark"] [class*="MuiPopover-paper"],
  html[data-theme="dark"] [class*="MuiMenu-paper"],
  html[data-theme="dark"] [class*="MuiMenu-list"] {
    background-color: #161b22 !important;
    border: 1px solid #30363d !important;
  }
  html[data-theme="dark"] [class*="MuiMenuItem-root"] {
    color: #e6edf3 !important;
  }
  html[data-theme="dark"] [class*="MuiMenuItem-root"]:hover {
    background-color: rgba(88,166,255,0.08) !important;
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
