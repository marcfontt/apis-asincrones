# `packages/backend`

Backend Backstage de la plataforma. En aquest projecte té una funció principal: servir l'app i centralitzar el proxy cap als microserveis del benchmark.

## Què fa

- Serveix el frontend Backstage.
- Exposa `/api/proxy/*` perquè el plugin React pugui parlar amb els serveis interns.
- Manté el provider d'autenticació de desenvolupament.
- Carrega els plugins base de Backstage necessaris perquè l'app arrenqui.

La lògica de negoci del benchmark no viu aquí. Les responsabilitats específiques estan separades en `catalog-service`, `scenario-service`, `benchmark-orchestrator` i `metrics-api`.

## Proxy

Les rutes principals es configuren a `app-config.yaml`:

```yaml
proxy:
  '/catalog-service':
    target: 'http://localhost:3001'
  '/scenario-service':
    target: 'http://localhost:3002'
  '/benchmark-orchestrator':
    target: 'http://localhost:3003'
  '/metrics-api':
    target: 'http://localhost:3004'
```

En Kubernetes, aquestes URLs apunten als Services interns del namespace `apis-asincrones`.

## Engegada local

```bash
corepack yarn install --immutable
corepack yarn workspace backend start
```

El backend arrenca a `http://localhost:7007`.

## Validació

```bash
corepack yarn workspace backend test
corepack yarn workspace backend build
```

## Notes

- El backend de Backstage no ha de crear Jobs de Kubernetes directament.
- No s'hi ha d'afegir lògica de càlcul de resultats.
- Si cal afegir una ruta nova per al portal, primer comprova si pertany a un microservei existent.
