/**
 * theme.ts — Sistema de disseny global per al plugin Feina (AsyncBench)
 *
 * Aquest fitxer centralitza TOTS els tokens de disseny: colors, fonts, espaiat,
 * ombres i components reutilitzables. Qualsevol canvi visual hauria de
 * comecar aqui per garantir consistencia a tota l'aplicacio.
 *
 * Estructura:
 *  1. CATEGORY_COLORS — colors per a cada categoria del cataleg
 *  2. GLOBAL_CSS      — regles CSS globals injectades via <style>
 *  3. S               — objecte d'estils React reutilitzables (components)
 *
 * Fonts: IBM Plex Sans (cos) + JetBrains Mono (codi/numeros)
 * Modo: OLED dark by default, light mode disponible
 */

import React from 'react';

// ── 1. Colors de categoria (CatalogPage) ─────────────────────────────────────
// Cada tipus de component del cataleg te el seu color identificatiu.
// S'usen als badges i icones per distingir rapidament el tipus d'element.
export const CATEGORY_COLORS: Record<string, string> = {
  architecture: '#3b82f6', // blau  — patrons arquitectonics (EDA, QBA, etc.)
  protocol:     '#22c55e', // verd  — protocols de missatgeria (Kafka, NATS, etc.)
  platform:     '#f59e0b', // ambre — plataformes de broker
  gateway:      '#a78bfa', // viola — gateways i proxies
};

