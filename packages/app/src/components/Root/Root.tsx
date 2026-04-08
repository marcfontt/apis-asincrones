import { PropsWithChildren, useEffect } from 'react';
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
