import './i18n';
import { PropsWithChildren } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { SearchPage } from '@backstage/plugin-search';
import { AlertDisplay, OAuthRequestDialog, SignInPage } from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { NotificationsPage } from '@backstage/plugin-notifications';
import { SignalsDisplay } from '@backstage/plugin-signals';
import { catalogPlugin, CatalogIndexPage, CatalogEntityPage } from '@backstage/plugin-catalog';
import { UnifiedThemeProvider, createUnifiedTheme, palettes } from '@backstage/theme';
import DarkIcon from '@material-ui/icons/Brightness2';
import LightIcon from '@material-ui/icons/WbSunny';
import { entityPage } from './components/catalog/EntityPage';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { orgPlugin } from '@backstage/plugin-org';
import { apis } from './apis';
import { searchPage } from './components/search/SearchPage';
import { Root } from './components/Root';
import { HomePage, CatalogPage, ScenariosPage, ExecucionsPage, ResultatsPage } from '@internal/plugin-async-benchmark/src/plugin';
import { SettingsPage } from './components/settings/SettingsPage';

const lightPortalTheme = createUnifiedTheme({
  palette: palettes.light,
});

const darkPortalTheme = createUnifiedTheme({
  palette: {
    ...palettes.dark,
    background: {
      ...palettes.dark.background,
      default: '#09090b',
      paper: '#0f1117',
    },
    navigation: {
      ...palettes.dark.navigation,
      background: '#0d1117',
      indicator: '#5eead4',
      color: '#8b949e',
      selectedColor: '#e6edf3',
      navItem: {
        ...palettes.dark.navigation.navItem,
        hoverBackground: 'rgba(88, 166, 255, 0.10)',
      },
      submenu: {
        ...palettes.dark.navigation.submenu,
        background: '#111827',
      },
    },
    pinSidebarButton: {
      ...palettes.dark.pinSidebarButton,
      icon: '#e6edf3',
      background: '#1f2937',
    },
    tabbar: {
      ...palettes.dark.tabbar,
      indicator: '#58a6ff',
    },
  },
});

const appThemes = [
  {
    id: 'light',
    title: 'Light Theme',
    variant: 'light' as const,
    icon: <LightIcon />,
    Provider: ({ children }: PropsWithChildren<{}>) => (
      <UnifiedThemeProvider theme={lightPortalTheme}>{children}</UnifiedThemeProvider>
    ),
  },
  {
    id: 'dark',
    title: 'Dark Theme',
    variant: 'dark' as const,
    icon: <DarkIcon />,
    Provider: ({ children }: PropsWithChildren<{}>) => (
      <UnifiedThemeProvider theme={darkPortalTheme}>{children}</UnifiedThemeProvider>
    ),
  },
];

const app = createApp({
  apis,
  themes: appThemes,
  plugins: [catalogPlugin, scaffolderPlugin, orgPlugin],
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, { createComponent: scaffolderPlugin.routes.root, viewTechDoc: undefined as any });
    bind(orgPlugin.externalRoutes, { catalogIndex: catalogPlugin.routes.catalogIndex });
  },
  components: { SignInPage: props => <SignInPage {...props} auto providers={['guest']} /> },
});

const routes = (
  <FlatRoutes>
    <Route path="/"           element={<Navigate to="home" />} />
    <Route path="/home"       element={<HomePage />} />
    <Route path="/catalog"    element={<CatalogPage />} />
    <Route path="/catalog/:id" element={<CatalogPage />} />
    <Route path="/escenaris"  element={<ScenariosPage />} />
    <Route path="/execucions" element={<ExecucionsPage />} />
    <Route path="/resultats"  element={<ResultatsPage />} />
    <Route path="/bs-catalog" element={<CatalogIndexPage />} />
    <Route path="/bs-catalog/:namespace/:kind/:name" element={<CatalogEntityPage />}>{entityPage}</Route>
    <Route path="/search"        element={<SearchPage />}>{searchPage}</Route>
    <Route path="/settings"      element={<SettingsPage />} />
    <Route path="/notifications" element={<NotificationsPage />} />
  </FlatRoutes>
);

export default app.createRoot(<><AlertDisplay /><OAuthRequestDialog /><SignalsDisplay /><AppRouter><Root>{routes}</Root></AppRouter></>);
