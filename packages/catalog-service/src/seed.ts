/*
 * seed.ts — Catalog bootstrap data
 *
 * The catalog-service stores component definitions in Elasticsearch
 * (index: `async-catalog`). This module defines the canonical list of
 * predefined components (architectures, protocols, platforms) used by the
 * UI and scenario builder, and exposes `syncCatalogSeed()` to keep the
 * Elasticsearch index aligned without deleting existing rows.
 *
 * These are the SAME values the UI's scenario builder expects
 * (see plugins/async-benchmark/src/pages/ScenariosPage.tsx and
 *  CatalogPage.tsx). If you add a new architecture/protocol/platform,
 * add it here so the catalog reflects reality.
 *
 * Fields:
 *   shortName:   short identifier used in filters and the scenario builder
 *   name:        display name
 *   category:    'architecture' | 'protocol' | 'platform'
 *   description: short Catalan description shown in the detail modal
 *   version:     known version used in the cluster (falls back to KNOWN_VERSIONS in UI)
 *   tags:        free-form tags shown as badges
 *   predefined:  true = seed row, not deletable from the UI (category-filtered)
 */

import { Client } from '@elastic/elasticsearch';

type CatalogComponent = {
  shortName: string;
  name: string;
  category: 'architecture' | 'protocol' | 'platform';
  description: string;
  version?: string;
  tags?: string[];
};

export const CATALOG_SEED: CatalogComponent[] = [
  // ── Architectures ──────────────────────────────────────────────────────────
  // The five patterns the benchmark knows how to wire up. Each one biases the
  // scenario builder toward a different messaging shape.
  {
    shortName: 'EDA',
    name: 'Event-Driven Architecture',
    category: 'architecture',
    description: 'Components reaccionen a esdeveniments asíncrons publicats per altres productors. Ideal per a desacoblament temporal i reactivitat.',
    tags: ['esdeveniments', 'asíncron', 'desacoblat'],
  },
  {
    shortName: 'QBA',
    name: 'Queue-Based Architecture',
    category: 'architecture',
    description: 'Els missatges es col·loquen en cues amb lliurament garantit i consumidors competidors. Bé per a distribució de càrrega i resiliència.',
    tags: ['cua', 'treball', 'fiabilitat'],
  },
  {
    shortName: 'LCA',
    name: 'Log-Centric Architecture',
    category: 'architecture',
    description: 'Els missatges queden escrits en un log ordenat. Els consumidors llegeixen per offset i poden recuperar el ritme si van tard.',
    tags: ['log', 'streaming', 'offset'],
  },
  {
    shortName: 'EMA',
    name: 'Event-Mesh Architecture',
    category: 'architecture',
    description: 'Diverses plataformes de missatgeria federades en una malla que enruta events entre regions o clouds.',
    tags: ['mesh', 'federació', 'multi-broker'],
  },
  {
    shortName: 'SEA',
    name: 'Streaming Events Architecture',
    category: 'architecture',
    description: 'Pipelines de streaming d\'alt volum on events es processen en finestres contínues (p. ex. Kafka Streams).',
    tags: ['streaming', 'finestres', 'alt-volum'],
  },

  // ── Protocols ──────────────────────────────────────────────────────────────
  // Wire protocols the benchmark can exercise. Note that some (Kafka, NATS)
  // are also their own platform; the UI treats "Kafka protocol" as distinct
  // from the "Kafka" platform to allow cross-broker experiments.
  {
    shortName: 'Kafka',
    name: 'Kafka Protocol',
    category: 'protocol',
    version: '4.1.1',
    description: 'Protocol binari de Kafka i plataformes compatibles. Treballa amb topics, particions, group-id i ACKs configurables.',
    tags: ['binary', 'partitioned', 'pull'],
  },
  {
    shortName: 'AMQP',
    name: 'AMQP 0-9-1',
    category: 'protocol',
    version: '0.9.1',
    description: 'Advanced Message Queuing Protocol. Exchange/queue/binding model, confirmacions del producent, DLX. Usat per RabbitMQ i ActiveMQ.',
    tags: ['queue', 'exchange', 'push'],
  },
  {
    shortName: 'MQTT',
    name: 'MQTT 5.0',
    category: 'protocol',
    version: '5.0',
    description: 'Protocol lleuger pub/sub per IoT. QoS 0/1/2, retain, last-will. Suportat per RabbitMQ, EMQX, HiveMQ.',
    tags: ['iot', 'pub-sub', 'push'],
  },
  {
    shortName: 'NATS',
    name: 'NATS Protocol',
    category: 'protocol',
    version: '2.12.5',
    description: 'Protocol NATS per publish/subscribe lleuger. Usa subjects i pot afegir persistència amb JetStream quan està activat.',
    tags: ['fire-and-forget', 'subjects', 'push'],
  },
  {
    shortName: 'gRPC',
    name: 'gRPC',
    category: 'protocol',
    version: '1.64',
    description: 'RPC binari sobre HTTP/2 amb Protocol Buffers. Streaming bidireccional, deadlines, interceptors.',
    tags: ['rpc', 'http2', 'binary'],
  },
  {
    shortName: 'WS',
    name: 'WebSocket',
    category: 'protocol',
    version: '13',
    description: 'Canal full-duplex sobre una connexió TCP persistent. Ús comú per a actualitzacions en temps real cap al navegador.',
    tags: ['full-duplex', 'browser', 'push'],
  },

  // ── Platforms ──────────────────────────────────────────────────────────────
  // Message brokers the benchmark deploys or connects to inside the AKS cluster.
  {
    shortName: 'Kafka',
    name: 'Apache Kafka',
    category: 'platform',
    version: '4.1.1',
    description: 'Broker orientat a logs ordenats. Serveix per provar streaming, topics particionats i consum per group-id.',
    tags: ['distributed-log', 'partitions', 'durable'],
  },
  {
    shortName: 'Confluent',
    name: 'Confluent',
    category: 'platform',
    description: 'Plataforma Confluent dins del portal. En aquesta fase es prova pel camí Kafka-compatible del clúster, sense avaluar Schema Registry, ksqlDB ni Control Center.',
    tags: ['kafka-compatible', 'confluent', 'streaming'],
  },
  {
    shortName: 'RabbitMQ',
    name: 'RabbitMQ',
    category: 'platform',
    version: '3.13',
    description: 'Broker AMQP pensat per cues, ACKs i encaminament flexible. És el camí natural per proves de treball en cua.',
    tags: ['amqp', 'mqtt', 'flexible-routing'],
  },
  {
    shortName: 'NATS Server',
    name: 'NATS Server',
    category: 'platform',
    version: '2.12.5',
    description: 'Servidor NATS lleuger per publish/subscribe. Per payloads grans cal revisar max_payload abans de donar la prova per bona.',
    tags: ['lightweight', 'low-latency', 'jetstream'],
  },
];

