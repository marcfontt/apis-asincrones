import { createPlugin, createRoutableExtension, createRouteRef } from '@backstage/core-plugin-api';

export const catalogRouteRef   = createRouteRef({ id: 'async-combinacions' });
export const scenariosRouteRef = createRouteRef({ id: 'async-escenaris' });
export const runsRouteRef      = createRouteRef({ id: 'async-execucions' });
export const metricsRouteRef   = createRouteRef({ id: 'async-metriques' });

export const feinaPlugin = createPlugin({
  id: 'async-apis',
  routes: { root: catalogRouteRef },
});

export const CatalogPage = feinaPlugin.provide(
  createRoutableExtension({
    name: 'CatalogPage',
    component: () => import('./components/CatalogPage/CatalogPage').then(m => m.CatalogPage),
    mountPoint: catalogRouteRef,
  }),
);

export const ScenariosPage = feinaPlugin.provide(
  createRoutableExtension({
    name: 'ScenariosPage',
    component: () => import('./components/ScenariosPage/ScenariosPage').then(m => m.ScenariosPage),
    mountPoint: scenariosRouteRef,
  }),
);

export const RunsPage = feinaPlugin.provide(
  createRoutableExtension({
    name: 'RunsPage',
    component: () => import('./components/RunsPage/RunsPage').then(m => m.RunsPage),
    mountPoint: runsRouteRef,
  }),
);

export const MetricsPage = feinaPlugin.provide(
  createRoutableExtension({
    name: 'MetricsPage',
    component: () => import('./components/MetricsPage/MetricsPage').then(m => m.MetricsPage),
    mountPoint: metricsRouteRef,
  }),
);
