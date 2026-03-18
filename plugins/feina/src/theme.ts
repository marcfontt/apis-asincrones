import React from 'react';

export const getTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
};

const LIGHT = {
  bgMain:        '#ffffff',
  bgCard:        '#f6f8fa',
  bgHover:       '#eaeef2',
  bgInput:       '#ffffff',
  border:        '#d0d7de',
  textPrimary:   '#1f2328',
  textSecondary: '#656d76',
  textDisabled:  '#adb5bd',
  accent:        '#0969da',
  success:       '#1a7f37',
  warning:       '#9a6700',
  error:         '#cf222e',
  special:       '#8250df',
  cyan:          '#0598bc',
};

const DARK = {
  bgMain:        '#0d1117',
  bgCard:        '#161b22',
  bgHover:       '#1c2128',
  bgInput:       '#0d1117',
  border:        '#30363d',
  textPrimary:   '#e6edf3',
  textSecondary: '#8b949e',
  textDisabled:  '#484f58',
  accent:        '#58a6ff',
  success:       '#3fb950',
  warning:       '#d29922',
  error:         '#f85149',
  special:       '#bc8cff',
  cyan:          '#39d0d4',
};

export const COLORS = LIGHT;
export const DARK_COLORS = DARK;

export const CATEGORY_COLORS: Record<string, string> = {
  architecture: '#0969da',
  protocol:     '#1a7f37',
  platform:     '#9a6700',
  gateway:      '#8250df',
};

export const STATUS_COLORS: Record<string, string> = {
  pending:   '#9a6700',
  running:   '#0969da',
  completed: '#1a7f37',
  error:     '#cf222e',
  cleanup:   '#adb5bd',
};

export const S = {
  page: {
    padding: 32,
    background: 'var(--bg-main)',
    minHeight: '100vh',
    color: 'var(--text-primary)',
  } as React.CSSProperties,
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 24,
  } as React.CSSProperties,
  tableHeader: {
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  } as React.CSSProperties,
  tableRow: {
    borderBottom: '1px solid var(--border)',
    transition: 'background 0.1s',
  } as React.CSSProperties,
  th: {
    padding: '10px 16px',
    textAlign: 'left' as const,
    fontWeight: 600,
  } as React.CSSProperties,
  td: {
    padding: '12px 16px',
    color: 'var(--text-primary)',
    fontSize: 14,
  } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({
    background: color + '18',
    color: color,
    border: `1px solid ${color}44`,
    padding: '2px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    display: 'inline-block',
    whiteSpace: 'nowrap' as const,
  }),
  btn: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    padding: '8px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  btnPrimary: {
    background: 'var(--accent)',
    color: '#ffffff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  input: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  chip: (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 20,
    border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
    background: active ? 'var(--accent-bg)' : 'var(--bg-card)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  }),
};
