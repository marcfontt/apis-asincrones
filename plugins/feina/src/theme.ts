import React from 'react';

export const COLORS = {
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

export const CATEGORY_COLORS: Record<string, string> = {
  architecture: '#58a6ff',
  protocol:     '#3fb950',
  platform:     '#d29922',
  gateway:      '#bc8cff',
};

export const STATUS_COLORS: Record<string, string> = {
  pending:   '#d29922',
  running:   '#58a6ff',
  completed: '#3fb950',
  error:     '#f85149',
  cleanup:   '#484f58',
};

export const S = {
  page: {
    padding: 32,
    background: '#0d1117',
    minHeight: '100vh',
    color: '#e6edf3',
  } as React.CSSProperties,
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: 24,
  } as React.CSSProperties,
  tableHeader: {
    background: '#161b22',
    color: '#8b949e',
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  } as React.CSSProperties,
  tableRow: {
    borderBottom: '1px solid #21262d',
    transition: 'background 0.1s',
  } as React.CSSProperties,
  th: {
    padding: '10px 16px',
    textAlign: 'left' as const,
    fontWeight: 600,
  } as React.CSSProperties,
  td: {
    padding: '12px 16px',
    color: '#e6edf3',
    fontSize: 14,
  } as React.CSSProperties,
  badge: (color: string): React.CSSProperties => ({
    background: color + '22',
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
    background: '#21262d',
    color: '#e6edf3',
    border: '1px solid #30363d',
    padding: '8px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  btnPrimary: {
    background: '#58a6ff',
    color: '#0d1117',
    border: 'none',
    padding: '8px 18px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'background 0.15s',
  } as React.CSSProperties,
  input: {
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 6,
    color: '#e6edf3',
    padding: '8px 12px',
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  chip: (active: boolean): React.CSSProperties => ({
    padding: '6px 16px',
    borderRadius: 20,
    border: active ? '1px solid #58a6ff' : '1px solid #30363d',
    background: active ? '#58a6ff22' : '#161b22',
    color: active ? '#58a6ff' : '#8b949e',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  }),
};
