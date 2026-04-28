/**
 * Root.tsx — Component arrel de l'aplicació Backstage
 *
 * Responsabilitats:
 *  1. Sidebar de navegació amb icones i rutes
 *  2. Aplicació i sincronització del tema (light/dark) via data-theme a <html>
 *  3. Injecció del CSS de dark mode per a components MUI/Backstage
 *     (que no usen les nostres variables CSS, sinó classes de Material UI)
 *
 * Per què aquí i no a theme.ts?
 *   theme.ts cobreix les pàgines del plugin (dins <div style={S.page}>).
 *   Root.tsx cobreix la shell de Backstage: sidebar, AppBar, Settings, modals MUI.
 *   Cal separar-los perquè MUI v4 genera class names dinàmics (makeStyles-xxx)
 *   i necessitem selectors [class*="Mui*"] per sobreescriure'ls.
 */

import { PropsWithChildren, useEffect } from 'react';

// ── CSS de dark mode per a la shell de Backstage ───────────────────────────────
// Tots els selectors usen [class*="..."] per ser resilients als hash de MUI v4.
// IMPORTANT: No aplicar color a MuiTypography de forma global (trenca els badges).
// En lloc d'això, aplicar-lo per context (dins MuiPaper, MuiCard, etc.).
const DARK_MODE_CSS = `

  /* ── 1. Fons principal de l'aplicació ──────────────────────────────── */
  [data-theme="dark"],
  [data-theme="dark"] body {
    background-color: #09090b !important;
    color: #e6edf3;
  }

  /* Content area de Backstage (la zona dreta del sidebar) */
  [data-theme="dark"] main,
  [data-theme="dark"] [class*="BackstageContent"],
  [data-theme="dark"] [class*="BackstagePage-root"],
  [data-theme="dark"] [class*="makeStyles-root"][class*="Content"] {
    background-color: #09090b !important;
  }

  /* Paper elevació 0 (panells de contingut sense ombra) */
  [data-theme="dark"] [class*="MuiPaper-elevation0"] {
    background-color: #09090b !important;
  }

  /* ── 2. Sidebar / Drawer lateral ───────────────────────────────────── */
  /* Backstage 0.18.x uses multiple possible class-name patterns depending on
     the MUI version and build mode. We cast a wide net here so the sidebar
     always renders in our dark navy regardless of the exact classname hash. */

  /* MUI Drawer (the actual DOM node wrapping the sidebar) */
  [data-theme="dark"] [class*="MuiDrawer-paper"],
  [data-theme="dark"] [class*="MuiDrawer-paperAnchorDockedLeft"],
  /* Backstage-generated sidebar class names (v1.x) */
  [data-theme="dark"] [class*="BackstageSidebar-drawer"],
  [data-theme="dark"] [class*="BackstageSidebar-"],
  [data-theme="dark"] [class*="BackstageOldSidebar-"],
  [data-theme="dark"] [class*="privateBackstageSidebar"],
  /* Generic structural selectors as final fallback */
  [data-theme="dark"] nav[class*="Sidebar"],
  [data-theme="dark"] aside[class*="Sidebar"],
  [data-theme="dark"] div[class*="BackstageSidebar"] {
    background: #0d1117 !important;
    background-color: #0d1117 !important;
    background-image: none !important;
    border-right: 1px solid #21262d !important;
  }

  /* Also override the MUI theme's navigation color that Backstage injects.
     Backstage applies a separate <style> tag with .navigation-xxx that has
     the light/dark background. Target it directly. */
  [data-theme="dark"] [class*="navigation"],
  [data-theme="dark"] [data-sidebar] {
    background: #0d1117 !important;
    background-color: #0d1117 !important;
    background-image: none !important;
  }

  /* Items de navegació del sidebar: text i icona */
  [data-theme="dark"] [class*="BackstageSidebarItem-root"],
  [data-theme="dark"] [class*="BackstageSidebarItem-"],
  [data-theme="dark"] [class*="makeStyles-buttonItem"],
  [data-theme="dark"] [class*="SidebarItem-root"],
  [data-theme="dark"] [class*="privateBackstageSidebarItem"] {
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="BackstageSidebarItem-root"] svg,
  [data-theme="dark"] [class*="BackstageSidebarItem-"] svg,
  [data-theme="dark"] [class*="makeStyles-buttonItem"] svg,
  [data-theme="dark"] [class*="SidebarItem-root"] svg,
  [data-theme="dark"] [class*="privateBackstageSidebarItem"] svg {
    color: #8b949e !important;
    fill: #8b949e !important;
  }

  /* Item actiu/seleccionat */
  [data-theme="dark"] [class*="BackstageSidebarItem-selected"],
  [data-theme="dark"] [class*="makeStyles-selected"],
  [data-theme="dark"] [class*="SidebarItem-root"][aria-current="page"],
  [data-theme="dark"] [class*="SidebarItem-root"].active,
  [data-theme="dark"] [class*="Sidebar"][aria-selected="true"],
  [data-theme="dark"] [class*="privateBackstageSidebarItem"][aria-current="page"] {
    color: #e6edf3 !important;
    background-color: rgba(88, 166, 255, 0.10) !important;
  }
  [data-theme="dark"] [class*="BackstageSidebarItem-selected"] svg,
  [data-theme="dark"] [class*="makeStyles-selected"] svg,
  [data-theme="dark"] [class*="privateBackstageSidebarItem"][aria-current="page"] svg {
    color: #58a6ff !important;
    fill: #58a6ff !important;
  }

  /* Divisors del sidebar */
  [data-theme="dark"] [class*="BackstageSidebarDivider"],
  [data-theme="dark"] [class*="SidebarDivider"],
  [data-theme="dark"] [class*="privateBackstageSidebarDivider"] {
    background-color: #21262d !important;
  }

  /* Zona del logo (capçalera del sidebar) */
  [data-theme="dark"] [class*="BackstageSidebarLogo"],
  [data-theme="dark"] [class*="SidebarLogo"],
  [data-theme="dark"] [class*="privateBackstageSidebarLogo"] {
    border-bottom: 1px solid #21262d !important;
  }

  /* ── 3. AppBar / Toolbar (barra superior quan existeix) ─────────────── */
  [data-theme="dark"] [class*="MuiAppBar-root"],
  [data-theme="dark"] [class*="MuiToolbar-root"] {
    background-color: #0d1117 !important;
    color: #e6edf3 !important;
    border-bottom: 1px solid #21262d !important;
    box-shadow: none !important;
  }

  /* ── 4. Superfícies MUI (Paper, Card) — CONTEXT: Settings / Modals ─── */
  /* Atenció: NO aplicar a MuiDrawer (ja cobert per regla sidebar) */
  [data-theme="dark"] [class*="MuiPaper-root"]:not([class*="MuiDrawer-paper"]) {
    background-color: #161b22 !important;
    border-color: #30363d !important;
  }
  [data-theme="dark"] [class*="MuiCard-root"] {
    background-color: #161b22 !important;
    border: 1px solid #30363d !important;
  }
  [data-theme="dark"] [class*="MuiCardContent-root"],
  [data-theme="dark"] [class*="MuiCardHeader-root"],
  [data-theme="dark"] [class*="MuiCardActions-root"] {
    background-color: #161b22 !important;
    /* Aquí SÍ sobreescrivim el text, perquè estem dins un Card de settings */
    color: #e6edf3 !important;
  }

  /* Títols i text DINS de superfícies de settings (no global, per no trencar badges) */
  [data-theme="dark"] [class*="MuiCard-root"] [class*="MuiTypography-root"],
  [data-theme="dark"] [class*="MuiPaper-root"]:not([class*="MuiDrawer-paper"]) > [class*="MuiTypography-root"],
  [data-theme="dark"] [class*="MuiListItem-root"] [class*="MuiTypography-root"],
  [data-theme="dark"] [class*="MuiCardHeader-root"] [class*="MuiTypography-root"] {
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiTypography-colorTextSecondary"] {
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiTypography-caption"] {
    color: #8b949e !important;
  }

  /* ── 5. Tabs (pestanyes de la pàgina Settings) ──────────────────────── */
  [data-theme="dark"] [class*="MuiTab-root"] {
    color: #8b949e !important;
    opacity: 1 !important;
  }
  [data-theme="dark"] [class*="MuiTab-root"][class*="Mui-selected"],
  [data-theme="dark"] [class*="MuiTab-root"].Mui-selected {
    color: #58a6ff !important;
  }
  [data-theme="dark"] [class*="MuiTabs-indicator"] {
    background-color: #58a6ff !important;
  }
  [data-theme="dark"] [class*="MuiTabs-root"] {
    border-bottom: 1px solid #21262d !important;
  }

  /* ── 6. Lists (llistes dins Settings) ──────────────────────────────── */
  [data-theme="dark"] [class*="MuiList-root"] {
    background-color: #161b22 !important;
  }
  [data-theme="dark"] [class*="MuiListItem-root"] {
    border-bottom: 1px solid #21262d !important;
  }
  [data-theme="dark"] [class*="MuiListItem-root"]:hover {
    background-color: rgba(88, 166, 255, 0.05) !important;
  }
  [data-theme="dark"] [class*="MuiListItemText-primary"] {
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiListItemText-secondary"] {
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiListItemIcon-root"] {
    color: #8b949e !important;
  }

  /* ── 7. Dividers ────────────────────────────────────────────────────── */
  [data-theme="dark"] [class*="MuiDivider-root"] {
    background-color: #21262d !important;
    border-color: #21262d !important;
  }

  /* ── 8. Inputs i formularis (Settings: nom, cognom, idioma...) ──────── */
  [data-theme="dark"] [class*="MuiInputBase-root"],
  [data-theme="dark"] [class*="MuiOutlinedInput-root"],
  [data-theme="dark"] [class*="MuiFilledInput-root"] {
    background-color: #0d1117 !important;
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiInputBase-input"],
  [data-theme="dark"] [class*="MuiSelect-root"] {
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiOutlinedInput-notchedOutline"] {
    border-color: #30363d !important;
  }
  [data-theme="dark"] [class*="MuiInputLabel-root"],
  [data-theme="dark"] [class*="MuiFormLabel-root"] {
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiInputLabel-root"][class*="Mui-focused"],
  [data-theme="dark"] [class*="MuiFormLabel-root"][class*="Mui-focused"] {
    color: #58a6ff !important;
  }
  [data-theme="dark"] [class*="MuiOutlinedInput-root"]:hover [class*="MuiOutlinedInput-notchedOutline"] {
    border-color: #58a6ff !important;
  }
  [data-theme="dark"] [class*="MuiOutlinedInput-root"][class*="Mui-focused"] [class*="MuiOutlinedInput-notchedOutline"] {
    border-color: #58a6ff !important;
  }

  /* ── 9. Buttons MUI (botons de Settings: Guardar, Cancel...) ────────── */
  [data-theme="dark"] [class*="MuiButton-contained"] {
    background-color: #58a6ff !important;
    color: #0d1117 !important;
  }
  [data-theme="dark"] [class*="MuiButton-outlined"] {
    border-color: #30363d !important;
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiButton-text"] {
    color: #58a6ff !important;
  }

  /* ── 10. Switch (interruptor de tema a Settings) ────────────────────── */
  [data-theme="dark"] [class*="MuiSwitch-track"] {
    background-color: #30363d !important;
  }
  [data-theme="dark"] [class*="MuiSwitch-thumb"] {
    background-color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiSwitch-root"][class*="Mui-checked"] [class*="MuiSwitch-thumb"] {
    background-color: #58a6ff !important;
  }
  [data-theme="dark"] [class*="MuiSwitch-root"][class*="Mui-checked"] [class*="MuiSwitch-track"] {
    background-color: rgba(88, 166, 255, 0.30) !important;
  }

  /* ── 11. Select i Dropdown (menú desplegable) ───────────────────────── */
  [data-theme="dark"] [class*="MuiPopover-paper"],
  [data-theme="dark"] [class*="MuiMenu-paper"],
  [data-theme="dark"] [class*="MuiAutocomplete-paper"] {
    background-color: #161b22 !important;
    border: 1px solid #30363d !important;
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiMenu-list"],
  [data-theme="dark"] [class*="MuiAutocomplete-listbox"] {
    background-color: #161b22 !important;
  }
  [data-theme="dark"] [class*="MuiMenuItem-root"] {
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiMenuItem-root"]:hover,
  [data-theme="dark"] [class*="MuiMenuItem-root"][class*="Mui-selected"] {
    background-color: rgba(88, 166, 255, 0.10) !important;
  }

  /* ── 12. Avatar i Chip (perfil d'usuari a Settings) ────────────────── */
  [data-theme="dark"] [class*="MuiAvatar-root"] {
    background-color: #30363d !important;
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiChip-root"] {
    background-color: rgba(88, 166, 255, 0.12) !important;
    border-color: rgba(88, 166, 255, 0.25) !important;
    color: #58a6ff !important;
  }

  /* ── 13. Dialog / Modal (confirmació, etc.) ─────────────────────────── */
  [data-theme="dark"] [class*="MuiDialog-paper"] {
    background-color: #161b22 !important;
    border: 1px solid #30363d !important;
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiDialogTitle-root"] {
    background-color: #161b22 !important;
    color: #e6edf3 !important;
    border-bottom: 1px solid #21262d !important;
  }
  [data-theme="dark"] [class*="MuiDialogContent-root"] {
    background-color: #161b22 !important;
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiDialogActions-root"] {
    background-color: #161b22 !important;
    border-top: 1px solid #21262d !important;
  }

  /* ── 14. Tooltip ────────────────────────────────────────────────────── */
  [data-theme="dark"] [class*="MuiTooltip-tooltip"] {
    background-color: #21262d !important;
    border: 1px solid #30363d !important;
    color: #e6edf3 !important;
    font-size: 12px !important;
  }

  /* ── 15. Snackbar / Alert (notificacions) ───────────────────────────── */
  [data-theme="dark"] [class*="MuiSnackbar-root"] [class*="MuiPaper-root"] {
    background-color: #21262d !important;
    color: #e6edf3 !important;
  }

  /* ── 16. Scrollbar global discreta ──────────────────────────────────── */
  [data-theme="dark"] ::-webkit-scrollbar { width: 5px; height: 5px; }
  [data-theme="dark"] ::-webkit-scrollbar-track { background: transparent; }
  [data-theme="dark"] ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 10px; }
  [data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: #30363d; }
`;

