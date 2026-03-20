import { Navigate, Route } from 'react-router-dom';
import { UserSettingsPage } from '@backstage/plugin-user-settings';
import { SearchPage } from '@backstage/plugin-search';
import { AlertDisplay, OAuthRequestDialog, SignInPage } from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { NotificationsPage } from '@backstage/plugin-notifications';
import { SignalsDisplay } from '@backstage/plugin-signals';
import { catalogPlugin, CatalogIndexPage, CatalogEntityPage } from '@backstage/plugin-catalog';
import { entityPage } from './components/catalog/EntityPage';
import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { orgPlugin } from '@backstage/plugin-org';
import { apis } from './apis';
import { searchPage } from './components/search/SearchPage';
import { Root } from './components/Root';
import { HomePage, CatalogPage, ScenariosPage, ExecucionsPage, ResultatsPage } from '../../../plugins/feina/src/plugin';

const app = createApp({
  apis,
  plugins: [catalogPlugin, scaffolderPlugin, orgPlugin],
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, { createComponent: scaffolderPlugin.routes.root, viewTechDoc: undefined as any, createFromTemplate: scaffolderPlugin.routes.root });
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
    <Route path="/settings"      element={<UserSettingsPage />} />
    <Route path="/notifications" element={<NotificationsPage />} />
  </FlatRoutes>
);

export default app.createRoot(<><AlertDisplay /><OAuthRequestDialog /><SignalsDisplay /><AppRouter><Root>{routes}</Root></AppRouter></>);
