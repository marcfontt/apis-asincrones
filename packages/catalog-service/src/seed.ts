/*
 * seed.ts — Catalog bootstrap data
 *
 * The catalog-service stores component definitions in Elasticsearch
 * (index: `async-catalog`). This module defines the canonical list of
 * predefined components (architectures, protocols, platforms) used by the
 * UI and scenario builder, and exposes `seedIfEmpty()` to populate the
 * index on first boot (or after a data-loss event — e.g. a wiped PVC).
 *
 * These are the SAME values the UI's scenario builder expects
 * (see plugins/feina/src/components/ScenariosPage/ScenariosPage.tsx and
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
import { v4 as uuidv4 } from 'uuid';

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
    description: 'Un log immutable ordenat és la font de veritat; els consumidors llegeixen per offset. Escalable per a pipelines d\'events.',
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
    version: '3.7',
    description: 'Protocol binari de Kafka/Confluent. Missatges en partitions ordenades, consumidors agrupats per group-id, ACKs configurables.',
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
    version: '2.10',
    description: 'Protocol textual fire-and-forget. Sense acks per defecte, subjectes jeràrquics, latència ultra-baixa. JetStream afegeix persistència.',
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
    version: '3.7',
    description: 'Broker distribuït orientat a logs immutables. Alta durabilitat, topics particionats, ideal per a LCA i SEA.',
    tags: ['distributed-log', 'partitions', 'durable'],
  },
  {
    shortName: 'Confluent',
    name: 'Confluent Platform',
    category: 'platform',
    version: '7.6',
    description: 'Distribució de Kafka amb Schema Registry, ksqlDB i Connect. API compatible amb Kafka vanilla.',
    tags: ['kafka-compatible', 'schema-registry', 'enterprise'],
  },
  {
    shortName: 'RabbitMQ',
    name: 'RabbitMQ',
    category: 'platform',
    version: '3.13',
    description: 'Broker AMQP amb plugins per MQTT, STOMP i WebSocket. Fort en encaminament flexible i cues treball.',
    tags: ['amqp', 'mqtt', 'flexible-routing'],
  },
  {
    shortName: 'NATS Server',
    name: 'NATS Server',
    category: 'platform',
    version: '2.10',
    description: 'Servidor NATS lleuger. Pub/sub de latència mínima; JetStream opcional per a persistència i replay.',
    tags: ['lightweight', 'low-latency', 'jetstream'],
  },
  {
    shortName: 'Pulsar',
    name: 'Apache Pulsar',
    category: 'platform',
    version: '3.2',
    description: 'Broker cloud-native amb separació storage/compute (BookKeeper). Multi-tenant, geo-replication.',
    tags: ['cloud-native', 'multi-tenant', 'tiered-storage'],
  },
];

/**
 * Check if the catalog index is empty and seed it if so.
 *
 * Called at service startup. Safe to call repeatedly: if the index already
 * contains documents we skip the seed, so an existing catalog is never
 * overwritten. The `refresh: 'wait_for'` on the bulk insert guarantees that
 * the first GET /components after seeding returns the data (no race with
 * Elasticsearch's async indexing).
 */
export async function seedIfEmpty(es: Client, index: string): Promise<void> {
  try {
    // Use a count with a tiny size=0 search. Cheaper than count() and avoids
    // depending on the index existing yet (ES auto-creates on first write).
    const existing = await es.count({ index }).catch(() => ({ count: 0 } as any));
    const count = (existing as any).count ?? 0;
    if (count > 0) {
      console.log(`[catalog-service] seed skipped: ${count} components already present`);
      return;
    }

    console.log(`[catalog-service] seeding ${CATALOG_SEED.length} predefined components...`);
    const now = new Date().toISOString();
    // Build a bulk body. Each doc gets a fresh UUID so reseeding produces
    // new IDs rather than trampling a previously-custom doc by accident.
    const body: any[] = [];
    for (const c of CATALOG_SEED) {
      body.push({ index: { _index: index, _id: uuidv4() } });
      body.push({ ...c, predefined: true, createdAt: now, timestamp: now });
    }
    const resp = await es.bulk({ refresh: 'wait_for', body });
    const errors = (resp as any).errors;
    if (errors) {
      const items = (resp as any).items || [];
      const failed = items.filter((i: any) => i.index?.error);
      console.error(`[catalog-service] seed had ${failed.length} failures:`, failed.slice(0, 3));
    } else {
      console.log(`[catalog-service] seed ok: ${CATALOG_SEED.length} components indexed into ${index}`);
    }
  } catch (err: any) {
    // Don't crash the service if seed fails — the GET endpoints still work,
    // just return an empty list. Log loudly so ops can investigate.
    console.error('[catalog-service] seed failed:', err.message);
  }
}
