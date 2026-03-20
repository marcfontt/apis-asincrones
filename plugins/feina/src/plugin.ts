import { createPlugin, createRoutableExtension, createRouteRef } from '@backstage/core-plugin-api';

export const homeRouteRef       = createRouteRef({ id: 'async-home' });
export const catalogRouteRef    = createRouteRef({ id: 'async-combinacions' });
export const scenariosRouteRef  = createRouteRef({ id: 'async-escenaris' });
export const execucionsRouteRef = createRouteRef({ id: 'async-execucions' });
export const resultatsRouteRef  = createRouteRef({ id: 'async-resultats' });

export const asyncApisPlugin = createPlugin({ id: 'async-apis', routes: { root: homeRouteRef } });

export const HomePage = asyncApisPlugin.provide(createRoutableExtension({ name: 'HomePage', component: () => import('./components/HomePage/HomePage').then(m => m.HomePage), mountPoint: homeRouteRef }));
export const CatalogPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'CatalogPage', component: () => import('./components/CatalogPage/CatalogPage').then(m => m.CatalogPage), mountPoint: catalogRouteRef }));
export const ScenariosPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'ScenariosPage', component: () => import('./components/ScenariosPage/ScenariosPage').then(m => m.ScenariosPage), mountPoint: scenariosRouteRef }));
export const ExecucionsPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'ExecucionsPage', component: () => import('./components/ExecucionsPage/ExecucionsPage').then(m => m.ExecucionsPage), mountPoint: execucionsRouteRef }));
export const ResultatsPage = asyncApisPlugin.provide(createRoutableExtension({ name: 'ResultatsPage', component: () => import('./components/ResultatsPage/ResultatsPage').then(m => m.ResultatsPage), mountPoint: resultatsRouteRef }));
