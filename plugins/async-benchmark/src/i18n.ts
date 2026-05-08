/**
 * i18n.ts - thin re-export of the app-level i18n module.
 *
 * Keeps cross-package imports in one place. All plugin components should
 * import from here instead of reaching directly into packages/app.
 */
export { useTranslation } from '../../../packages/app/src/i18n/useTranslation';
export { t, tRaw } from '../../../packages/app/src/i18n/index';
