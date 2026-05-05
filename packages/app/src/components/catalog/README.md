# Catalog Component

Pàgina de detall d'un component del catàleg. Mostra metadades (nom,
categoria, descripció, versió) i etiquetes.

## Arxius

- **EntityPage.tsx**: Renderitza el detall d'un component. Integra amb
  Backstage `CatalogEntityPage` per afegir tabs personalitzats si cal.

## Ús

Cridat des d'App.tsx quan l'usuari navega a `/catalog/:id`:

```tsx
<Route path="/catalog/:id" element={<CatalogPage />} />
```

## Dades

Obté component metadata del backend via API REST:

```ts
GET /api/proxy/catalog-service/components/:id
```

Resposta:
```json
{
  "shortName": "Kafka",
  "name": "Apache Kafka",
  "category": "architecture",
  "description": "Event-driven architecture...",
  "version": "3.7",
  "tags": ["distributed", "stream"],
  "predefined": true,
  "createdAt": "2025-01-01T10:00:00Z"
}
```
