import { PropsWithChildren, useEffect, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import HomeIcon from '@material-ui/icons/Home';
import StorageIcon from '@material-ui/icons/Storage';
import ListAltIcon from '@material-ui/icons/ListAlt';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import BarChartIcon from '@material-ui/icons/BarChart';
import SettingsIcon from '@material-ui/icons/Settings';
import MenuIcon from '@material-ui/icons/Menu';
import CloseIcon from '@material-ui/icons/Close';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';

type ElementNavegacio = {
  etiqueta: string;
  ruta: string;
  Icona: typeof HomeIcon;
  descripcio: string;
};

const elementsNavegacioPrincipal: ElementNavegacio[] = [
  { etiqueta: 'Home', ruta: '/home', Icona: HomeIcon, descripcio: 'Visió general del portal' },
  { etiqueta: 'Catàleg', ruta: '/catalog', Icona: StorageIcon, descripcio: 'Components i versions' },
  { etiqueta: 'Escenaris', ruta: '/escenaris', Icona: ListAltIcon, descripcio: 'Configuració de proves' },
  { etiqueta: 'Execucions', ruta: '/execucions', Icona: PlayArrowIcon, descripcio: 'Runs actius i historial' },
  { etiqueta: 'Resultats', ruta: '/resultats', Icona: BarChartIcon, descripcio: 'Comparatives i mètriques' },
];

const elementConfiguracio: ElementNavegacio = {
  etiqueta: 'Configuració',
  ruta: '/settings',
  Icona: SettingsIcon,
  descripcio: 'Preferències Backstage',
};

const TOP_NAVIGATION_CSS = `
  .portal-shell {
    min-height: 100vh;
    background: var(--bg-page, #f5f7fb);
  }

  [data-theme="dark"] .portal-shell {
    background: #09090b;
  }

  .portal-topbar {
    position: sticky;
    top: 0;
    z-index: 1200;
    height: 64px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border, #dfe5ef);
    background: color-mix(in srgb, var(--bg-card, #fff) 92%, transparent);
    backdrop-filter: blur(14px);
  }

  [data-theme="dark"] .portal-topbar {
    background: rgba(13, 17, 23, 0.92);
    border-bottom-color: #21262d;
  }

  .portal-topbar-inner {
    width: 100%;
    max-width: 1480px;
    margin: 0 auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 24px;
  }

  .portal-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: var(--text-primary, #111827);
    text-decoration: none;
  }

  .portal-brand-full {
    display: block;
    width: 168px;
    height: auto;
  }

  .portal-brand-icon {
    display: none;
    width: 34px;
    height: 34px;
  }

  .portal-desktop-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
  }

  .portal-nav-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 38px;
    padding: 0 12px;
    border-radius: 9px;
    color: var(--text-secondary, #526173);
    text-decoration: none;
    font-family: var(--font, "IBM Plex Sans", system-ui, sans-serif);
    font-size: 13px;
    font-weight: 750;
    transition:
      color var(--motion-fast, 120ms) var(--motion-ease-standard, ease),
      background var(--motion-fast, 120ms) var(--motion-ease-standard, ease),
      transform var(--motion-fast, 120ms) var(--motion-ease-standard, ease);
  }

  .portal-nav-link:hover {
    color: var(--text-primary, #111827);
    background: var(--bg-hover, rgba(45, 107, 228, 0.08));
    transform: translateY(-1px);
  }

  .portal-nav-link:focus-visible,
  .portal-mobile-button:focus-visible,
  .portal-mobile-link:focus-visible {
    outline: 2px solid var(--accent, #58a6ff);
    outline-offset: 2px;
  }

  .portal-nav-link-active {
    color: var(--accent, #2d6be4);
    background: var(--accent-soft, rgba(45, 107, 228, 0.10));
  }

  .portal-nav-link-active::after {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: -14px;
    height: 3px;
    border-radius: 999px 999px 0 0;
    background: var(--accent, #2d6be4);
    animation: portalActiveIndicator var(--motion-normal, 180ms) var(--motion-ease-standard, ease);
  }

  .portal-topbar-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .portal-mobile-button {
    display: none;
    width: 40px;
    height: 40px;
    border: 1px solid var(--border, #dfe5ef);
    border-radius: 9px;
    background: var(--bg-card, #fff);
    color: var(--text-primary, #111827);
    cursor: pointer;
    align-items: center;
    justify-content: center;
  }

  .portal-mobile-panel {
    display: none;
  }

  .portal-page-main {
    min-height: calc(100vh - 64px);
  }

  @keyframes portalActiveIndicator {
    from { opacity: 0; transform: translateY(4px) scaleX(0.75); }
    to { opacity: 1; transform: translateY(0) scaleX(1); }
  }

  @media (max-width: 980px) {
    .portal-topbar-inner {
      gap: 14px;
      padding: 0 16px;
    }

    .portal-brand-full {
      display: none;
    }

    .portal-brand-icon {
      display: block;
    }

    .portal-desktop-nav,
    .portal-topbar-actions .portal-nav-link {
      display: none;
    }

    .portal-mobile-button {
      display: inline-flex;
    }

    .portal-mobile-panel {
      display: block;
      position: fixed;
      top: 64px;
      left: 0;
      right: 0;
      z-index: 1190;
      padding: 10px 16px 16px;
      border-bottom: 1px solid var(--border, #dfe5ef);
      background: var(--bg-card, #fff);
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
      animation: portalMobilePanelIn var(--motion-normal, 180ms) var(--motion-ease-standard, ease);
    }

    [data-theme="dark"] .portal-mobile-panel {
      background: #0d1117;
      border-bottom-color: #21262d;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.36);
    }

    .portal-mobile-link {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 48px;
      padding: 0 12px;
      border-radius: 10px;
      color: var(--text-primary, #111827);
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
    }

    .portal-mobile-link span:last-child {
      display: block;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary, #526173);
      margin-top: 1px;
    }

    .portal-mobile-link-active {
      color: var(--accent, #2d6be4);
      background: var(--accent-soft, rgba(45, 107, 228, 0.10));
    }
  }

  @keyframes portalMobilePanelIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .portal-nav-link,
    .portal-mobile-panel,
    .portal-nav-link-active::after {
      animation: none !important;
      transition-duration: 1ms !important;
      transform: none !important;
    }
  }
`;

const rutaEstaActiva = (rutaActual: string, rutaElement: string) => {
  if (rutaElement === '/home') {
    return rutaActual === '/' || rutaActual.startsWith('/home');
  }
  return rutaActual.startsWith(rutaElement);
};

const useTopNavigationCssInHead = () => {
  useEffect(() => {
    const styleElementId = 'apis-asincrones-top-navigation-css';
    let styleElement = document.getElementById(styleElementId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleElementId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = TOP_NAVIGATION_CSS;

    return () => {
      styleElement?.remove();
    };
  }, []);
};

const NavigationLink = ({
  element,
  rutaActual,
  onNavigate,
  mobile = false,
}: {
  element: ElementNavegacio;
  rutaActual: string;
  onNavigate?: () => void;
  mobile?: boolean;
}) => {
  const actiu = rutaEstaActiva(rutaActual, element.ruta);
  const Icona = element.Icona;

  if (mobile) {
    return (
      <RouterLink
        to={element.ruta}
        onClick={onNavigate}
        className={`portal-mobile-link${actiu ? ' portal-mobile-link-active' : ''}`}
        aria-current={actiu ? 'page' : undefined}
      >
        <Icona fontSize="small" />
        <span>
          {element.etiqueta}
          <span>{element.descripcio}</span>
        </span>
      </RouterLink>
    );
  }

  return (
    <RouterLink
      to={element.ruta}
      className={`portal-nav-link${actiu ? ' portal-nav-link-active' : ''}`}
      aria-current={actiu ? 'page' : undefined}
      title={element.descripcio}
    >
      <Icona fontSize="small" />
      {element.etiqueta}
    </RouterLink>
  );
};

export const TopNavigationShell = ({ children }: PropsWithChildren<{}>) => {
  const location = useLocation();
  const [menuMobilObert, setMenuMobilObert] = useState(false);
  const totsElsElements = [...elementsNavegacioPrincipal, elementConfiguracio];
  useTopNavigationCssInHead();

  useEffect(() => {
    setMenuMobilObert(false);
  }, [location.pathname]);

  useEffect(() => {
    const tancarAmbEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuMobilObert(false);
      }
    };
    window.addEventListener('keydown', tancarAmbEscape);
    return () => window.removeEventListener('keydown', tancarAmbEscape);
  }, []);

  return (
    <div className="portal-shell">
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <RouterLink to="/home" className="portal-brand" aria-label="APIs Asíncrones - Home">
            <span className="portal-brand-full"><LogoFull /></span>
            <span className="portal-brand-icon"><LogoIcon /></span>
          </RouterLink>

          <nav className="portal-desktop-nav" aria-label="Navegació principal">
            {elementsNavegacioPrincipal.map(element => (
              <NavigationLink key={element.ruta} element={element} rutaActual={location.pathname} />
            ))}
          </nav>

          <div className="portal-topbar-actions">
            <NavigationLink element={elementConfiguracio} rutaActual={location.pathname} />
            <button
              type="button"
              className="portal-mobile-button"
              aria-label={menuMobilObert ? 'Tancar menú de navegació' : 'Obrir menú de navegació'}
              aria-expanded={menuMobilObert}
              onClick={() => setMenuMobilObert(obert => !obert)}
            >
              {menuMobilObert ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
            </button>
          </div>
        </div>
      </header>

      {menuMobilObert && (
        <nav className="portal-mobile-panel" aria-label="Navegació principal mòbil">
          {totsElsElements.map(element => (
            <NavigationLink
              key={element.ruta}
              element={element}
              rutaActual={location.pathname}
              mobile
              onNavigate={() => setMenuMobilObert(false)}
            />
          ))}
        </nav>
      )}

      <main className="portal-page-main" id="main-content">
        {children}
      </main>
    </div>
  );
};
