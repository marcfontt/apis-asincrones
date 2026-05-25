# `docs/` - Documentació tècnica

Aquesta carpeta recull la documentació operativa i arquitectònica del projecte. El README principal dona la visió global; aquesta carpeta conserva els documents que expliquen decisions, desplegament, migració i passos de reproducció.

## Documents disponibles

| Document | Contingut |
|---|---|
| [architecture.md](architecture.md) | Serveis, ports, flux d'una execució i relació entre portal, brokers i mètriques. |
| [aplicar-canvis-finals.md](aplicar-canvis-finals.md) | Comandes curtes per construir imatges, aplicar manifests i validar el clúster final. |
| [migracio-aks-azure-students.md](migracio-aks-azure-students.md) | Explicació de la migració a Azure for Students, motius, costos i conseqüències tècniques. |
| [guia-operativa-aks-students.md](guia-operativa-aks-students.md) | Guia pas a pas per arrencar, apagar, validar, executar proves i consultar Grafana. |
| [memoria-actualitzacio-aks.tex](memoria-actualitzacio-aks.tex) | Fragment LaTeX per incorporar a la memòria la migració, els nodes i l'estat final. |
| [registre-canvis-dia-i-mig.md](registre-canvis-dia-i-mig.md) | Registre de canvis finals del projecte per mantenir el relat de la memòria alineat. |

## Criteri

- La documentació d'ús general va en aquesta carpeta.
- La documentació específica d'un servei es queda al README del paquet corresponent.
- Els README interns de components petits s'han eliminat per evitar informació duplicada o antiga.
- Quan es canviï un manifest, endpoint o variable d'entorn, s'ha d'actualitzar també el README afectat.

## Rutes relacionades

| Ruta | Contingut |
|---|---|
| [../README.md](../README.md) | Resum del projecte i estat actual. |
| [../packages/](../packages/) | App Backstage i microserveis. |
| [../plugins/](../plugins/) | Plugin visible del portal. |
| [../k8s/](../k8s/) | Manifests Kubernetes. |
