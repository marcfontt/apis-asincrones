import { createPlugin, createRoutableExtension, createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({ id: 'feina' });
export const catalogRouteRef = createRouteRef({ id: 'feina-catalog' });
export const scenariosRouteRef = createRouteRef({ id: 'feina-scenarios' });

export const feinaPlugin = createPlugin({
  id: 'feina',
  routes: {
    root: rootRouteRef,
  },
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
