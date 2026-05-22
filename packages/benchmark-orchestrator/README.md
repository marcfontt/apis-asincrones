# `benchmark-orchestrator`

Microservei que llança proves reals sobre Kubernetes. Quan l'usuari clica
`Executar`, el portal envia una petició a aquest servei i el servei crea
un Job amb el container `load-generator`.

## Què fa

- Rep `POST /runs` amb l'escenari i possibles canvis de durada, ràtio o payload.
- Llegeix l'escenari des de `scenario-service`.
- Decideix quin broker tècnic s'ha d'usar: `kafka`, `confluent`, `nats` o `rabbitmq`.
- Crea un namespace efímer per a la prova.
- Copia el Secret d'ACR al namespace nou.
- Crea el Job de Kubernetes amb les variables d'entorn necessaries.
- Revisa l'estat del Job cada pocs segons.
- Si l'usuari atura el run, deixa una finestra curta perquè el generador enviï l'última mostra.

## API

| Mètode | Ruta | Descripció |
|--------|------|------------|
| GET | `/health` | Healthcheck i estat de Kubernetes. |
| GET | `/runs` | Llista runs en memòria, ordenats de més nou a més antic. |
| GET | `/runs/active` | Llista runs pendents o en curs. |
| GET | `/runs/:id` | Detall d'un run. |
| POST | `/runs` | Llança un run nou. |
| POST | `/runs/:id/cancel` | Atura un run en curs. |
| POST | `/runs/reset` | Esborra tots els runs i les mètriques. |
| DELETE | `/runs/:id` | Elimina un run i les seves mètriques. |

## Mode indefinit

Un escenari amb `duration = 0` o `duration = null` s'executa fins que
l'usuari l'atura. Una execució aturada no es reprèn automàticament en
aquesta fase. Si ja havia enviat mostres, aquestes queden com a dades
parcials.

## Entorn

| Variable | Valor habitual |
|----------|----------------|
| `PORT` | `3003` en Kubernetes. Si no es defineix, el codi local pot usar `3002`. |
| `SCENARIO_SERVICE_URL` | `http://scenario-service:3002` |
| `METRICS_API_URL` | `http://metrics-api:3004` |
| `ACR_SERVER` | `asyncpfg65454.azurecr.io` |
| `NAMESPACE` | `apis-asincrones` |

En local, defineix `PORT=3003` si vols provar-lo darrere del mateix proxy
que usa Backstage.

## Permisos

Necessita permisos per crear namespaces, Jobs i Secrets. La configuració
està a `k8s/rbac/benchmark-orchestrator-rbac.yaml`.
