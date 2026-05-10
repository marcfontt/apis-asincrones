import React from 'react';

export const CATEGORY_COLORS: Record<string, string> = {
  architecture: '#6366f1',
  protocol: '#14b8a6',
  platform: '#f59e0b',
  gateway: '#818cf8',
};

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  :root,
  [data-theme="light"] {
    --font: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

    --bg: #f1f5f9;
    --bg-card: #ffffff;
    --bg-hover: #f8fafc;
    --bg-subtle: #f8fafc;
    --bg-surface: #f8fafc;
    --panel: #ffffff;
    --panel-2: #f8fafc;

    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-disabled: #94a3b8;

    --border: rgba(15,23,42,0.09);
    --border-strong: rgba(15,23,42,0.18);

    --brand: #2563eb;
    --accent: #2563eb;
    --accent-soft: rgba(37,99,235,0.08);
    --teal: #059669;
    --violet: #7c3aed;

    --kafka: #dc2626;
    --rabbit: #d97706;
    --nats: #16a34a;
    --confluent: #2563eb;

    --success: #16a34a;
    --error: #dc2626;
    --warning: #d97706;
    --neutral: #64748b;
    --danger: #b91c1c;
    --danger-soft: #fee2e2;
    --danger-border: #fca5a5;

    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-lg: 0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
    --motion-fast: 120ms;
    --motion-normal: 180ms;
    --motion-slow: 260ms;
    --motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
    --motion-ease-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --transition: var(--motion-fast) var(--motion-ease-standard);
  }

  [data-theme="dark"] {
    --bg: #09090b;
    --bg-card: #0f1117;
    --bg-hover: #161921;
    --bg-subtle: #0b0d12;
    --bg-surface: #12161f;
    --panel: #11141b;
    --panel-2: #161a23;

    --text-primary: #f0f6fc;
    --text-secondary: #8b949e;
    --text-disabled: #484f58;

    --border: rgba(240,246,252,0.07);
    --border-strong: rgba(240,246,252,0.13);

    --brand: #2D6BE4;
    --accent: #58a6ff;
    --accent-soft: rgba(88,166,255,0.10);
    --teal: #00C896;
    --violet: #818cf8;

    --kafka: #ef4444;
    --rabbit: #fb923c;
    --nats: #22c55e;
    --confluent: #818cf8;

    --success: #3fb950;
    --error: #f85149;
    --warning: #d29922;
    --neutral: #64748b;
    --danger: #f87171;
    --danger-soft: rgba(248,81,73,0.12);
    --danger-border: rgba(248,113,113,0.38);

    --shadow-sm: 0 1px 3px rgba(0,0,0,0.50);
    --shadow-md: 0 2px 8px rgba(0,0,0,0.60);
    --shadow-lg: 0 8px 24px rgba(0,0,0,0.70);
  }

  * { box-sizing: border-box; }

  body {
    font-family: var(--font);
    background: var(--bg);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(12px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.4); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes heroGlow {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 0.65; }
  }

  *:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }

  button:hover:not(:disabled),
  a[role="button"]:hover {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }

  button:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
    transition: transform 0.08s ease;
  }

  button:disabled {
    opacity: 0.42 !important;
    cursor: not-allowed !important;
    pointer-events: none;
  }

  [data-theme="dark"] button[style*="var(--brand)"],
  [data-theme="dark"] button[style*="var(--accent)"] {
    box-shadow: 0 0 14px rgba(88,166,255,0.20), 0 2px 4px rgba(0,0,0,0.40) !important;
  }

  [data-theme="dark"] button[style*="var(--success)"] {
    box-shadow: 0 0 14px rgba(63,185,80,0.20), 0 2px 4px rgba(0,0,0,0.40) !important;
  }

  [data-theme="dark"] button[style*="var(--error)"] {
    box-shadow: 0 0 14px rgba(248,81,73,0.20), 0 2px 4px rgba(0,0,0,0.40) !important;
  }

  [data-theme="dark"] .card-hover:hover {
    border-color: rgba(88,166,255,0.22) !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.60), 0 0 0 1px rgba(88,166,255,0.10) !important;
  }

  [data-theme="dark"] tr:hover td {
    background: rgba(88,166,255,0.03) !important;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 3px var(--accent-soft) !important;
  }

  [data-theme="dark"] input:focus,
  [data-theme="dark"] select:focus,
  [data-theme="dark"] textarea:focus {
    background-color: #0b0d12 !important;
  }

  .card-hover {
    transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
  }

  .async-flow-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 144px;
    color: #2563eb;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .async-flow-arrow::before {
    content: "";
    position: absolute;
    left: 8px;
    right: 8px;
    top: 50%;
    height: 2px;
    border-radius: 999px;
    background: currentColor;
    transform: translateY(-50%);
  }

  .async-flow-arrow::after {
    content: "";
    position: absolute;
    right: 5px;
    top: 50%;
    width: 9px;
    height: 9px;
    border-top: 2px solid currentColor;
    border-right: 2px solid currentColor;
    transform: translateY(-50%) rotate(45deg);
  }

  .async-flow-arrow span {
    position: relative;
    z-index: 1;
    padding: 3px 6px;
    border-radius: 999px;
    background: var(--bg-card);
    border: 1px solid var(--border);
  }

  .async-flow-arrow-green {
    color: #16a34a;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-disabled); }
  ::selection { background: var(--accent); color: #fff; }

  [data-theme="dark"] [class*="BackstageContent"],
  [data-theme="dark"] main > div {
    background-color: #09090b !important;
  }

  @media (max-width: 900px) {
    .async-responsive-grid {
      grid-template-columns: 1fr !important;
    }

    .async-hide-mobile {
      display: none !important;
    }

    .async-flow-stage {
      grid-template-columns: 1fr !important;
      gap: 10px !important;
    }

    .async-flow-arrow {
      min-height: 44px;
      transform: none;
    }

    .async-flow-arrow::before {
      left: 50%;
      right: auto;
      top: 4px;
      bottom: 4px;
      width: 2px;
      height: auto;
      transform: translateX(-50%);
    }

    .async-flow-arrow::after {
      right: auto;
      left: 50%;
      top: auto;
      bottom: 3px;
      transform: translateX(-50%) rotate(135deg);
    }

    .async-flow-arrow span {
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 1ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 1ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export const S = {
  page: {
    padding: '28px 32px',
    maxWidth: 1320,
    margin: '0 auto',
    fontFamily: 'var(--font)',
    color: 'var(--text-primary)',
    minHeight: '100vh',
    background: 'var(--bg)',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 20,
    boxShadow: 'var(--shadow-sm)',
  } as React.CSSProperties,

  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    minHeight: 34,
    padding: '7px 16px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition), transform var(--transition), filter var(--transition)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    minHeight: 34,
    padding: '7px 16px',
    borderRadius: 8,
    border: '1px solid transparent',
    background: 'var(--brand)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.10), 0 6px 14px rgba(37,99,235,0.16)',
    transition: 'background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition), transform var(--transition), filter var(--transition)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  btnSoft: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 34,
    padding: '7px 16px',
    borderRadius: 8,
    border: '1px solid rgba(37,99,235,0.25)',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition), transform var(--transition), filter var(--transition)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  btnDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 34,
    padding: '7px 16px',
    borderRadius: 8,
    border: '1px solid var(--danger-border)',
    background: 'var(--danger-soft)',
    color: 'var(--danger)',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition), transform var(--transition), filter var(--transition)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  btnTutorial: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 36,
    padding: '8px 17px',
    borderRadius: 8,
    border: '1px solid rgba(37,99,235,0.34)',
    background: 'linear-gradient(180deg, var(--accent-soft), var(--bg-card))',
    color: 'var(--accent)',
    fontSize: 13,
    fontWeight: 850,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(37,99,235,0.12)',
    transition: 'background var(--transition), border-color var(--transition), color var(--transition), box-shadow var(--transition), transform var(--transition), filter var(--transition)',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  th: {
    padding: '9px 12px',
    textAlign: 'left' as const,
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-subtle)',
  } as React.CSSProperties,

  td: {
    padding: '10px 12px',
    fontSize: 13,
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle' as const,
  } as React.CSSProperties,

  tableRow: {
    transition: 'background var(--transition)',
  } as React.CSSProperties,

  tableHeader: {
    background: 'var(--bg-subtle)',
  } as React.CSSProperties,

  input: {
    padding: '8px 11px',
    borderRadius: 7,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  select: {
    padding: '8px 34px 8px 11px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 650,
    fontFamily: 'var(--font)',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    transition: 'border-color var(--transition), box-shadow var(--transition), background var(--transition)',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  badge: (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 9px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: color + '16',
    color,
    border: '1px solid ' + color + '30',
    fontFamily: 'var(--font)',
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.01em',
  }),

  chip: (active: boolean, color?: string): React.CSSProperties => ({
    padding: '5px 13px',
    borderRadius: 20,
    border: `1px solid ${active ? (color ?? 'var(--accent)') : 'var(--border)'}`,
    background: active ? (color ? color + '14' : 'var(--accent-soft)') : 'transparent',
    color: active ? (color ?? 'var(--accent)') : 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--font)',
    whiteSpace: 'nowrap' as const,
  }),
};
