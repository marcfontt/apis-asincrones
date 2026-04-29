export type MetricFilterInput = {
  runId?: unknown;
  scenarioId?: unknown;
  architecture?: unknown;
  protocol?: unknown;
  broker?: unknown;
  platform?: unknown;
  gateway?: unknown;
  dataFormat?: unknown;
  status?: unknown;
};

const EXACT_FILTER_FIELDS: Array<keyof MetricFilterInput> = [
  'runId',
  'scenarioId',
  'architecture',
  'protocol',
  'broker',
  'platform',
  'gateway',
  'dataFormat',
  'status',
];

function getFirstQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return getFirstQueryValue(value[0]);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

export function exactKeywordTerm(field: keyof MetricFilterInput, value: unknown): object | null {
  const normalizedValue = getFirstQueryValue(value);
  if (!normalizedValue) {
    return null;
  }

  return {
    term: {
      [`${field}.keyword`]: normalizedValue,
    },
  };
}

export function buildExactMetricQuery(filters: MetricFilterInput): object {
  const exactFilters = EXACT_FILTER_FIELDS
    .map(field => exactKeywordTerm(field, filters[field]))
    .filter((filter): filter is object => filter !== null);

  if (exactFilters.length === 0) {
    return { match_all: {} };
  }

  return {
    bool: {
      filter: exactFilters,
    },
  };
}