// ── 2. CSS global: tokens, animacions, utilitats ─────────────────────────────
// Injectat una vegada a cada pagina via <style>{GLOBAL_CSS}</style>.
// Usa variables CSS (--nom) per suportar light/dark mode automaticament.
export const GLOBAL_CSS = `
  /* Importem IBM Plex Sans (cos) i JetBrains Mono (codi) de Google Fonts.
     IBM Plex Sans: dissenyada per IBM, excel·lent llegibilitat en pantalles.
     JetBrains Mono: dissenyada per codi, numeros molt llegibles en dashboards. */
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  /* ── Tokens mode clar ── */
  :root {
    --font:       'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono:  'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

    /* Fons: tons grisos neutres */
    --bg:          #f1f5f9;
    --bg-card:     #ffffff;
    --bg-hover:    #f8fafc;
    --bg-subtle:   #f8fafc;

    /* Text: jerarquia de tres nivells */
    --text-primary:   #0f172a;  /* titols i contingut principal */
    --text-secondary: #475569;  /* text de suport */
    --text-disabled:  #94a3b8;  /* text inactiu, placeholders */

    /* Bordes: molt subtils en mode clar */
    --border:      rgba(15,23,42,0.09);

    /* Accent principal (blau) i variacions */
    --accent:      #2563eb;
    --accent-soft: rgba(37,99,235,0.08);

    /* Estats semantics */
    --success:     #16a34a;  /* exit, complert, correcte */
    --error:       #dc2626;  /* error, eliminat, crític */
    --warning:     #d97706;  /* advertencia, pendent */

    /* Ombres per profunditat visual */
    --shadow-sm:   0 1px 2px rgba(0,0,0,0.04);
    --shadow-md:   0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-lg:   0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);

    /* Velocitat de transicio estandard */
    --transition:  0.15s ease;
  }

  /* ── Tokens mode fosc (OLED-optimitzat) ── */
  /* OLED mostra negre pur apagant pixels, estalviant bateria i millora contrast */
  [data-theme="dark"] {
    --bg:          #09090b;   /* negre quasi-pur per OLED */
    --bg-card:     #0f1117;   /* targetes lleugerament mes clares */
    --bg-hover:    #161921;   /* hover states */
    --bg-subtle:   #0b0d12;   /* fons secundari per capçaleres de taula */

    /* Text: blanc amb varies opacitats per jerarquia */
    --text-primary:   #f0f6fc;  /* quasi blanc, maxim contrast */
    --text-secondary: #8b949e;  /* gris mig, informacio secundaria */
    --text-disabled:  #484f58;  /* gris fosc, elements desactivats */

    /* Bordes: molt subtils en fosc per no distreure */
    --border:      rgba(240,246,252,0.07);

    /* Accent blau lluminós — visible sobre fons fosc */
    --accent:      #58a6ff;
    --accent-soft: rgba(88,166,255,0.10);

    /* Stats semantics amb lluminositat adaptada al fosc */
    --success:     #3fb950;
    --error:       #f85149;
    --warning:     #d29922;

    /* Ombres mes fortes en fosc per crear separacio visual */
    --shadow-sm:   0 1px 3px rgba(0,0,0,0.50);
    --shadow-md:   0 2px 8px rgba(0,0,0,0.60);
    --shadow-lg:   0 8px 24px rgba(0,0,0,0.70);

    --transition:  0.15s ease;
  }

  /* ── Animacions reutilitzables ── */

  /* shimmer: efecte de carrega (skeleton loader) */
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* fadeUp: aparicio subtil de baix a dalt */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* slideIn: entrada des de la dreta (panell lateral) */
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* pulseDot: indicador de "en execucio" (punt que pulsa) */
  @keyframes pulseDot {
    0%, 100% { opacity: 1;    transform: scale(1); }
    50%      { opacity: 0.50; transform: scale(1.4); }
  }

  /* spin: rotacio continua per spinners de carrega */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* heroGlow: batec subtil dels radials de fons a la pagina principal */
  @keyframes heroGlow {
    0%, 100% { opacity: 0.35; }
    50%      { opacity: 0.65; }
  }

  /* ── Accessibilitat: focus visible (WCAG 2.4.7) ── */
  /* Mostra un anell quan l'usuari navega amb teclat, obligatori per WCAG */
  *:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* ── Botons: estados hover, active i disabled ── */
  button:hover:not(:disabled), a[role="button"]:hover {
    filter: brightness(1.06);
  }
  button:active:not(:disabled) {
    transform: scale(0.97);
    transition: transform 0.08s ease;
  }
  /* Boto desactivat: semitransparent i cursor no-allowed */
  button:disabled {
    opacity: 0.42 !important;
    cursor: not-allowed !important;
    pointer-events: none;
  }

  /* ── Efecte glow en modo fosc: botons primaris ── */
  /* Dona sensacio de profunditat sense ser excessiu */
  [data-theme="dark"] button[style*="var(--accent)"] {
    box-shadow: 0 0 14px rgba(88,166,255,0.20), 0 2px 4px rgba(0,0,0,0.40) !important;
  }
  [data-theme="dark"] button[style*="var(--success)"] {
    box-shadow: 0 0 14px rgba(63,185,80,0.20), 0 2px 4px rgba(0,0,0,0.40) !important;
  }
  [data-theme="dark"] button[style*="var(--error)"] {
    box-shadow: 0 0 14px rgba(248,81,73,0.20), 0 2px 4px rgba(0,0,0,0.40) !important;
  }

  /* ── Targetes amb hover en modo fosc ── */
  /* Classe .card-hover aplicada a targetes clicables */
  [data-theme="dark"] .card-hover:hover {
    border-color: rgba(88,166,255,0.22) !important;
    box-shadow: 0 4px 24px rgba(0,0,0,0.60), 0 0 0 1px rgba(88,166,255,0.10) !important;
  }

  /* ── Files de taula: hover suau ── */
  [data-theme="dark"] tr:hover td {
    background: rgba(88,166,255,0.03) !important;
  }

  /* ── Inputs: focus amb glow en fosc ── */
  [data-theme="dark"] input:focus,
  [data-theme="dark"] select:focus,
  [data-theme="dark"] textarea:focus {
    border-color: #58a6ff !important;
    box-shadow: 0 0 0 3px rgba(88,166,255,0.12) !important;
    background-color: #0b0d12 !important;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 3px var(--accent-soft) !important;
  }

  /* ── Transicio per a .card-hover (usada a targetes interactives) ── */
  .card-hover {
    transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
  }

  /* ── Scrollbar personalitzada: discreta, no ocupa espai ── */
  ::-webkit-scrollbar        { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track  { background: transparent; }
  ::-webkit-scrollbar-thumb  { background: var(--border); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-disabled); }

  /* ── Seleccio de text: usa l'accent de la marca ── */
  ::selection { background: var(--accent); color: #fff; }

  /* ── Fons de la pagina Backstage en modo fosc ── */
  /* Overriding el background blanc per defecte del shell de Backstage */
  [data-theme="dark"] [class*="BackstageContent"],
  [data-theme="dark"] main > div {
    background-color: #09090b !important;
  }

  /* ── Reduced motion: desactiva animacions per accessibilitat ── */
  /* Per a usuaris amb vestibular disorders o preferencies d'accessibilitat */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// ── 3. Objecte S: estils React reutilitzables ────────────────────────────────
// Tots els valors usen variables CSS (--nom) per funcionar en light i dark mode.
// S'importa com: import { S } from '../../theme';
// S'usa com:     style={{ ...S.card }}  o  style={{ ...S.btn, fontSize: 12 }}
export const S = {

  // page: contenidor principal de cada pagina
  // maxWidth limitat per legibilitat en pantalles amples
  page: {
    padding:    '24px 28px',
    maxWidth:   1320,
    margin:     '0 auto',
    fontFamily: 'var(--font)',
    color:      'var(--text-primary)',
    minHeight:  '100vh',
    background: 'var(--bg)',
    boxSizing:  'border-box' as const,
  } as React.CSSProperties,

  // card: targeta blanca/fosca amb vora i ombra subtils
  // Es la unitat visual principal de tota l'app
  card: {
    background:   'var(--bg-card)',
    border:       '1px solid var(--border)',
    borderRadius: 10,
    padding:      20,
    boxShadow:    'var(--shadow-sm)',
  } as React.CSSProperties,

  // btn: boto secundari (accions no destructives: actualitzar, cancel·lar...)
  btn: {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          6,
    padding:      '6px 14px',
    borderRadius: 7,
    border:       '1px solid var(--border)',
    background:   'var(--bg-card)',
    color:        'var(--text-secondary)',
    fontSize:     13,
    fontWeight:   500,
    cursor:       'pointer',
    fontFamily:   'var(--font)',
    transition:   'all 0.15s ease',
    whiteSpace:   'nowrap' as const,
  } as React.CSSProperties,

  // btnPrimary: boto d'accio principal (executar, guardar, confirmar...)
  // Usa l'accent color per maxima visibilitat
  btnPrimary: {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          6,
    padding:      '6px 14px',
    borderRadius: 7,
    border:       '1px solid transparent',
    background:   'var(--accent)',
    color:        '#fff',
    fontSize:     13,
    fontWeight:   600,
    cursor:       'pointer',
    fontFamily:   'var(--font)',
    boxShadow:    '0 1px 2px rgba(0,0,0,0.12)',
    transition:   'all 0.15s ease',
    whiteSpace:   'nowrap' as const,
  } as React.CSSProperties,

  // th: capçalera de columna de taula
  // Text en majuscules petites, molt compacte per no robar espai visual
  th: {
    padding:       '9px 12px',
    textAlign:     'left'      as const,
    fontSize:      10,
    fontWeight:    700,
    color:         'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    whiteSpace:    'nowrap'    as const,
    borderBottom:  '1px solid var(--border)',
    background:    'var(--bg-subtle)',
  } as React.CSSProperties,

  // td: cel·la de dades de taula
  // Altura i padding calculats per mostrar densitat adequada
  td: {
    padding:      '10px 12px',
    fontSize:     13,
    color:        'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    verticalAlign:'middle' as const,
  } as React.CSSProperties,

  // tableRow: fila amb transicio suau per al hover
  tableRow: {
    transition: 'background var(--transition)',
  } as React.CSSProperties,

  // tableHeader: fila de capçalera
  tableHeader: {
    background: 'var(--bg-subtle)',
  } as React.CSSProperties,

  // input: camp de text i textarea
  // Estil consistent amb tots els inputs de l'app
  input: {
    padding:      '8px 11px',
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

  // badge: etiqueta de color per a protocols, arquitectures, formats, etc.
  // color: hex del color principal (ex: '#ef4444' per a Kafka)
  // El fons es el color amb 9% d'opacitat, la vora amb 19%
  badge: (color: string): React.CSSProperties => ({
    display:      'inline-flex',
    alignItems:   'center',
    padding:      '2px 8px',
    borderRadius: 20,
    fontSize:     11,
    fontWeight:   600,
    background:   color + '16',
    color,
    border:       '1px solid ' + color + '30',
    fontFamily:   'var(--font)',
    whiteSpace:   'nowrap'   as const,
    letterSpacing:'0.01em',
  }),

  // chip: filtre actiu/inactiu (per a chips de filtre de taula)
  // active: si el filtre esta aplicat
  // color: color de l'accent quan esta actiu (opcional)
  chip: (active: boolean, color?: string): React.CSSProperties => ({
    padding:      '4px 12px',
    borderRadius: 20,
    border:       `1px solid ${active ? (color ?? 'var(--accent)') : 'var(--border)'}`,
    background:   active ? (color ? color + '14' : 'var(--accent-soft)') : 'transparent',
    color:        active ? (color ?? 'var(--accent)') : 'var(--text-secondary)',
    fontSize:     12,
    fontWeight:   active ? 600 : 400,
    cursor:       'pointer',
    transition:   'all 0.15s ease',
    fontFamily:   'var(--font)',
    whiteSpace:   'nowrap' as const,
  }),
};