export type CatalogSeedSyncResult = {
  totalSeedComponents: number;
  existingSeedComponents: number;
  insertedSeedComponents: number;
};

function normalizeCatalogValue(value: string): string {
  return value.trim().toLowerCase();
}

function buildCatalogSeedKey(component: Pick<CatalogComponent, 'category' | 'shortName' | 'name'>): string {
  const stableName = component.shortName || component.name;
  return `${component.category}:${normalizeCatalogValue(stableName)}`;
}

function buildCatalogNameKey(component: Pick<CatalogComponent, 'category' | 'name'>): string {
  return `${component.category}:${normalizeCatalogValue(component.name)}`;
}

function buildSeedDocumentId(component: CatalogComponent): string {
  const safeShortName = normalizeCatalogValue(component.shortName)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `predefined-${component.category}-${safeShortName}`;
}

async function readExistingCatalogKeys(es: Client, index: string): Promise<Set<string>> {
  const existingKeys = new Set<string>();

  try {
    const response = await es.search({
      index,
      size: 1000,
      _source: ['category', 'shortName', 'name'],
      query: { match_all: {} },
    });

    for (const hit of response.hits.hits as any[]) {
      const source = hit._source || {};
      const category = String(source.category || '').trim();

      if (!category) {
        continue;
      }

      const shortName = String(source.shortName || '').trim();
      const name = String(source.name || '').trim();

      if (shortName) {
        existingKeys.add(`${category}:${normalizeCatalogValue(shortName)}`);
      }

      if (name) {
        existingKeys.add(`${category}:${normalizeCatalogValue(name)}`);
      }
    }
  } catch {
    // If the index does not exist yet, Elasticsearch will create it on first
    // write. Returning an empty set keeps the startup path simple.
  }

  return existingKeys;
}

function componentAlreadyExists(existingKeys: Set<string>, component: CatalogComponent): boolean {
  return (
    existingKeys.has(buildCatalogSeedKey(component)) ||
    existingKeys.has(buildCatalogNameKey(component))
  );
}

/**
 * Keep the predefined catalog rows aligned with the code.
 *
 * Older deployments can already have an `async-catalog` index created before a
 * new predefined component was added. In that case the old "seed only when
 * empty" behavior skipped the seed forever, so components such as SEA never
 * appeared.
 *
 * This function is intentionally non-destructive: it only inserts missing
 * predefined rows. Existing rows, even edited ones, are left untouched.
 */
export async function syncCatalogSeed(es: Client, index: string): Promise<CatalogSeedSyncResult> {
  const result: CatalogSeedSyncResult = {
    totalSeedComponents: CATALOG_SEED.length,
    existingSeedComponents: 0,
    insertedSeedComponents: 0,
  };

  try {
    const existingKeys = await readExistingCatalogKeys(es, index);
    const missingComponents = CATALOG_SEED.filter(component => !componentAlreadyExists(existingKeys, component));

    result.existingSeedComponents = CATALOG_SEED.length - missingComponents.length;

    if (missingComponents.length === 0) {
      console.log(`[catalog-service] seed sync ok: ${CATALOG_SEED.length} predefined components already present`);
      return result;
    }

    console.log(`[catalog-service] seed sync inserting ${missingComponents.length} missing predefined components...`);

    const now = new Date().toISOString();
    const body: any[] = [];

    for (const component of missingComponents) {
      body.push({ create: { _index: index, _id: buildSeedDocumentId(component) } });
      body.push({ ...component, predefined: true, createdAt: now, timestamp: now });
    }

    const resp = await es.bulk({ refresh: 'wait_for', body });
    const items = (resp as any).items || [];

    if ((resp as any).errors) {
      const failed = items.filter((item: any) => item.create?.error && item.create?.status !== 409);
      const conflicts = items.filter((item: any) => item.create?.status === 409);

      if (failed.length > 0) {
        console.error(`[catalog-service] seed sync had ${failed.length} failures:`, failed.slice(0, 3));
      }

      result.insertedSeedComponents = missingComponents.length - failed.length - conflicts.length;
      return result;
    }

    result.insertedSeedComponents = missingComponents.length;
    console.log(`[catalog-service] seed sync ok: ${result.insertedSeedComponents} inserted into ${index}`);
    return result;
  } catch (err: any) {
    // Do not crash the service if seed sync fails. The GET endpoints still
    // work, but the log makes the data problem visible during deployment.
    console.error('[catalog-service] seed sync failed:', err.message);
    return result;
  }
}
