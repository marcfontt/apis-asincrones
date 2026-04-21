import { createPlugin, createRoutableExtension, createRouteRef } from '@backstage/core-plugin-api';

export const homeRouteRef       = createRouteRef({ id: 'async-home' });
export const catalogRouteRef    = createRouteRef({ id: 'async-combinacions' });
export const scenariosRouteRef  = createRouteRef({ id: 'async-escenaris' });
export const execucionsRouteRef = createRouteRef({ id: 'async-execucions' });
export const resultatsRouteRef  = createRouteRef({ id: 'async-resultats' });
export const runsRouteRef       = createRouteRef({ id: 'async-runs' });

export const asyncApisPlugin = createPlugin({ id: 'async-apis', routes: { root: homeRouteRef } });

export const HomePage = asyncApisPlugin.provide(createRoutableExtension({ name: 'HomePage', component: () => import('./pages/HomePage').then(m => m.HomePage), mountPoint: homeRouteRef }));
export const CatalogPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'CatalogPage', component: () => import('./pages/CatalogPage').then(m => m.CatalogPage), mountPoint: catalogRouteRef }));
export const ScenariosPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'ScenariosPage', component: () => import('./pages/ScenariosPage').then(m => m.ScenariosPage), mountPoint: scenariosRouteRef }));
export const ExecucionsPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'ExecucionsPage', component: () => import('./pages/ExecucionsPage').then(m => m.ExecucionsPage), mountPoint: execucionsRouteRef }));
export const ResultatsPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'ResultatsPage', component: () => import('./pages/ResultatsPage').then(m => m.ResultatsPage), mountPoint: resultatsRouteRef }));
export const RunsPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'RunsPage', component: () => import('./pages/RunsPage').then(m => m.RunsPage), mountPoint: runsRouteRef }));