import { makeStyles } from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import StorageIcon from '@material-ui/icons/Storage';
import ListAltIcon from '@material-ui/icons/ListAlt';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import BarChartIcon from '@material-ui/icons/BarChart';
import SettingsIcon from '@material-ui/icons/Settings';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';
import {
  Sidebar,
  sidebarConfig,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  useSidebarOpenState,
  Link,
} from '@backstage/core-components';
import MenuIcon from '@material-ui/icons/Menu';

// Estils per al contenidor del logo dins del sidebar
const useSidebarLogoStyles = makeStyles({
  root: {
    width:      sidebarConfig.drawerWidthClosed,
    height:     3 * sidebarConfig.logoHeight,
    display:    'flex',
    flexFlow:   'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width:      sidebarConfig.drawerWidthClosed,
    marginLeft: 20,
  },
});

// Logo del sidebar: complet quan obert, icona quan tancat
const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();
  return (
    <div className={classes.root}>
      <Link to="/" underline="none" className={classes.link} aria-label="APIs Asíncrones">
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};

// ── Detecció i aplicació del tema ──────────────────────────────────────────────
// Backstage desa la preferència de tema en localStorage amb diverses claus
// depenent de la versió. Provem totes per màxima compatibilitat.
//
// La funció aplica `data-theme="dark"` o `data-theme="light"` a <html>,
// que és el punt d'anclatge de totes les nostres regles CSS (theme.ts + Root.tsx).
const THEME_KEYS = [
  '@backstage/core-app-api:themeId',  // Backstage ≥ 1.5 (format JSON)
  'theme',                             // Algunes versions antigues
  'backstage-theme',                   // Versions molt antigues
];

