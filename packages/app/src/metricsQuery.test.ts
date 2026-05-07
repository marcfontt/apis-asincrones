import { buildExactMetricQuery } from 'metrics-api/src/elasticQueries';

describe('metrics Elasticsearch query helpers', () => {
  it('uses exact keyword filters for runId so live metrics do not mix repeated executions', () => {
    expect(buildExactMetricQuery({ runId: 'exemple-1-160284' })).toEqual({
      bool: {
        filter: [
          {
            term: {
              'runId.keyword': 'exemple-1-160284',
            },
          },
        ],
      },
    });
  });

  it('combines metadata filters as exact terms', () => {
    expect(buildExactMetricQuery({ scenarioId: 'scenario-1', platform: 'NATS Server', dataFormat: 'iot' })).toEqual({
      bool: {
        filter: [
          { term: { 'scenarioId.keyword': 'scenario-1' } },
          { term: { 'platform.keyword': 'NATS Server' } },
          { term: { 'dataFormat.keyword': 'iot' } },
        ],
      },
    });
  });
});
