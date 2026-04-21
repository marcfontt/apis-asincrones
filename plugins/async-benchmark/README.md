# `plugins/feina`

Plugin principal del portal de benchmark d'APIs asíncrones.

## Estructura

- `src/plugin.ts`: registre de rutes i extensions Backstage.
- `src/theme.ts`: tokens visuals compartits.
- `src/pages/`: pantalles principals del plugin (`Home`, `Catàleg`, `Escenaris`, `Execucions`, `Resultats`).
- `src/shared/`: helpers reutilitzables entre pàgines.

## Criteri d'organització

Les pantalles s'han separat de les utilitats compartides per evitar que `components/`
acabi sent una carpeta genèrica on hi cap tot. Això facilita trobar cada pàgina,
reduir imports creuats i preparar futures extraccions a subcomponents quan convingui.
