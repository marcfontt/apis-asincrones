# benchmark-orchestrator

Microservei que **orquestra els benchmarks reals** sobre Kubernetes.
Quan l'usuari clica "Executar" al portal, aquest servei rep la petició
i crea un Job de K8s amb el container `load-generator` configurat per
l'escenari triat.

## Què fa

- Rep `POST /runs` amb un `scenarioId` i opcionalment overrides de
  durada/ratio/payload.
- Llegeix la definició de l'escenari del `scenario-service`.
- Decideix el `brokerType` correcte (kafka, confluent, nats, rabbitmq)
  segons la combinació protocol+plataforma.
- Crea un namespace efímer (`sc-<slug>-<shortId>`).
- Còpia el Secret de l'ACR al namespace nou per poder fer pull de la
  imatge del load-generator.
- Crea el Job amb totes les variables d'entorn: brokers URLs, durada,
  ratio, payload size, etc.
- Monitoritza el Job (cada 10s) i actualitza l'estat del run.
- Quan l'usuari atura, esborra el namespace després d'un *flush window*
  de 6 segons perquè el load-generator pugui pujar el seu snapshot final.

## API

| Mètode | Ruta                          | Descripció                            |
|--------|-------------------------------|---------------------------------------|
| GET    | `/health`                     | Healthcheck + estat de K8s            |
| GET    | `/runs`                       | Llista runs (in-memory, ordenat desc) |
| GET    | `/runs/active`                | Només runs en curs/pendent            |
| GET    | `/runs/:id`                   | Detall                                |
| POST   | `/runs`                       | Llança un nou run                     |
| POST   | `/runs/:id/cancel`            | Atura un run en curs                  |
| POST   | `/runs/reset`                 | Esborra TOTS els runs + mètriques     |
| DELETE | `/runs/:id`                   | Elimina un run i les seves mètriques  |

## Mode indefinit

Si l'escenari té `duration = 0` o `null`, el run s'executa **fins que
l'usuari l'atura manualment**. Al codi això es decideix a `runTiming.ts`,
funció `isIndefiniteDuration`. Antigament `>= 3600` també es considerava
indefinit; ara s'ha canviat per evitar confusions amb la durada legítima
d'una hora.

## Entorn

| Variable                  | Defecte                                |
|---------------------------|----------------------------------------|
| `PORT`                    | `3002` (sí, comparteix port amb scenario-service en K8s; cada un té el seu Service) |
| `SCENARIO_SERVICE_URL`    | `http://scenario-service:3002`         |
| `METRICS_API_URL`         | `http://metrics-api:3004`              |
| `ACR_SERVER`              | `asyncbenchmarkregistry.azurecr.io`    |
| `NAMESPACE`               | `apis-asincronas`                      |

## Permisos

El servei necessita poder crear namespaces, jobs i secrets. Vegeu
[`k8s/rbac/benchmark-orchestrator-rbac.yaml`](../../k8s/rbac/benchmark-orchestrator-rbac.yaml).
