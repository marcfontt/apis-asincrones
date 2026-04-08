
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
  SidebarSpace,
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
      <Link to="/" underline="none" className={classes.link} aria-label="APIs Asincrones">
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};

const THEME_KEY = '@backstage/core-app-api:themeId';
const applyTheme = () => {
  try {
    const raw = localStorage.getItem(THEME_KEY) ?? '"light"';
    const id = JSON.parse(raw) as string;
    document.documentElement.setAttribute('data-theme', id === 'dark' ? 'dark' : 'light');
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
  }
};

export const Root = ({ children }: PropsWithChildren<{}>) => {
  useEffect(() => {
    applyTheme();
    window.addEventListener('storage', applyTheme);
    const interval = setInterval(applyTheme, 400);
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
        <SidebarGroup label="Menu" icon={<MenuIcon />}>
          <SidebarItem icon={HomeIcon}      to="home"       text="Home" />
          <SidebarDivider />
          <SidebarItem icon={StorageIcon}   to="catalog"    text="Cataleg" />
          <SidebarItem icon={ListAltIcon}   to="escenaris"  text="Escenaris" />
          <SidebarItem icon={PlayArrowIcon} to="execucions" text="Execucions" />
          <SidebarItem icon={BarChartIcon}  to="resultats"  text="Resultats" />
          <SidebarDivider />
          <SidebarItem icon={SettingsIcon}  to="settings"   text="Configuracio" />
        </SidebarGroup>
        <SidebarSpace />
      </Sidebar>
      {children}
    </SidebarPage>
  );
};
