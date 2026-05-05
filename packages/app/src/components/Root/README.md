# Root Component

Layout principal del portal. Engloba toda la aplicació amb context providers,
tema i navegació superior.

## Arxius

- **Root.tsx**: App wrapper. Configura providers de context, Backstage App,
  i detecta si l'usuari ve d'una sessió prèvia.
- **TopNavigationShell.tsx**: Navbar superior amb logo, menús, busca i
  selector de tema (clar/fosc).
- **LogoIcon.tsx**: Logo compacte (icona).
- **LogoFull.tsx**: Logo complet (icona + text).
- **index.ts**: Exporta Root.

## Ús

```tsx
import { Root } from './components/Root';

// A App.tsx
const routes = (
  <FlatRoutes>
    <Root>...</Root>
  </FlatRoutes>
);
```

## Contextus i providers

Root configura:
- Tema (clar/fosc)
- API clients (via `apis.ts`)
- Navegació amb React Router
- Backstage App defaults (auth, plugins)
