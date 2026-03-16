import { PropsWithChildren } from 'react';
import { makeStyles } from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import StorageIcon from '@material-ui/icons/Storage';
import ListAltIcon from '@material-ui/icons/ListAlt';
import BarChartIcon from '@material-ui/icons/BarChart';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';
import { Settings as SidebarSettings, UserSettingsSignInAvatar } from '@backstage/plugin-user-settings';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { Sidebar, sidebarConfig, SidebarDivider, SidebarGroup, SidebarItem, SidebarPage, SidebarSpace, useSidebarOpenState, Link } from '@backstage/core-components';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { NotificationsSidebarItem } from '@backstage/plugin-notifications';

const useSidebarLogoStyles = makeStyles({
  root: { width: sidebarConfig.drawerWidthClosed, height: 3 * sidebarConfig.logoHeight, display: 'flex', flexFlow: 'row nowrap', alignItems: 'center', marginBottom: -14 },
  link: { width: sidebarConfig.drawerWidthClosed, marginLeft: 24 },
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

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        <SidebarItem icon={HomeIcon}     to="home"      text="Home" />
        <SidebarDivider />
        <SidebarItem icon={StorageIcon}  to="catalog"   text="Catàleg" />
        <SidebarItem icon={ListAltIcon}  to="escenaris" text="Escenaris" />
        <SidebarItem icon={BarChartIcon} to="resultats" text="Resultats" />
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <NotificationsSidebarItem />
      <SidebarDivider />
      <SidebarGroup label="Settings" icon={<UserSettingsSignInAvatar />} to="/settings">
        <SidebarSettings />
      </SidebarGroup>
    </Sidebar>
    {children}
  </SidebarPage>
);
