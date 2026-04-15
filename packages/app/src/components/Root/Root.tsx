import { PropsWithChildren, useEffect } from 'react';

// ── Dark mode overrides for Backstage/MUI built-in components ─────────────────
// Injected here (root of the component tree) so they apply to ALL pages,
// including sidebar, settings, and other Backstage-managed surfaces.
const DARK_MODE_CSS = `
  /* ── Sidebar / Drawer ── */
  [data-theme="dark"] nav,
  [data-theme="dark"] [class*="MuiDrawer-paper"],
  [data-theme="dark"] [class*="MuiDrawer-paperAnchorLeft"],
  [data-theme="dark"] [class*="BackstageSidebar-drawer"],
  [data-theme="dark"] [class*="makeStyles-drawer"] {
    background-color: #010409 !important;
    border-right: 1px solid #21262d !important;
  }
  [data-theme="dark"] [class*="BackstageSidebarItem"],
  [data-theme="dark"] [class*="makeStyles-buttonItem"],
  [data-theme="dark"] [class*="makeStyles-root"] a[class*="SidebarItem"],
  [data-theme="dark"] [class*="MuiListItem-root"] {
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="BackstageSidebarItem"][aria-selected="true"],
  [data-theme="dark"] [class*="makeStyles-selected"],
  [data-theme="dark"] [class*="Mui-selected"][class*="SidebarItem"] {
    color: #e6edf3 !important;
    background-color: rgba(88,166,255,0.08) !important;
  }
  [data-theme="dark"] [class*="BackstageSidebarLogo"],
  [data-theme="dark"] [class*="makeStyles-logo"] {
    border-bottom: 1px solid #21262d !important;
  }

  /* ── Settings / UserSettingsPage ── */
  [data-theme="dark"] [class*="MuiPaper-root"]:not([class*="MuiDrawer"]) {
    background-color: #161b22 !important;
    color: #e6edf3 !important;
    border-color: #30363d !important;
  }
  [data-theme="dark"] [class*="MuiCard-root"] {
    background-color: #161b22 !important;
    border: 1px solid #30363d !important;
  }
  [data-theme="dark"] [class*="MuiCardContent-root"],
  [data-theme="dark"] [class*="MuiCardHeader-root"] {
    background-color: #161b22 !important;
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiTab-root"] {
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiTab-root"][class*="Mui-selected"] {
    color: #58a6ff !important;
  }
  [data-theme="dark"] [class*="MuiTabs-indicator"] {
    background-color: #58a6ff !important;
  }
  [data-theme="dark"] [class*="MuiDivider-root"] {
    border-color: #21262d !important;
    background-color: #21262d !important;
  }
  [data-theme="dark"] [class*="MuiTypography-root"] {
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiTypography-colorTextSecondary"] {
    color: #8b949e !important;
  }
  [data-theme="dark"] [class*="MuiSwitch-track"] {
    background-color: #30363d !important;
  }
  [data-theme="dark"] [class*="MuiSelect-root"],
  [data-theme="dark"] [class*="MuiSelect-select"],
  [data-theme="dark"] [class*="MuiInputBase-root"] {
    background-color: #0d1117 !important;
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiOutlinedInput-notchedOutline"] {
    border-color: #30363d !important;
  }
  [data-theme="dark"] [class*="MuiPopover-paper"],
  [data-theme="dark"] [class*="MuiMenu-paper"],
  [data-theme="dark"] [class*="MuiMenu-list"] {
    background-color: #161b22 !important;
    border: 1px solid #30363d !important;
  }
  [data-theme="dark"] [class*="MuiMenuItem-root"] {
    color: #e6edf3 !important;
  }
  [data-theme="dark"] [class*="MuiMenuItem-root"]:hover {
    background-color: rgba(88,166,255,0.08) !important;
  }
  [data-theme="dark"] [class*="MuiAppBar-root"],
  [data-theme="dark"] [class*="MuiToolbar-root"] {
    background-color: #010409 !important;
    color: #e6edf3 !important;
    border-bottom: 1px solid #21262d !important;
  }

  /* ── General dark background for main layout ── */
  [data-theme="dark"],
  [data-theme="dark"] body,
  [data-theme="dark"] main,
  [data-theme="dark"] [class*="BackstageContent-root"],
  [data-theme="dark"] [class*="MuiPaper-elevation0"] {
    background-color: #0d1117 !important;
    color: #e6edf3;
  }
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

const useSidebarLogoStyles = makeStyles({
  root: {
    width: sidebarConfig.drawerWidthClosed,
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 20,
  },
});

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

const THEME_KEYS = [
  '@backstage/core-app-api:themeId',
  'theme',
  'backstage-theme',
];

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
    document.documentElement.setAttribute('data-theme', id === 'dark' ? 'dark' : 'light');
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

export const Root = ({ children }: PropsWithChildren<{}>) => {
  useEffect(() => {
    applyTheme();
    window.addEventListener('storage', applyTheme);
    const interval = setInterval(applyTheme, 300);
    return () => {
      window.removeEventListener('storage', applyTheme);
      clearInterval(interval);
    };
  }, []);

  return (
    <SidebarPage>
      <style>{DARK_MODE_CSS}</style>
      <Sidebar>
        <SidebarLogo />
        <SidebarDivider />
        <SidebarGroup label="Menú" icon={<MenuIcon />}>
          <SidebarItem icon={HomeIcon}      to="home"       text="Home" />
          <SidebarDivider />
          <SidebarItem icon={StorageIcon}   to="catalog"    text="Catàleg" />
          <SidebarItem icon={ListAltIcon}   to="escenaris"  text="Escenaris" />
          <SidebarItem icon={PlayArrowIcon} to="execucions" text="Execucions" />
          <SidebarItem icon={BarChartIcon}  to="resultats"  text="Resultats" />
          <SidebarDivider />
          <SidebarItem icon={SettingsIcon}  to="settings"   text="Configuració" />
        </SidebarGroup>
      </Sidebar>
      {children}
    </SidebarPage>
  );
};