// Resol la preferència del sistema operatiu (només dark o light).
// Es fa servir quan l'usuari té el tema en mode "auto".
const obtenirTemaSistema = (): 'dark' | 'light' => {
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  } catch {
    return 'light';
  }
};

const applyTheme = () => {
  try {
    let id = 'light';
    for (const key of THEME_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try { id = JSON.parse(raw) as string; }
        catch { id = raw; }
        break;
      }
    }
    // Si l'usuari tria "auto", seguim la preferència del sistema operatiu.
    // Així el botó "Auto" deixa de ser inútil i fa el que diu el seu nom.
    if (id === 'auto') {
      id = obtenirTemaSistema();
    }
    document.documentElement.setAttribute('data-theme', id === 'dark' ? 'dark' : 'light');
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

// ── Component principal ────────────────────────────────────────────────────────
// Root envolta tota l'app. Aquí:
//   1. Escolta canvis de tema (event 'storage' + polling cada 300ms)
//   2. Injecta el CSS de dark mode per a MUI
//   3. Renderitza el sidebar + contingut de pàgina (children)
export const Root = ({ children }: PropsWithChildren<{}>) => {
  useEffect(() => {
    // Aplicar el tema immediatament en muntar
    applyTheme();

    // Escolta canvis de localStorage (quan l'usuari canvia el tema a Settings)
    window.addEventListener('storage', applyTheme);

    // Si l'usuari té el tema en mode "auto", també hem de reaccionar quan
    // canvia la preferència del sistema operatiu (dark/light).
    const mediaQueryFosc = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryFosc.addEventListener('change', applyTheme);

    // Polling com a fallback: localStorage.setItem no dispara 'storage'
    // a la mateixa pestanya, per tant necessitem un interval curt
    const interval = setInterval(applyTheme, 300);

    return () => {
      window.removeEventListener('storage', applyTheme);
      mediaQueryFosc.removeEventListener('change', applyTheme);
      clearInterval(interval);
    };
  }, []);

  return (
    <SidebarPage>
      {/* Injectar el CSS de dark mode per a la shell MUI/Backstage */}
      <style>{DARK_MODE_CSS}</style>

      <Sidebar>
        <SidebarLogo />
        <SidebarDivider />

        {/* Grup de navegació principal */}
        <SidebarGroup label="Menú" icon={<MenuIcon />}>
          <SidebarItem icon={HomeIcon}      to="home"       text="Home" />
          <SidebarDivider />
          <SidebarItem icon={StorageIcon}   to="catalog"    text="Catàleg" />
          <SidebarItem icon={ListAltIcon}   to="escenaris"  text="Escenaris" />
          <SidebarItem icon={PlayArrowIcon} to="execucions" text="Execucions" />
          <SidebarItem icon={BarChartIcon}  to="resultats"  text="Resultats" />
          <SidebarDivider />
          {/* Configuració: pestaña de Settings de Backstage (tema, perfil, auth) */}
          <SidebarItem icon={SettingsIcon}  to="settings"   text="Configuració" />
        </SidebarGroup>
      </Sidebar>

      {/* Contingut de la pàgina activa */}
      {children}
    </SidebarPage>
  );
};
