# apis-asincrones

Aplicació Backstage per a la gestió d'APIs asíncrones.

## Requisits previs

- **Node.js** 22 o 24
- **Yarn** 4.4.1 (inclòs com a `packageManager` al projecte)
- **Git**

## Instal·lació

1. Clona el repositori:

   ```bash
   git clone https://github.com/marcfontt/apis-asincrones.git
   cd apis-asincrones
   ```

2. Instal·la les dependències:

   ```bash
   yarn install
   ```

## Iniciar l'aplicació (desenvolupament)

Executa la següent comanda des de l'arrel del projecte:

```bash
yarn start
```

Això iniciarà tant el **frontend** com el **backend** simultàniament:

| Servei   | URL                        |
| -------- | -------------------------- |
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:7007      |

Un cop iniciada, obre el navegador a **http://localhost:3000** per accedir a l'aplicació.

## Altres comandes útils

| Comanda               | Descripció                                    |
| --------------------- | --------------------------------------------- |
| `yarn build:all`      | Compila tots els paquets                      |
| `yarn build:backend`  | Compila només el backend                      |
| `yarn test`           | Executa els tests                             |
| `yarn lint:all`       | Executa el linter a tot el projecte           |
| `yarn prettier:check` | Comprova el format del codi                   |
| `yarn tsc`            | Comprova els tipus TypeScript                 |

## Configuració

La configuració principal es troba a `app-config.yaml`. Per a producció, utilitza `app-config.production.yaml`.
