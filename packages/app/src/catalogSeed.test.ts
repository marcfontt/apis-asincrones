import { CATALOG_SEED, syncCatalogSeed } from 'catalog-service/src/seed';

describe('catalog seed sync', () => {
  it('keeps SEA in the predefined catalog', () => {
    expect(CATALOG_SEED.some(component => component.shortName === 'SEA')).toBe(true);
  });

  it('adds missing predefined components without replacing existing Elasticsearch rows', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const oldCatalogWithoutSea = CATALOG_SEED
      .filter(component => component.shortName !== 'SEA')
      .map(component => ({ _source: component }));

    const elasticsearchMock = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: oldCatalogWithoutSea },
      }),
      bulk: jest.fn().mockResolvedValue({
        errors: false,
        items: [],
      }),
    };

    try {
      const result = await syncCatalogSeed(elasticsearchMock as any, 'async-catalog');
      const bulkBody = elasticsearchMock.bulk.mock.calls[0][0].body;

      expect(result.insertedSeedComponents).toBe(1);
      expect(JSON.stringify(bulkBody)).toContain('Serverless Event Architecture');
    } finally {
      consoleLogSpy.mockRestore();
    }
  });
});
