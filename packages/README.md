# `packages/` — Microserveis i app Backstage

Aquest directori conté tot el codi del **monorepo** del portal i els
microserveis que componen el benchmark.

## Mapa ràpid

| Carpeta                   | Que fa                                       | Port |
|---------------------------|----------------------------------------------|------|
| `app/`                    | Frontend Backstage (React) + tema custom     | 3000 |
| `backend/`                | Backend Backstage (proxy + plugins core)     | 7007 |
| `catalog-service/`        | CRUD de components del catàleg               | 3001 |
| `scenario-service/`       | CRUD d'escenaris                             | 3002 |
| `benchmark-orchestrator/` | Crea Jobs de K8s amb el load-generator       | 3003 |
| `metrics-api/`            | Ingesta + WebSocket sobre Elasticsearch      | 3004 |
| `load-generator/`         | Container que envia càrrega al broker        | (Job)|

## Com es connecten

```
                +----------------------+
   Browser ---> | app (Backstage)     |
                +----------+----------+
                           | proxy
            +--------------+----------------+
            v              v                v
  catalog-service   scenario-service   benchmark-orchestrator
            |              |                |
            +------+-------+                | crea Job
                   v                        v
              Elasticsearch          load-generator (Pod)
                   ^                        |
                   |                        v
                   +------ metrics-api <----+ (POST /metrics)
                                        WebSocket  ^
                                                   |
                                            Browser (live)
```

## Build i execució

Cada paquet té el seu propi `package.json`. Per arrencar tots els
serveis en local:

```bash
yarn install        # només el primer cop
yarn start          # frontend + backend Backstage
```

Els microserveis es despleguen al cluster AKS via Docker. Vegeu
[`../deploy-all.sh`](../deploy-all.sh) i [`../k8s/README.md`](../k8s/README.md).

## Convencions

- **Llenguatge**: TypeScript a tot arreu.
- **Estil**: Prettier (`yarn prettier:check`).
- **Comentaris**: si apliques una decisió no òbvia, deixa-la documentada
  amb un comentari curt explicant el "perquè", no el "què".
- **Variables**: noms en català o castellà són benvinguts; els noms
  d'API públiques i camps d'Elasticsearch es mantenen en anglès per
  compatibilitat.
