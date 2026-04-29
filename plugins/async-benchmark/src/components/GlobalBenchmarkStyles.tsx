import { useEffect } from 'react';
import { GLOBAL_CSS } from '../theme';

/**
 * Injecta els estils globals del plugin al <head>.
 *
 * Abans aquests estils es renderitzaven com un <style> dins de cada pàgina.
 * Això funcionava visualment, però embrutava el contingut del <main> i feia
 * més difícil validar el text real de la interfície. Amb aquest component,
 * les pàgines continuen sent simples i el CSS global queda en un únic lloc.
 */
export const GlobalBenchmarkStyles = () => {
  useEffect(() => {
    const styleElementId = 'apis-asincrones-plugin-global-css';
    let styleElement = document.getElementById(styleElementId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleElementId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = GLOBAL_CSS;

    return () => {
      styleElement?.remove();
    };
  }, []);

  return null;
};
