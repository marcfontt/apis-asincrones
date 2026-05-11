/**
 * ScenariosPage.tsx -- Gestio d'escenaris de benchmark
 *
 * Permet crear, editar, duplicar, executar i eliminar escenaris.
 * Un escenari defineix la combinacio de:
 *   - Plataforma (broker): Kafka, RabbitMQ, NATS Server, Confluent
 *   - Arquitectura: EDA, QBA, LCA, EMA, SEA
 *   - Protocol: Kafka, AMQP, MQTT, gRPC, WS, NATS
 *   - Format de dades: default, video-4k, video-8k, financial, iot
 *   - Parametres de carrega: durada (s), ratio (msg/s), payload (bytes)
 *
 * Dades:
 *   - GET/POST/PUT/DELETE /api/proxy/scenario-service/scenarios
 *   - GET /api/proxy/benchmark-orchestrator/runs (per saber quins estan en execució)
 *   - POST /api/proxy/benchmark-orchestrator/runs (per llançar un run)
 *
 * Canvis aplicats:
 *   - Estat 'idle' color: #94a3b8 (gris) -> #10b981 (emerald)
 *     Motiu: els escenaris idle (llestos per executar) han de destacar
 *     positivament, no semblar "desactivats" com els cancelled.
 *   - Stats strip: eliminats "Predefinits" i "Propis" -- afegien soroll
 *     sense valor actionable. Nomes es mostra Total i "En execució".
 *   - Unicode play symbol (triang) substituint pel text descriptiu a la guia
 *   - COMPATIBILITY matrix: defineix quines arquitectures/protocols son
 *     compatibles amb cada plataforma, de manera que el formulari filtra
 *     automaticament les opcions quan es selecciona la plataforma primer.
 */

import { useEffect, useState, useCallback } from 'react';
import { getLanguage, useTranslation } from '../i18n';
import { CATEGORY_COLORS, S } from '../theme';
import { FilterPanel, FilterSelect } from '../components/FilterPanel';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';
import { DEMO_SCENARIO_URL, TutorialButton } from '../components/TutorialOverlay';
import { GuideItemCard, GuidePanel, GuideStepFlow } from '../components/GuidePanel';
import {
  ALL_ARCHITECTURES,
  ALL_PROTOCOLS,
  ALL_PLATFORMS,
  COMPATIBILITY,
  DISABLED_PLATFORMS,
  getCompatibleArchitectures,
  getCompatibleProtocols,
  getDataFormatDecision,
  getCompatibilityStatusColor,
} from '../shared/catalog/compatibility';

// Endpoints dels microserveis (proxied per Backstage via app-config.yaml)
const API_BASE     = '/api/proxy/scenario-service';
const ORCHESTRATOR = '/api/proxy/benchmark-orchestrator';

const LOCALE_BY_LANGUAGE: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-US',
};

const getCurrentLocale = () => LOCALE_BY_LANGUAGE[getLanguage()] || 'ca-ES';

// Types
// Estructura d'un escenari tal com la retorna i espera el scenario-service.
type Scenario = {
  id?: string;
  name: string;
  architecture: string;
  protocol: string;
  platform?: string;
  broker?: string;
  duration?: number;
  rate?: number;
  payloadSize?: number;
  dataFormat?: string;
  status?: string;
  predefined?: boolean;
  createdAt?: string;
};

type SustainedLoadPlan = {
  durationSeconds: number;
  ratio: number;
  payloadBytes: number;
  formatKey: string;
  formatLabel: string;
  formatHint: string;
  platformHint: string;
  architectureHint: string;
  protocolHint: string;
};

// Constants
// Les llistes valides i la compatibilitat venen del modul compartit del cataleg.
// Aixi Cataleg, Escenaris i Tutorial expliquen les mateixes regles.
const HIDDEN_LEGACY_VALUES = ['sse', 'coap', 'pulsar', 'apache pulsar'];
const SUSTAINED_MODE_DURATION_SECONDS = 3600;

const isHiddenLegacyScenario = (s: Scenario): boolean => {
  const values = [s.name, s.protocol, s.platform, s.broker]
    .map(value => String(value || '').toLowerCase());
  return values.some(value => HIDDEN_LEGACY_VALUES.some(hidden => value.includes(hidden)));
};

// Colors identificatius per a cada plataforma de missatgeria.
// Usats als badges de la taula i al modal de detall.
// Colors coherents amb la identitat de cada producte (Kafka=roig, NATS=verd...).
const PLATFORM_COLORS: Record<string, string> = {
  'Kafka':       '#ef4444', // vermell -- marca Apache Kafka
  'Confluent':   '#3b82f6', // blau -- marca Confluent (Kafka Enterprise)
  'RabbitMQ':    '#f59e0b', // ambre -- marca RabbitMQ
  'NATS Server': '#22c55e', // verd -- marca NATS (lightweight, fast)
};

// Formats de dades disponibles per simular casos d'us reals.
// Cada format ajusta automaticament el payload i ratio en mode sostingut.
// 'video-8k' usa payloads de 2MB: IMPORTANT - Kafka broker per defecte
// te un limit de 1MB per missatge (message.max.bytes). Els escenaris
// video-8k amb Kafka/Confluent mostraran 0ms latencia i 0 throughput
// per aixo (el broker rebutja silenciosament els missatges).
// Per habilitar-los caldria configurar message.max.bytes > 2MB al broker.
const DATA_FORMATS = [
  { value: 'default',   label: 'Base controlada (256 B)' },
  { value: 'video-4k',  label: 'Streaming vídeo 4K (500 KB)' },
  { value: 'video-8k',  label: 'Streaming vídeo 8K (2 MB)' },
  { value: 'financial', label: 'Transaccions financeres (JSON compacte)' },
  { value: 'iot',       label: 'Telemetria IoT (64 B)' },
];

const DATA_FORMAT_LABELS: Record<string, string> = {
  'default':   'Base',
  'video-4k':  'Vídeo 4K',
  'video-8k':  'Vídeo 8K',
  'financial': 'Financer',
  'iot':       'IoT',
};

const DATA_FORMAT_COLORS: Record<string, string> = {
  'default':   '#6b7280',
  'video-4k':  '#7c3aed',
  'video-8k':  '#9333ea',
  'financial': '#0891b2',
  'iot':       '#16a34a',
};

const FORMAT_RECOMMENDATIONS: Record<string, { payloadKB: number; rateMsgsPerSec: number }> = {
  json:                 { payloadKB: 2,    rateMsgsPerSec: 5000 },
  avro:                 { payloadKB: 1,    rateMsgsPerSec: 10000 },
  protobuf:             { payloadKB: 1,    rateMsgsPerSec: 12000 },
  msgpack:              { payloadKB: 1.5,  rateMsgsPerSec: 8000 },
  'base-controlada':    { payloadKB: 0.5,  rateMsgsPerSec: 20000 },
  iot:                  { payloadKB: 0.2,  rateMsgsPerSec: 50000 },
  transaccional:        { payloadKB: 4,    rateMsgsPerSec: 2000 },
  default:              { payloadKB: 0.5,  rateMsgsPerSec: 20000 },
  financial:            { payloadKB: 4,    rateMsgsPerSec: 2000 },
  'video-4k':           { payloadKB: 500,  rateMsgsPerSec: 10 },
  'video-8k':           { payloadKB: 2000, rateMsgsPerSec: 4 },
};

// Valors per defecte que aplica el load-generator quan rate/payload son null.
// Aquesta taula reflecteix EXACTAMENT el que fa el backend a
// `packages/benchmark-orchestrator/src/index.ts` (DATA_FORMAT_CONFIG).
// La duplicacio es deliberada: aixi la UI pot dir clarament a l'usuari
// quins numeros agafara el mode sostingut sense haver de cridar al
// backend abans d'arrencar el run.
const DEFAULTS_FORMAT: Record<string, { ratio: number; payloadBytes: number; hint: string; effect: string }> = {
  'default': {
    ratio: 100,
    payloadBytes: 256,
    hint: 'Càrrega base per comprovar que la combinació funciona abans d’augmentar pressió.',
    effect: 'Serveix com a control: missatges petits i regulars, sense exigir throughput extrem.',
  },
  'video-4k': {
    ratio: 10,
    payloadBytes: 500_000,
    hint: 'Payload gran amb poques emissions per segon.',
    effect: 'Força el broker a moure volum de dades; és útil per veure throughput i estabilitat.',
  },
  'video-8k': {
    ratio: 4,
    payloadBytes: 2_000_000,
    hint: 'Payload molt gran; només és defensable si el broker accepta missatges de 2 MB.',
    effect: 'Estressa límits de payload. NATS necessita max_payload >= 4 MB i Kafka/compatibles necessiten límits de missatge coherents.',
  },
  'financial': {
    ratio: 200,
    payloadBytes: 512,
    hint: 'Missatges petits amb més freqüència.',
    effect: 'Mesura latència, errors i regularitat en transaccions curtes.',
  },
  'iot': {
    ratio: 500,
    payloadBytes: 64,
    hint: 'Payload mínim i freqüència alta.',
    effect: 'Simula sensors o telemetria, on importa absorbir molts missatges petits.',
  },
};

const PLATFORM_LOAD_FACTORS: Record<string, { factor: number; hint: string }> = {
  'Kafka':       { factor: 0.95, hint: 'Kafka prioritza logs ordenats; baixem lleugerament la ràtio recomanada quan el payload és alt.' },
  'Confluent':   { factor: 1.00, hint: 'Confluent/Kafka compatible es manté com a referència per streaming i logs.' },
  'RabbitMQ':    { factor: 0.85, hint: 'RabbitMQ treballa molt bé amb cues i ACKs; evitem sobrecarregar-lo amb ràtios extremes per defecte.' },
  'NATS Server': { factor: 1.15, hint: 'NATS encaixa amb missatges petits i alta freqüència; pot pujar la ràtio en IoT o payloads lleugers.' },
};

const ARCHITECTURE_LOAD_FACTORS: Record<string, { factor: number; hint: string }> = {
  'EDA': { factor: 1.00, hint: 'EDA manté la càrrega base del format.' },
  'QBA': { factor: 0.90, hint: 'QBA introdueix cua i confirmació; es redueix una mica la pressió inicial.' },
  'LCA': { factor: 0.95, hint: 'LCA és adequada per fluxos ordenats i conserva gairebé tota la ràtio base.' },
  'EMA': { factor: 0.75, hint: 'EMA representa més salts lògics; fem una càrrega més prudent.' },
  'SEA': { factor: 0.85, hint: 'SEA prioritza flux continu; en payloads grans es redueix la freqüència.' },
};

const PROTOCOL_LOAD_FACTORS: Record<string, { factor: number; hint: string }> = {
  'Kafka': { factor: 0.95, hint: 'Protocol Kafka: bo per lots i logs, però amb overhead de particions/offsets.' },
  'AMQP':  { factor: 0.90, hint: 'AMQP afegeix semàntica de cues i confirmacions.' },
  'MQTT':  { factor: 1.05, hint: 'MQTT és lleuger i encaixa amb missatges petits.' },
  'gRPC':  { factor: 0.95, hint: 'gRPC streaming és eficient però manté cost de serialització i canal.' },
  'WS':    { factor: 0.80, hint: 'WebSocket és útil per clients web; la càrrega recomanada és més moderada.' },
  'NATS':  { factor: 1.15, hint: 'NATS és molt lleuger en pub/sub i permet més freqüència amb payload petit.' },
};

const clampRatio = (value: number) => Math.max(1, Math.round(value));

const getSustainedLoadPlan = (input: {
  platform?: string;
  architecture?: string;
  protocol?: string;
  dataFormat?: string;
}): SustainedLoadPlan => {
  const formatKey = input.dataFormat || 'default';
  const format = DEFAULTS_FORMAT[formatKey] || DEFAULTS_FORMAT.default;
  const platform = PLATFORM_LOAD_FACTORS[normalizePlatform(input.platform) || ''] || { factor: 1, hint: 'Sense plataforma triada: s’aplica el perfil base del format.' };
  const architecture = ARCHITECTURE_LOAD_FACTORS[input.architecture || ''] || { factor: 1, hint: 'Sense arquitectura triada: s’aplica el perfil base del format.' };
  const protocol = PROTOCOL_LOAD_FACTORS[input.protocol || ''] || { factor: 1, hint: 'Sense protocol triat: s’aplica el perfil base del format.' };

  return {
    durationSeconds: SUSTAINED_MODE_DURATION_SECONDS,
    ratio: clampRatio(format.ratio * platform.factor * architecture.factor * protocol.factor),
    payloadBytes: format.payloadBytes,
    formatKey,
    formatLabel: DATA_FORMAT_LABELS[formatKey] || formatKey,
    formatHint: `${format.hint} ${format.effect}`,
    platformHint: platform.hint,
    architectureHint: architecture.hint,
    protocolHint: protocol.hint,
  };
};

const formatBytesFriendly = (bytes: number): string => {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + ' MB';
  if (bytes >= 1_000)     return (bytes / 1_000).toFixed(1) + ' KB';
  return bytes + ' B';
};

const formatDurationFriendly = (seconds: number | null | undefined): string => {
  if (seconds == null) return 'No definida';
  if (seconds === 0) return 'Mode antic sense limit';
  if (seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
};

const PROTOCOL_COLORS: Record<string, string> = {
  'Kafka':  '#ef4444',
  'AMQP':   '#f97316',
  'MQTT':   '#eab308',
  'gRPC':   '#8b5cf6',
  'WS':     '#3b82f6',
  'NATS':   '#22c55e',
};

const ARCHITECTURE_COLORS: Record<string, string> = {
  'EDA':  '#2563eb',
  'QBA':  '#9333ea',
  'LCA':  '#16a34a',
  'EMA':  '#dc2626',
  'SEA':  '#d97706',
};

/**
 * Normalitza el nom d'una plataforma als valors estandard de l'app.
 * El scenario-service pot desar el nom amb variacions de capitalitzacio
 * (ex: "kafka", "KAFKA", "nats", "Nats server").
 * Aquesta funcio garanteix que sempre mostrem el nom canonic.
 */
const normalizePlatform = (p?: string): string => {
  if (!p) return '';
  const map: Record<string, string> = {
    'kafka': 'Kafka', 'rabbitmq': 'RabbitMQ', 'rabbit': 'RabbitMQ',
    'confluent': 'Confluent', 'nats': 'NATS Server', 'nats server': 'NATS Server',
  };
  return map[p.toLowerCase()] ?? p;
};

const EMPTY_FORM = {
  name: '', architecture: '', protocol: '', platform: '',
  duration: '', rate: '', payloadSize: '', dataFormat: '',
};

// Estats d'un escenari amb color, etiqueta i fons.
// CANVI: 'idle' era #94a3b8 (gris neutre, semblava desactivat/cancelat).
// Ara es #10b981 (emerald verd) per indicar que l'escenari esta LLEST per
// executar-se -- una lectura positiva, no neutral. El gris s'ha reservat
// per als estats realment inactius (cancelled/cleanup).
const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  idle:      { color: '#10b981', label: 'Llest',       bg: 'rgba(16,185,129,0.10)' }, // verd: llest per executar
  pending:   { color: '#f59e0b', label: 'Pendent',     bg: 'rgba(245,158,11,0.1)'  }, // ambre: esperant inici al cluster
  running:   { color: '#3b82f6', label: 'En execució', bg: 'rgba(59,130,246,0.1)'  }, // blau: execució activa
  completed: { color: '#22c55e', label: 'Completat',   bg: 'rgba(34,197,94,0.1)'   }, // verd fort: finalitzat correctament
  error:     { color: '#ef4444', label: 'Error',       bg: 'rgba(239,68,68,0.1)'   }, // vermell: ha fallat
};

const SK_STYLE = {
  background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: 4,
};

// Presets predefinits
// Configuracions de benchmark optimitzades per a casos d'us habituals.
// No es creen directament com a escenaris -- son plantilles que pre-omplen
// el formulari de creacio quan l'usuari fa clic a "Usar com a base".
// Aixo permet al usuari partir d'una configuracio recomanada i ajustar-la.

// Cadascun representa una combinacio real:
//   - Finances: AMQP + RabbitMQ -- missatgeria garantida, zero perdua
//   - IoT:      NATS + NATS Server -- throughput maxim, payload minim
//   - Video 4K: Kafka + Confluent -- alt throughput, tolera latencia
//   - Ultra-low latency: gRPC + Kafka -- processat rapid, sincronic
//   - Video 8K: Kafka + Confluent -- carrega maxima (NOTA: pot mostrar
//               0ms/0 throughput si Kafka no esta configurat per a
//               missatges >1MB. Veure comentari a DATA_FORMATS.)
const PREDEFINED_PRESETS = [
  {
    name:         'RabbitMQ financer fiable',
    nameKey:      'scenarios.presets.items.rabbitmqFinancialReliable.name',
    platform:     'RabbitMQ',
    architecture: 'QBA',
    protocol:     'AMQP',
    dataFormat:   'financial',
    duration:     '360',
    warmup:       '120',
    rate:         '200',
    payloadSize:  '512',
    descKey:      'scenarios.presets.items.rabbitmqFinancialReliable.desc',
    desc:         'Cues AMQP per transaccions curtes. És el preset més defensable per veure latència i errors sense carregar payloads gegants.',
    color:        '#0891b2',
  },
  {
    name:         'NATS telemetria IoT',
    nameKey:      'scenarios.presets.items.natsIotTelemetry.name',
    platform:     'NATS Server',
    architecture: 'EDA',
    protocol:     'NATS',
    dataFormat:   'iot',
    duration:     '360',
    warmup:       '120',
    rate:         '500',
    payloadSize:  '64',
    descKey:      'scenarios.presets.items.natsIotTelemetry.desc',
    desc:         'Pub/sub lleuger amb payload mínim. És el cas recomanat per NATS abans de provar càrregues pesades.',
    color:        '#16a34a',
  },
  {
    name:         'Kafka streaming 4K',
    nameKey:      'scenarios.presets.items.kafka4kStreaming.name',
    platform:     'Kafka',
    architecture: 'SEA',
    protocol:     'Kafka',
    dataFormat:   'video-4k',
    duration:     '360',
    warmup:       '120',
    rate:         '10',
    payloadSize:  '500000',
    descKey:      'scenarios.presets.items.kafka4kStreaming.desc',
    desc:         'Log de streaming amb payload de 500 KB. Serveix per mesurar volum sostingut sense arribar al límit de 8K.',
    color:        '#7c3aed',
  },
  {
    name:         'RabbitMQ transaccions financeres',
    nameKey:      'scenarios.presets.items.rabbitmqFinancialTransactions.name',
    platform:     'RabbitMQ',
    architecture: 'EDA',
    protocol:     'AMQP',
    dataFormat:   'financial',
    duration:     '360',
    warmup:       '120',
    rate:         '300',
    payloadSize:  '256',
    descKey:      'scenarios.presets.items.rabbitmqFinancialTransactions.desc',
    desc:         'AMQP sobre RabbitMQ amb format financer JSON compacte. Permet comparar latència i errors en transaccions curtes.',
    color:        '#eab308',
  },
  {
    name:         'Confluent vídeo 8K',
    nameKey:      'scenarios.presets.items.confluent8kVideo.name',
    platform:     'Confluent',
    architecture: 'SEA',
    protocol:     'Kafka',
    dataFormat:   'video-8k',
    duration:     '360',
    warmup:       '120',
    rate:         '4',
    payloadSize:  '2000000',
    descKey:      'scenarios.presets.items.confluent8kVideo.desc',
    desc:         'Escenari pesat per validar límits de payload i throughput. Només és recomanable si el broker accepta missatges de 2 MB.',
    color:        '#9333ea',
  },
  {
    name:         'Kafka control base',
    nameKey:      'scenarios.presets.items.kafkaBaselineControl.name',
    platform:     'Kafka',
    architecture: 'EDA',
    protocol:     'Kafka',
    dataFormat:   'default',
    duration:     '360',
    warmup:       '120',
    rate:         '100',
    payloadSize:  '256',
    descKey:      'scenarios.presets.items.kafkaBaselineControl.desc',
    desc:         'Preset curt per comprovar que la ruta productor-broker-consumidor funciona abans de fer proves fortes.',
    color:        '#ef4444',
  },
];

// Icons
const PlayIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const StopIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
const EditIcon      = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const DuplicateIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const CloseIcon     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PlusIcon      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const RefreshIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const EmptyIcon     = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>;
const RocketIcon    = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m3.29 15 5 5"/><path d="M13 7 7 13"/><path d="m20 7-5 3-3 5 2 2 5-3 3-5z"/></svg>;
const GearIcon      = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
// Sort icons (SVG, no emojis)
const SortAscIcon  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const SortDescIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const SortNoneIcon = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/><polyline points="8 6 12 2 16 6"/><polyline points="8 18 12 22 16 18"/></svg>;

const SkeletonRow = ({ delay = 0 }: { delay?: number }) => (
  <tr>
    {[62, 48, 42, 55, 38, 45, 30, 32, 32].map((w, j) => (
      <td key={j} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ ...SK_STYLE, height: 11, width: `${w}%`, animationDelay: `${delay}s` }} />
      </td>
    ))}
  </tr>
);

type SortDir = 'asc' | 'desc';

const SortTh = ({ label, sk, current, dir, onSort, extraStyle }: {
  label: string; sk: string; current: string | null; dir: SortDir | null;
  onSort: (sk: any) => void; extraStyle?: React.CSSProperties;
}) => {
  const active = current === sk;
  return (
    <th
      style={{ ...S.th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' as const, ...extraStyle }}
      onClick={() => onSort(sk)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        {label}
        <span style={{ color: active ? 'var(--accent)' : 'var(--text-disabled)', display: 'flex' }}>
          {active && dir === 'asc'  ? <SortAscIcon />  :
           active && dir === 'desc' ? <SortDescIcon /> :
           <SortNoneIcon />}
        </span>
      </span>
    </th>
  );
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, color: 'var(--text-secondary)',
  marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
};

const getScenarioRunPlan = (scenario: Scenario) => {
  const recommended = getSustainedLoadPlan({
    platform: scenario.platform || scenario.broker,
    architecture: scenario.architecture,
    protocol: scenario.protocol,
    dataFormat: scenario.dataFormat || 'default',
  });
  const rawDuration = scenario.duration == null ? null : Number(scenario.duration);
  const isLegacyIndefinite = rawDuration === 0;

  return {
    duration: isLegacyIndefinite ? SUSTAINED_MODE_DURATION_SECONDS : rawDuration,
    rate: scenario.rate ?? recommended.ratio,
    payloadSize: scenario.payloadSize ?? recommended.payloadBytes,
    recommended,
    isLegacyIndefinite,
    usesRecommendedRate: scenario.rate == null,
    usesRecommendedPayload: scenario.payloadSize == null,
  };
};

const buildRunRequestBody = (scenario: Scenario) => {
  const plan = getScenarioRunPlan(scenario);
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    architecture: scenario.architecture,
    protocol: scenario.protocol,
    platform: normalizePlatform(scenario.platform || scenario.broker),
    dataFormat: scenario.dataFormat || 'default',
    duration: plan.duration,
    rate: plan.rate,
    payloadSize: plan.payloadSize,
  };
};

// Modal: Crear / Editar
/**
 * ScenarioModal -- Formulari per crear o editar un escenari.
 *
 * Mode 'create': formulari buit (o pre-omplert des d'un preset o URL params).
 * Mode 'edit':   formulari pre-omplert amb les dades de l'escenari existent.
 *
 * Ordre recomanat al formulari:
 *   1. Nom (identificatiu)
 *   2. Plataforma (filtra les opcions d'arquitectura i protocol)
 *   3. Arquitectura + Protocol (restringits per la plataforma)
 *   4. Mode sostingut (toggle -- si actiu, desactiva durada/ratio/payload)
 *   5. Durada / Ratio / Payload (si no es mode sostingut)
 *   6. Format de dades
 *
 * Props:
 *   mode:    'create' o 'edit'
 *   initial: valors inicials del formulari (EMPTY_FORM per a creacio)
 *   onClose: callback quan es tanca sense desar
 *   onSaved: callback quan s'ha desat correctament (re-carrega la llista)
 */
const ScenarioModal = ({ mode, initial, onClose, onSaved }: {
  mode: 'create' | 'edit';
  initial: typeof EMPTY_FORM & { id?: string; createdAt?: string };
  onClose: () => void;
  onSaved: (scenario: Scenario, mode: 'create' | 'edit') => void;
}) => {
  const { t } = useTranslation();
  const [form,       setForm]       = useState({ ...EMPTY_FORM, ...initial });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  // Mode sostingut: és el substitut segur del vell "mode indefinit".
  // No guardem duration=0 perquè això crea runs realment infinits al backend.
  // Quan el toggle és actiu, enviem 3600s i valors explícits de ràtio/payload.
  const [indefinite, setIndefinite] = useState(
    Number(initial.duration) === 0 || Number(initial.duration) === SUSTAINED_MODE_DURATION_SECONDS
  );

  /**
   * Actualitza un camp del formulari.
   * Cas especial per 'platform': reseteja arquitectura i protocol si
   * els valors actuals son incompatibles amb la nova plataforma.
   * Aixo evita que l'usuari enviï combinacions invalides.
   */
  const set = (k: string, v: string) => {
    if (k === 'platform') {
      const compatibleArchitectures = getCompatibleArchitectures(v);
      const compatibleProtocols = getCompatibleProtocols(v);

      // Mantenim els valors actuals nomes si la nova plataforma els pot executar.
      // Si no, els deixem buits per obligar l'usuari a triar una combinacio valida.
      setForm(f => ({
        ...f,
        platform: v,
        architecture: compatibleArchitectures.includes(f.architecture) ? f.architecture : '',
        protocol: compatibleProtocols.includes(f.protocol) ? f.protocol : '',
      }));
      return;
    }

    setForm(f => ({ ...f, [k]: v }));
  };

  const handleFormatChange = (newFormat: string) => {
    const recommendation = FORMAT_RECOMMENDATIONS[newFormat];
    setForm(f => ({
      ...f,
      dataFormat: newFormat,
      ...(recommendation
        ? {
            payloadSize: String(Math.round(recommendation.payloadKB * 1000)),
            rate: String(recommendation.rateMsgsPerSec),
          }
        : {}),
    }));
  };

  const ca = getCompatibleArchitectures(form.platform);
  const cp = getCompatibleProtocols(form.platform);
  const sustainedPlan = getSustainedLoadPlan({
    platform: form.platform,
    architecture: form.architecture,
    protocol: form.protocol,
    dataFormat: form.dataFormat || 'default',
  });
  const selectedFormat = DEFAULTS_FORMAT[form.dataFormat || 'default'] || DEFAULTS_FORMAT.default;
  const formatDecision = getDataFormatDecision(form.platform, form.dataFormat || 'default');
  const formatDecisionColor = getCompatibilityStatusColor(formatDecision.status);

  /**
   * Envia el formulari al scenario-service (POST per crear, PUT per editar).
   * En mode sostingut, duration=3600 i rate/payloadSize son explicits.
   * predefined=false: els escenaris creats per usuari mai son "de sistema".
   * status='idle': l'escenari comenca en estat llest, no s'executa automaticament.
   */
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.architecture || !form.protocol || !form.platform) {
      setError('El nom, arquitectura, protocol i plataforma son obligatoris.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload: any = {
        name:         form.name.trim(),
        architecture: form.architecture,
        protocol:     form.protocol,
        platform:     form.platform,
        duration:     indefinite ? sustainedPlan.durationSeconds : (form.duration    ? Number(form.duration)    : undefined),
        rate:         indefinite ? sustainedPlan.ratio           : (form.rate        ? Number(form.rate)        : undefined),
        payloadSize:  indefinite ? sustainedPlan.payloadBytes    : (form.payloadSize ? Number(form.payloadSize) : undefined),
        dataFormat:   form.dataFormat || 'default',
        predefined:   false,   // mai un escenari d'usuari sera de sistema
        status:       'idle',  // comenca en estat llest
      };
      // Preserva createdAt en edicio per no perdre l'historial de quan es va crear
      if (mode === 'edit' && initial.createdAt) payload.createdAt = initial.createdAt;
      const url = mode === 'edit' && initial.id ? `${API_BASE}/scenarios/${initial.id}` : `${API_BASE}/scenarios`;
      const r = await fetch(url, {
        method: mode === 'edit' && initial.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const savedScenario = await r.json().catch(() => ({ ...payload, id: initial.id }));
      onSaved(savedScenario, mode); onClose();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '88px 20px 28px' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 720, maxWidth: '100%', maxHeight: 'calc(100vh - 116px)', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {mode === 'edit' ? 'Editar Escenari' : 'Nou Escenari'}
          </h2>
          <button onClick={onClose} aria-label="Tanca el modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}><CloseIcon /></button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={lbl}>Nom *</label>
            <input style={{ ...S.input }} placeholder="ex. MQTT-EDA-RabbitMQ-IoT" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div>
            <label style={lbl}>
              Plataforma / Broker *{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-secondary)' }}>(selecciona primer)</span>
            </label>
            <select style={{ ...S.input }} value={form.platform} onChange={e => set('platform', e.target.value)}>
              <option value="">Selecciona...</option>
              {ALL_PLATFORMS.map(p => {
                const disabled = DISABLED_PLATFORMS.includes(p);
                return (
                  <option key={p} value={p} disabled={disabled} style={disabled ? { color: 'var(--text-disabled)' } : {}}>
                    {p}{disabled ? ' (no disponible)' : ''}
                  </option>
                );
              })}
            </select>
            {DISABLED_PLATFORMS.length > 0 && (
              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-disabled)' }}>
                Plataformes no disponibles: {DISABLED_PLATFORMS.join(', ')}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>
                Arquitectura *{' '}
                {form.platform && <span style={{ color: 'var(--accent)', fontWeight: 400 }}>({ca.length} compatibles)</span>}
              </label>
              <select style={{ ...S.input }} value={form.architecture} onChange={e => set('architecture', e.target.value)}>
                <option value="">Selecciona...</option>
                {ALL_ARCHITECTURES.map(a => {
                  const ok = form.platform ? ca.includes(a) : true;
                  return <option key={a} value={a} disabled={!ok} style={!ok ? { color: 'var(--text-disabled)' } : {}}>{a}{!ok && form.platform ? ' (incompatible)' : ''}</option>;
                })}
              </select>
            </div>
            <div>
              <label style={lbl}>
                Protocol *{' '}
                {form.platform && <span style={{ color: 'var(--accent)', fontWeight: 400 }}>({cp.length} compatibles)</span>}
              </label>
              <select style={{ ...S.input }} value={form.protocol} onChange={e => set('protocol', e.target.value)}>
                <option value="">Selecciona...</option>
                {ALL_PROTOCOLS.map(p => {
                  const ok = form.platform ? cp.includes(p) : true;
                  return <option key={p} value={p} disabled={!ok} style={!ok ? { color: 'var(--text-disabled)' } : {}}>{p}{!ok && form.platform ? ' (incompatible)' : ''}</option>;
                })}
              </select>
            </div>
          </div>

          {form.platform && (
            <div style={{ background: 'var(--badge-blue-bg)', border: '1px solid var(--badge-blue-fg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--badge-blue-fg)', opacity: 0.9 }}>
              <strong>{form.platform}</strong> · Arq: {ca.join(', ')} · Proto: {cp.join(', ')}
            </div>
          )}

          {/* Durada, Ràtio, Payload + Mode sostingut toggle */}
          <div style={{ marginBottom: 4 }}>
            <button
              type="button"
              onClick={() => setIndefinite(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                border: indefinite ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: indefinite ? 'rgba(37,99,235,0.08)' : 'var(--bg-card)',
                fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
                color: indefinite ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.18s ease', width: '100%',
              }}
            >
              <span style={{
                width: 36, height: 20, borderRadius: 12, position: 'relative' as const,
                background: indefinite ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.2s ease', flexShrink: 0,
              }}>
                <span style={{
                  position: 'absolute' as const, top: 2, left: indefinite ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}/>
              </span>
              <div>
                <div>Mode sostingut amb límit d'1 hora</div>
                <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-disabled)', marginTop: 1 }}>
                  {indefinite
                    ? "Actiu: l'escenari s'atura sol al cap d'1 hora i aplica ràtio/payload recomanats."
                    : "Activa'l per fer una prova llarga i controlada sense haver d'entrar valors manuals."}
                </div>
              </div>
              {indefinite && <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: 'var(--accent)', whiteSpace: 'nowrap' }}>60 min</span>}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, opacity: indefinite ? 0.4 : 1, pointerEvents: indefinite ? 'none' as const : 'auto' as const, transition: 'opacity 0.2s' }}>
            <div>
              <label style={lbl}>Durada (s)</label>
              <input style={{ ...S.input }} type="number" min={1} placeholder="60" value={form.duration} onChange={e => set('duration', e.target.value)} disabled={indefinite} />
            </div>
            <div>
              <label style={lbl}>Ràtio (msg/s)</label>
              <input style={{ ...S.input }} type="number" min={1} placeholder="1000" value={form.rate} onChange={e => set('rate', e.target.value)} disabled={indefinite} />
            </div>
            <div>
              <label style={lbl}>Payload (bytes)</label>
              <input style={{ ...S.input }} type="number" min={1} placeholder="256" value={form.payloadSize} onChange={e => set('payloadSize', e.target.value)} disabled={indefinite} />
            </div>
          </div>
          {indefinite && (
            <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 8, padding: '12px 14px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--accent)' }}>Mode sostingut activat.</strong>{' '}
                No és infinit real: el run queda limitat a <strong style={{ color: 'var(--text-primary)' }}>1 hora</strong> per evitar despesa accidental.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Durada</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{sustainedPlan.durationSeconds / 60} min</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Ràtio aplicada</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{sustainedPlan.ratio} msg/s</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Payload aplicat</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{formatBytesFriendly(sustainedPlan.payloadBytes)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Format</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{sustainedPlan.formatLabel}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                {[sustainedPlan.formatHint, sustainedPlan.platformHint, sustainedPlan.architectureHint, sustainedPlan.protocolHint].map(note => (
                  <div key={note} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--accent)', marginTop: 7, flexShrink: 0 }} />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={lbl}>Format de dades</label>
            <select style={{ ...S.input }} value={form.dataFormat} onChange={e => handleFormatChange(e.target.value)}>
              {DATA_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            {form.dataFormat && (
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                {t('scenarios.format.appliedRecommendations')}
              </p>
            )}
            <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{sustainedPlan.formatLabel}</strong>{' '}
              aplica una base de <strong style={{ color: 'var(--text-primary)' }}>{selectedFormat.ratio} msg/s</strong> i{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{formatBytesFriendly(selectedFormat.payloadBytes)}</strong>.
              <span style={{ display: 'block', marginTop: 4 }}>{selectedFormat.effect}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-disabled)' }}>
              Defineix el tipus de dades per simular casos d'ús reals (streaming, IoT, finances...)
            </p>
            {/*
              Avis especific NATS + video-8k.
              Els payloads de video-8k son d'uns 2 MB. NATS Server, per defecte,
              rebutja missatges de mes d'1 MB (`max_payload`). Si l'usuari
              barreja NATS amb video-8k sense pujar el limit a >=4MB al cluster,
              tot el run fallara amb NATS_MAX_PAYLOAD_EXCEEDED. Es millor
              avisar-lo abans de llancar el benchmark.
            */}
            {formatDecision.status !== 'supported' && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                background: `${formatDecisionColor}12`,
                border: `1px solid ${formatDecisionColor}55`,
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}>
                <strong style={{ color: formatDecisionColor }}>{t(formatDecision.labelKey)}:</strong>{' '}
                {t(formatDecision.reasonKey)}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid var(--error)', borderRadius: 8, padding: '10px 14px', color: 'var(--error)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} disabled={saving} style={{ ...S.btn, fontSize: 13 }}>Cancel·la</button>
            <button onClick={handleSubmit} disabled={saving} style={{ ...S.btnPrimary, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Desant...' : mode === 'edit' ? 'Desa els canvis' : 'Crea Escenari'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Modal: Confirmar eliminació
const DeleteModal = ({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '88px 20px 28px' }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 420, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Eliminar Escenari</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
        Segur que vols eliminar <strong style={{ color: 'var(--text-primary)' }}>{name}</strong>? Aquesta accio no es pot desfer.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Cancel·la</button>
        <button onClick={onConfirm} style={{ ...S.btnPrimary, fontSize: 13, background: 'var(--error)', boxShadow: 'none' }}>Elimina</button>
      </div>
    </div>
  </div>
);

// Modal: Executar
const ExecuteModal = ({ scenario, onClose, onStarted }: { scenario: Scenario; onClose: () => void; onStarted?: (scenarioId: string, runId: string) => void }) => {
  const [state, setState] = useState<'confirm' | 'running' | 'done' | 'error'>('confirm');
  const [runId, setRunId] = useState('');
  const [error, setError] = useState('');

  const handleExecute = async () => {
    setState('running');
    try {
      const r = await fetch(`${ORCHESTRATOR}/runs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRunRequestBody(scenario)),
      });
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `HTTP ${r.status}`); }
      const data = await r.json();
      const newRunId = data.runId || data.id || '';
      setRunId(newRunId);
      setState('done');
      if (scenario.id && onStarted) onStarted(scenario.id, newRunId);
    } catch (e: any) { setError(e.message); setState('error'); }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '88px 20px 28px' };
  const card:    React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: 460, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease' };

  const platDisplay = normalizePlatform(scenario.platform || scenario.broker);
  const runPlan = getScenarioRunPlan(scenario);
  const effectiveDuration = runPlan.duration;
  const effectiveRate = runPlan.rate;
  const effectivePayload = runPlan.payloadSize;
  const estimatedMessages = effectiveDuration ? effectiveDuration * effectiveRate : null;
  const estimatedPayloadBytes = estimatedMessages != null ? estimatedMessages * effectivePayload : null;
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  if (state === 'confirm') return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Executar Escenari</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        Es desplegarà un Job al AKS per l'escenari <strong style={{ color: 'var(--text-primary)' }}>{scenario.name}</strong>.
      </p>
      <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, display: 'grid', gap: 6 }}>
        {([
          ['Arquitectura', scenario.architecture],
          ['Protocol',     scenario.protocol],
          ['Plataforma',   platDisplay],
          ['Format dades', DATA_FORMAT_LABELS[scenario.dataFormat || 'default'] || 'Base'],
          ['Durada',       formatDurationFriendly(effectiveDuration)],
          ['Ratio',        `${effectiveRate} msg/s${runPlan.usesRecommendedRate ? ' recomanat' : ''}`],
          ['Payload',      `${formatBytesFriendly(effectivePayload)}${runPlan.usesRecommendedPayload ? ' recomanat' : ''}`],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{l}</span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{v || '-'}</strong>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.28)', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Previsio de carrega
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Missatges estimats</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {estimatedMessages != null ? estimatedMessages : 'No definit'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Volum aprox.</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {estimatedPayloadBytes != null ? formatBytes(estimatedPayloadBytes) : 'Variable'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.55 }}>
          {runPlan.isLegacyIndefinite
            ? `Aquest escenari venia del mode antic amb durada 0. Per seguretat s'executara amb limit d'1 hora, ${effectiveRate} msg/s i ${formatBytesFriendly(effectivePayload)} per missatge.`
            : estimatedMessages != null
              ? `Amb ${effectiveRate} msg/s durant ${formatDurationFriendly(effectiveDuration)}, aquest run hauria d'enviar aproximadament ${estimatedMessages} missatges si no l'atures abans.`
              : `Aquest escenari no te durada definida. Es respectara el valor del backend, pero el ratio i el payload s'envien explicitament per mantenir la prova reproduible.`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Cancel·la</button>
        {/*
          Boto verd destacat. Es l'acció principal del modal i ha de cridar
          molt l'atencio: gradient verd intens, ombra forta i hover que
          puja una mica per donar sensacio de tactilitat.
        */}
        <button
          onClick={handleExecute}
          style={{
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #16a34a',
            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            fontFamily: 'var(--font)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(34,197,94,0.45)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = '';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(34,197,94,0.35)';
          }}
        >
          <PlayIcon /> Executa a AKS
        </button>
      </div>
    </div></div>
  );

  if (state === 'running') return (
    <div style={overlay}><div style={{ ...card, textAlign: 'center' as const, padding: 48 }}>
      <div style={{ color: 'var(--accent)', marginBottom: 16, display: 'flex', justifyContent: 'center' }}><GearIcon /></div>
      <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Desplegant a AKS...</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Creant namespace i Job de càrrega</p>
    </div></div>
  );

  if (state === 'done') return (
    <div style={overlay}><div style={card}>
      <div style={{ textAlign: 'center' as const, marginBottom: 20 }}>
        <div style={{ color: 'var(--success)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}><RocketIcon /></div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Escenari desplegat!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 16px' }}>El Job s'ha creat a AKS correctament.</p>
      </div>
      <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid var(--success)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
        <div style={{ color: 'var(--success)', marginBottom: 4, fontWeight: 700 }}>ID d'execució</div>
        <code style={{ fontSize: 12, color: 'var(--success)', wordBreak: 'break-all' as const, fontFamily: 'var(--font-mono)' }}>{runId}</code>
      </div>
      <div style={{ background: 'var(--badge-blue-bg)', border: '1px solid var(--badge-blue-fg)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--badge-blue-fg)', marginBottom: 20, opacity: 0.9 }}>
        Ves a <strong>Execucions</strong> per monitoritzar el progres i <strong>Resultats</strong> per veure les metriques en viu.
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Tanca</button>
        <button onClick={() => { window.location.href = '/resultats'; }} style={{ ...S.btn, fontSize: 13 }}>
          Veure Resultats
        </button>
        <button onClick={() => { window.location.href = '/execucions'; }} style={{ ...S.btnPrimary, fontSize: 13 }}>
          Veure Execucions
        </button>
      </div>
    </div></div>
  );

  return (
    <div style={overlay}><div style={card}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Desplegament fallit</h3>
      <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid var(--error)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--error)' }}>{error}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ ...S.btn, fontSize: 13 }}>Tanca</button>
        <button onClick={() => setState('confirm')} style={{ ...S.btnPrimary, fontSize: 13, background: 'var(--warning)', boxShadow: 'none' }}>Torna a intentar</button>
      </div>
    </div></div>
  );
};

// Toast
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const c = {
    success: { bg: 'rgba(34,197,94,0.12)',  border: 'var(--success)', color: 'var(--success)' },
    error:   { bg: 'rgba(220,38,38,0.12)',  border: 'var(--error)',   color: 'var(--error)' },
    info:    { bg: 'var(--badge-blue-bg)',  border: 'var(--accent)',  color: 'var(--accent)' },
  }[type];
  return (
    <div role="alert" aria-live="polite"
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, background: c.bg, border: `1px solid ${c.border}`, color: c.color, padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)', maxWidth: 360, animation: 'fadeUp 0.2s ease', fontFamily: 'var(--font)' }}
    >
      {message}
    </div>
  );
};

// Detall d'escenari (modal overlay)
const ScenarioDetail = ({ scenario, onClose, onExecute, onStop, onEdit, onDelete, onDuplicate, isRunning }: {
  scenario: Scenario; onClose: () => void; onExecute: () => void; onStop: () => void;
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void; isRunning: boolean;
}) => {
  const status    = STATUS_CONFIG[scenario.status || 'idle'] || STATUS_CONFIG.idle;
  const dfColor   = DATA_FORMAT_COLORS[scenario.dataFormat || 'default'] || DATA_FORMAT_COLORS['default'];
  const dfLabel   = DATA_FORMAT_LABELS[scenario.dataFormat || 'default'] || 'Per defecte';
  const platName  = normalizePlatform(scenario.platform || scenario.broker);
  const platColor = PLATFORM_COLORS[platName] || 'var(--text-secondary)';
  const runPlan = getScenarioRunPlan(scenario);
  const isLegacyIndefinite = runPlan.isLegacyIndefinite;
  const isSustained = runPlan.duration === SUSTAINED_MODE_DURATION_SECONDS;

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.backdrop) onClose();
  };

  const Section = ({ title }: { title: string }) => (
    <div style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 8, marginTop: 4 }}>{title}</div>
  );

  const Row = ({ label, value, badge }: { label: string; value?: string; badge?: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
      {badge ?? <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>{value || '-'}</span>}
    </div>
  );

  return (
    <div data-backdrop="1" onClick={handleBackdropClick}
      style={{ position: 'fixed', inset: 0, zIndex: 3200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: '88px 20px 28px' }}
    >
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: 'var(--shadow-lg)', animation: 'fadeUp 0.2s ease', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
              <span style={{ background: isRunning ? 'rgba(59,130,246,0.1)' : status.bg, color: isRunning ? '#3b82f6' : status.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {isRunning && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'pulseDot 1.5s ease infinite' }} />}
                {isRunning ? 'En execució' : status.label}
              </span>
              {isSustained && (
                <span style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Mode sostingut
                </span>
              )}
              {scenario.predefined && (
                <span style={{ background: 'var(--bg-hover)', color: 'var(--text-disabled)', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>Sistema</span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', wordBreak: 'break-word' as const }}>{scenario.name || 'Sense nom'}</h3>
          </div>
          <button onClick={onClose} aria-label="Tancar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, borderRadius: 8, flexShrink: 0, marginLeft: 12, transition: 'background 0.15s' }}>
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {/* Left column */}
          <div>
            <Section title="Configuració tècnica" />
            <Row label="Arquitectura" badge={<span style={{ ...S.badge(ARCHITECTURE_COLORS[scenario.architecture] || '#2563eb'), fontSize: 10 }}>{scenario.architecture || '-'}</span>} />
            <Row label="Protocol"     badge={<span style={{ ...S.badge(PROTOCOL_COLORS[scenario.protocol] || '#16a34a'), fontSize: 10 }}>{scenario.protocol || '-'}</span>} />
            <Row label="Plataforma"   badge={platName ? <span style={{ ...S.badge(platColor), fontSize: 10 }}>{platName}</span> : undefined} value={platName ? undefined : '-'} />
            <Row label="Format dades" badge={<span style={{ ...S.badge(dfColor), fontSize: 10 }}>{dfLabel}</span>} />
          </div>

          {/* Right column */}
          <div>
            <Section title="Paràmetres d'execució" />
            <Row
              label="Durada"
              badge={isSustained
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>{formatDurationFriendly(runPlan.duration)}</span>
                : undefined}
              value={!isSustained ? formatDurationFriendly(runPlan.duration) : undefined}
            />
            <Row label="Ràtio"
              badge={runPlan.usesRecommendedRate
                ? <span style={{ fontSize: 12, color: 'var(--text-disabled)', fontStyle: 'italic' }}>{runPlan.rate} msg/s recomanat</span>
                : undefined}
              value={!runPlan.usesRecommendedRate ? `${runPlan.rate} msg/s` : undefined}
            />
            <Row label="Payload"
              badge={runPlan.usesRecommendedPayload
                ? <span style={{ fontSize: 12, color: 'var(--text-disabled)', fontStyle: 'italic' }}>{formatBytesFriendly(runPlan.payloadSize)} recomanat</span>
                : undefined}
              value={!runPlan.usesRecommendedPayload ? formatBytesFriendly(runPlan.payloadSize) : undefined}
            />
            <Row label="Creat" value={scenario.createdAt ? new Date(scenario.createdAt).toLocaleDateString(getCurrentLocale()) : '-'} />
          </div>
        </div>

        {/* Sustained mode notice */}
        {(isSustained || isLegacyIndefinite) && (
          <div style={{ margin: '0 24px 8px', padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent)' }}>Mode sostingut:</strong>{' '}
            {isLegacyIndefinite
              ? 'Aquest escenari ve del mode antic sense limit, pero ara s\'executara amb limit d\'1 hora per evitar despesa accidental.'
              : 'Aquest escenari esta configurat amb una prova llarga i finita d\'1 hora.'}
            {' '}El format <strong>{dfLabel}</strong> aplica {runPlan.rate} msg/s i {formatBytesFriendly(runPlan.payloadSize)} per missatge.
          </div>
        )}

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
          <button onClick={onDuplicate} style={{ ...S.btn, fontSize: 13, color: 'var(--accent)', borderColor: 'rgba(37,99,235,0.35)', background: 'rgba(37,99,235,0.07)' }}><DuplicateIcon /> Duplicar</button>
          <button onClick={onEdit}      style={{ ...S.btn, fontSize: 13 }}><EditIcon /> Editar</button>
          <button onClick={onDelete}    style={{ ...S.btn, fontSize: 13, color: 'var(--error)', borderColor: 'var(--error)' }}><TrashIcon /> Eliminar</button>
          <div style={{ flex: 1 }} />
          {isRunning ? (
            <button onClick={() => { onStop(); onClose(); }}
              style={{ ...S.btn, fontSize: 13, background: 'rgba(239,68,68,0.1)', borderColor: 'var(--error)', color: 'var(--error)' }}>
              <StopIcon /> Aturar execució
            </button>
          ) : (
            // Boto principal del detall: verd brillant per ressaltar l'accio.
            <button
              onClick={() => { onExecute(); onClose(); }}
              style={{
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #16a34a',
                background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34,197,94,0.35)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                fontFamily: 'var(--font)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(34,197,94,0.45)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(34,197,94,0.35)';
              }}
            >
              <PlayIcon /> Executar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const GUIDE_ITEMS = [
  {
    color: '#2563eb',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    titleKey: 'scenarios.guide.items.structure.title',
    descKey: 'scenarios.guide.items.structure.desc',
    title: 'Estructura d\'un escenari',
    desc: 'Cada escenari combina una Plataforma (broker), una Arquitectura de missatgeria i un Protocol de transport. Selecciona\'ls en ordre: la plataforma filtra automàticament les arquitectures i protocols compatibles.',
  },
  {
    color: '#16a34a',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    titleKey: 'scenarios.guide.items.parameters.title',
    descKey: 'scenarios.guide.items.parameters.desc',
    title: 'Paràmetres d\'execució',
    desc: 'La Durada (en segons) controla quant temps corre el benchmark. El Ràtio (msg/s) és la taxa d\'enviament. El Payload (bytes) és la mida de cada missatge. Junts, determinen la càrrega total sobre el clúster AKS.',
  },
  {
    color: '#2563eb',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    titleKey: 'scenarios.guide.items.sustained.title',
    descKey: 'scenarios.guide.items.sustained.desc',
    title: 'Mode sostingut',
    desc: 'El mode sostingut substitueix el vell mode indefinit: sempre queda limitat a 1 hora i aplica una ràtio i un payload recomanats segons format, plataforma, arquitectura i protocol.',
  },
  {
    color: '#7c3aed',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
    titleKey: 'scenarios.guide.items.formats.title',
    descKey: 'scenarios.guide.items.formats.desc',
    title: 'Formats de dades',
    desc: 'El Format de dades simula càrregues reals. Base controlada: 256 B. Vídeo 4K: 500 KB. Vídeo 8K: 2 MB. Financer: missatges JSON petits. IoT: telemetria mínima d\'alta freqüència.',
  },
];

const ScenarioGuide = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const steps = [
    { n: '1', label: t('scenarios.guide.steps.platform.label'), sub: t('scenarios.guide.steps.platform.sub'), color: '#2563eb' },
    { n: '2', label: t('scenarios.guide.steps.architecture.label'), sub: t('scenarios.guide.steps.architecture.sub'), color: '#7c3aed' },
    { n: '3', label: t('scenarios.guide.steps.load.label'), sub: t('scenarios.guide.steps.load.sub'), color: '#16a34a' },
    { n: '4', label: t('scenarios.guide.steps.execute.label'), sub: t('scenarios.guide.steps.execute.sub'), color: '#f59e0b' },
    { n: '5', label: t('scenarios.guide.steps.results.label'), sub: t('scenarios.guide.steps.results.sub'), color: '#22c55e' },
  ];
  return (
    <GuidePanel
      title={t('scenarios.guide.how')}
      subtitle={t('scenarios.guide.subtitle')}
      open={open}
      onToggle={() => setOpen(o => !o)}
      showLabel={t('scenarios.guide.show')}
      hideLabel={t('scenarios.guide.hide')}
      marginBottom={24}
    >
      <GuideStepFlow steps={steps} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {GUIDE_ITEMS.map(item => (
          <GuideItemCard key={item.titleKey} title={t(item.titleKey)} text={t(item.descKey)} color={item.color} icon={item.icon} />
        ))}
      </div>

      <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
          {t('scenarios.guide.compatSummary')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
          {Object.entries(COMPATIBILITY).map(([platform, config]) => {
            const color = PLATFORM_COLORS[platform] || 'var(--accent)';
            return (
              <div key={platform} style={{ background: 'var(--bg-card)', border: `1px solid ${color}35`, borderRadius: 8, padding: '9px 10px' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color, marginBottom: 5 }}>{platform}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {t('scenarios.guide.architectures')}: <strong style={{ color: 'var(--text-primary)' }}>{config.architectures.join(', ')}</strong><br />
                  {t('scenarios.guide.protocols')}: <strong style={{ color: 'var(--text-primary)' }}>{config.protocols.join(', ')}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--accent)' }}>{t('scenarios.guide.tipLabel')}:</strong>{' '}
        {t('scenarios.guide.tipPrefix')} <strong style={{ color: 'var(--text-primary)' }}>{t('scenarios.guide.tipHighlight')}</strong> {t('scenarios.guide.tipSuffix')}
      </div>
    </GuidePanel>
  );
};

// ScenariosPage
/**
 * ScenariosPage -- Pagina principal de gestio d'escenaris.
 *
 * Estat local:
 *   scenarios:        llista de tots els escenaris del scenario-service
 *   loading:          true mentre carrega la llista inicial
 *   error:            missatge d'error si la peticio falla
 *   filterArch/Proto/Platform/DataFormat: filtres actius per la taula
 *   hoveredRow:       index de la fila amb mouse damunt
 *   selectedScenario: escenari seleccionat (mostra panell de detall lateral)
 *   showModal:        true quan el modal crear/editar esta obert
 *   editScenario:     dades inicials del modal (null=crear, objecte=editar)
 *   deleteTarget:     escenari pendent d'eliminacio (mostra modal confirm)
 *   executeTarget:    escenari pendent d'execució (mostra modal ExecuteModal)
 *   toast:            notificacio temporal (desapareix als 4s)
 *   runningMap:       mapa scenarioId -> runId dels runs actius al cluster
 *                     (actualitzat cada 6s per polling a l'orquestrador)
 *   sortKey/sortDir:  columna i direccio d'ordenacio actuals
 *   selectedIds:      set d'IDs seleccionats per execució en lot (bulk)
 *   bulkExecuting:    true mentre s'estan llançant els escenaris en lot
 *   searchQuery:      text de cerca sobre nom/arquitectura/protocol/plataforma
 */
export const ScenariosPage = () => {
  const { t } = useTranslation();
  const [scenarios,        setScenarios]        = useState<Scenario[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [filterArch,       setFilterArch]       = useState('all');
  const [filterProto,      setFilterProto]      = useState('all');
  const [filterPlatform,   setFilterPlatform]   = useState('all');
  const [filterDataFormat, setFilterDataFormat] = useState('all');
  const [hoveredRow,       setHoveredRow]       = useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [showModal,        setShowModal]        = useState(false);
  const [editScenario,     setEditScenario]     = useState<any | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<Scenario | null>(null);
  const [executeTarget,    setExecuteTarget]    = useState<Scenario | null>(null);
  const [toast,            setToast]            = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  // runningMap: clau=scenarioId, valor=runId de l'execució activa.
  // S'usa per saber quins escenaris estan corrent ara mateix sense
  // haver de consultar el scenario-service (que no te aquesta info).
  const [runningMap,       setRunningMap]       = useState<Record<string, string>>({});
  const [sortKey,          setSortKey]          = useState<string | null>('createdAt');
  const [sortDir,          setSortDir]          = useState<SortDir | null>('desc');
  // selectedIds: set per a execució en lot. Nomes escenaris no en execució.
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
  const [bulkExecuting,    setBulkExecuting]    = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');

  const handleSort = (sk: string) => {
    if (sortKey !== sk) { setSortKey(sk); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null); setSortDir(null);
  };

  useEffect(() => { document.title = t('scenarios.pageTitle'); }, [t]);

  /**
   * Carrega el mapa d'execucións actives des de l'orquestrador.
   * Filtra nomes els runs amb status 'running' o 'pending' i construeix
   * un mapa scenarioId -> runId per poder identificar rapidament quins
   * escenaris estan en execució sense fer N peticions individuals.
   *
   * S'executa en muntar el component i cada 6s (polling lleuger).
   * 6s es un bon balanç: prou rapid per detectar canvis d'estat,
   * prou lent per no saturar l'orquestrador amb peticions.
   */
  const fetchRunningMap = useCallback(() => {
    fetch(`${ORCHESTRATOR}/runs`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.filter(r => r.status === 'running' || r.status === 'pending')
              .forEach(r => { if (r.scenarioId) map[r.scenarioId] = r.id; });
          setRunningMap(map);
        }
      })
      .catch(() => {}); // errors silenciosos: si falla no afecta la UI principal
  }, []);

  useEffect(() => {
    fetchRunningMap();
    const i = setInterval(fetchRunningMap, 6000); // polling cada 6s
    return () => clearInterval(i); // cleanup en desmuntar per evitar memory leaks
  }, [fetchRunningMap]);

  /**
   * Suport per a deep-linking des d'altres pagines:
   * /escenaris?create=true&name=X&architecture=Y&...
   * Obre el modal de creacio pre-omplert amb els parametres de la URL.
   * S'usa des de CatalogPage ("Crear escenari") i HomePage.
   * Un cop llegits els params, es neteja la URL per evitar re-obertures.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('create') === 'true') {
      setShowModal(true);
      const prefill = {
        name: params.get('name') || '', architecture: params.get('architecture') || '',
        protocol: params.get('protocol') || '', platform: params.get('platform') || '',
        duration: params.get('duration') || '', rate: params.get('rate') || '',
        payloadSize: params.get('payloadSize') || '', dataFormat: '',
      };
      // _prefill: flag intern per indicar que es un formulari pre-omplert
      // sense ID, aixi el modal sap que es crear (no editar)
      if (prefill.name) setEditScenario({ ...prefill, _prefill: true });
      window.history.replaceState({}, '', '/escenaris'); // neteja URL
    }
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    fetch(`${API_BASE}/scenarios`).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
      .then(sc => { setScenarios(Array.isArray(sc) ? sc : []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshScenariosSilently = useCallback(() => {
    fetch(`${API_BASE}/scenarios`).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
      .then(sc => {
        if (!Array.isArray(sc)) return;
        setScenarios(sc);
        setSelectedScenario(prev => prev?.id ? (sc.find(item => item.id === prev.id) || prev) : prev);
      })
      .catch(() => {});
  }, []);

  const handleScenarioSaved = useCallback((savedScenario: Scenario, mode: 'create' | 'edit') => {
    setScenarios(prev => {
      const exists = prev.some(s => s.id && s.id === savedScenario.id);
      if (exists) return prev.map(s => s.id === savedScenario.id ? { ...s, ...savedScenario } : s);
      return [savedScenario, ...prev];
    });
    setSelectedScenario(savedScenario);
    setShowModal(false);
    setEditScenario(null);
    setToast({ message: mode === 'edit' ? 'Escenari actualitzat.' : 'Escenari creat.', type: 'success' });
    window.setTimeout(refreshScenariosSilently, 600);
  }, [refreshScenariosSilently]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const r = await fetch(`${API_BASE}/scenarios/${deleteTarget.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (selectedScenario?.id === deleteTarget.id) setSelectedScenario(null);
      setScenarios(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      window.setTimeout(refreshScenariosSilently, 600);
      setToast({ message: 'Escenari eliminat.', type: 'info' });
    } catch (e: any) { setToast({ message: 'Error: ' + e.message, type: 'error' }); setDeleteTarget(null); }
  };

  const handleDuplicate = async (s: Scenario) => {
    const copy = {
      name: `${s.name} (còpia)`,
      architecture: s.architecture,
      protocol: s.protocol,
      platform: normalizePlatform(s.platform || s.broker),
      duration: s.duration,
      rate: s.rate,
      payloadSize: s.payloadSize,
      dataFormat: s.dataFormat || 'default',
      predefined: false,
      status: 'idle',
    };
    try {
      const r = await fetch(`${API_BASE}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const created = await r.json().catch(() => copy);
      setScenarios(prev => [created, ...prev]);
      setSelectedScenario(created);
      window.setTimeout(refreshScenariosSilently, 600);
      setToast({ message: `Còpia de "${s.name}" creada.`, type: 'success' });
    } catch (e: any) {
      setToast({ message: 'Error en duplicar: ' + e.message, type: 'error' });
    }
  };

  const handleStopScenario = async (scenario: Scenario) => {
    const runId = runningMap[scenario.id!];
    if (!runId) return;
    try {
      await fetch(`${ORCHESTRATOR}/runs/${runId}/cancel`, { method: 'POST' });
      // Optimistic: remove from running map immediately
      setRunningMap(prev => { const next = { ...prev }; delete next[scenario.id!]; return next; });
      setToast({ message: `Escenari "${scenario.name}" aturat.`, type: 'info' });
      setTimeout(fetchRunningMap, 2000);
    } catch (e: any) { setToast({ message: 'Error en aturar: ' + e.message, type: 'error' }); }
  };

  /**
   * Actualitzacio optimista quan un escenari acaba de llançar-se.
   * Afegeix immediatament el nou run al mapa sense esperar el proper
   * polling (millor UX: l'indicador verd apareix a l'instant).
   * Despres de 2s i 5s es confirma l'estat real amb l'orquestrador
   * per assegurar consistencia si hi ha delays de Kubernetes.
   */
  const handleScenarioStarted = (scenarioId: string, runId: string) => {
    setRunningMap(prev => ({ ...prev, [scenarioId]: runId }));
    setTimeout(fetchRunningMap, 2000); // confirma despres del primer heartbeat
    setTimeout(fetchRunningMap, 5000); // reconfirma quan el pod esta arrencat
  };

  // Seleccio per a execució en lot
  /** Toggle de seleccio d'un escenari individual per a execució en lot. */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    const nonRunning = sortedFiltered.filter(s => s.id && !runningMap[s.id!]);
    const allSelected = nonRunning.every(s => selectedIds.has(s.id!));
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (allSelected) { nonRunning.forEach(sc => s.delete(sc.id!)); }
      else { nonRunning.forEach(sc => s.add(sc.id!)); }
      return s;
    });
  };

  /**
   * Execucio en lot: llança tots els escenaris seleccionats sequencialment.
   * Per que sequencial i no concurrent?
   *   - Cada llançament crea un namespace i un Job a Kubernetes.
   *   - Llançar molts Jobs alhora pot sobrecarregar el control plane d'AKS.
   *   - 800ms de delay entre llançaments dona temps a l'API server per processar.
   * Nomes s'executen escenaris no en execució (runningMap filtra els actius).
   */
  const handleBulkExecute = async () => {
    const toExecute = sortedFiltered.filter(s => s.id && selectedIds.has(s.id!) && !runningMap[s.id!]);
    if (toExecute.length === 0) return;
    setBulkExecuting(true);
    let okCount = 0, errCount = 0;
    for (const sc of toExecute) {
      try {
        const r = await fetch(`${ORCHESTRATOR}/runs`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildRunRequestBody(sc)),
        });
        if (r.ok) {
          const data = await r.json();
          handleScenarioStarted(sc.id!, data.runId || data.id || '');
          okCount++;
        } else { errCount++; }
      } catch { errCount++; }
      // Delay entre llançaments per no sobrecarregar l'API server de Kubernetes
      await new Promise(r => setTimeout(r, 800));
    }
    setBulkExecuting(false);
    setSelectedIds(new Set());
    fetchRunningMap();
    refreshScenariosSilently();
    if (errCount === 0) {
      setToast({ message: `${okCount} escenari${okCount > 1 ? 's' : ''} executat${okCount > 1 ? 's' : ''} correctament!`, type: 'success' });
    } else {
      setToast({ message: `${okCount} executats, ${errCount} errors.`, type: 'error' });
    }
  };

  const openEdit = (s: Scenario) => {
    setEditScenario({
      id: s.id, createdAt: s.createdAt,
      name: s.name || '', architecture: s.architecture || '',
      protocol: s.protocol || '', platform: normalizePlatform(s.platform || s.broker) || '',
      duration: s.duration != null ? String(s.duration) : '',
      rate: s.rate != null ? String(s.rate) : '',
      payloadSize: s.payloadSize != null ? String(s.payloadSize) : '',
      dataFormat: s.dataFormat || '',
    });
    setShowModal(true);
  };

  const openPreset = (preset: typeof PREDEFINED_PRESETS[0]) => {
    setEditScenario({
      ...EMPTY_FORM,
      _prefill: true,
      name:         preset.name,
      platform:     preset.platform,
      architecture: preset.architecture,
      protocol:     preset.protocol,
      dataFormat:   preset.dataFormat,
      duration:     preset.duration,
      rate:         preset.rate,
      payloadSize:  preset.payloadSize,
    });
    setShowModal(true);
  };

  const filtered = scenarios.filter(s => {
    if (isHiddenLegacyScenario(s)) return false;
    if (filterArch       !== 'all' && s.architecture !== filterArch)                             return false;
    if (filterProto      !== 'all' && s.protocol     !== filterProto)                            return false;
    if (filterPlatform   !== 'all' && normalizePlatform(s.platform || s.broker) !== filterPlatform) return false;
    if (filterDataFormat !== 'all' && (s.dataFormat || 'default') !== filterDataFormat)          return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const name = (s.name || '').toLowerCase();
      const arch = (s.architecture || '').toLowerCase();
      const prot = (s.protocol || '').toLowerCase();
      const plat = normalizePlatform(s.platform || s.broker).toLowerCase();
      const formatKey = s.dataFormat || 'default';
      const format = `${formatKey} ${DATA_FORMAT_LABELS[formatKey] || ''}`.toLowerCase();
      if (!name.includes(q) && !arch.includes(q) && !prot.includes(q) && !plat.includes(q) && !format.includes(q)) return false;
    }
    return true;
  });
  const isFiltered = filterArch !== 'all' || filterProto !== 'all' || filterPlatform !== 'all' || filterDataFormat !== 'all' || searchQuery.trim() !== '';

  // Ordenacio de la taula
  // Per defecte la taula s'ordena per data de creacio descendent (l'escenari
  // mes nou apareix a dalt de tot). L'usuari pot canviar l'ordre clicant
  // qualsevol capçalera; tornem a aplicar la mateixa logica:
  //   - Camps de data (createdAt): comparem com a timestamps numerics
  //   - Camps numerics: resta directe
  //   - Camps de text: localeCompare amb idioma catala
  const sortedFiltered = sortKey == null
    ? filtered
    : [...filtered].sort((a, b) => {
        const av = (a as any)[sortKey] ?? '';
        const bv = (b as any)[sortKey] ?? '';
        let cmp = 0;
        // Tractem les dates explicitament per evitar bugs amb cadenes buides
        if (sortKey === 'createdAt') {
          const ta = av ? new Date(String(av)).getTime() : 0;
          const tb = bv ? new Date(String(bv)).getTime() : 0;
          cmp = ta - tb;
        } else if (typeof av === 'number' && typeof bv === 'number') {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv), 'ca');
        }
        return sortDir === 'desc' ? -cmp : cmp;
      });

  const formatTime = (iso: string) =>
    !iso ? '-' : new Date(iso).toLocaleString(getCurrentLocale(), { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  const modalInitial = editScenario?._prefill
    ? { ...EMPTY_FORM, ...editScenario }
    : editScenario ?? EMPTY_FORM;
  const modalMode = editScenario?.id && !editScenario._prefill ? 'edit' : 'create';

  const activeFiltersCount = [filterArch, filterProto, filterPlatform, filterDataFormat].filter(f => f !== 'all').length + (searchQuery.trim() ? 1 : 0);

  const FILTER_DEFS = [
    {
      label: t('scenarios.filters.format'),
      value: filterDataFormat,
      options: ['default', 'video-4k', 'video-8k', 'financial', 'iot'].map(value => ({
        value,
        label: DATA_FORMAT_LABELS[value] || value,
      })),
      onChange: setFilterDataFormat,
      allLabel: t('scenarios.filterAllFormats'),
      accentColor: 'var(--accent)',
      minWidth: 185,
    },
    {
      label: t('scenarios.filters.platform'),
      value: filterPlatform,
      options: ALL_PLATFORMS.filter(platform => !DISABLED_PLATFORMS.includes(platform)).map(value => ({ value, label: value })),
      onChange: setFilterPlatform,
      allLabel: t('scenarios.filterAllPlatforms'),
      accentColor: CATEGORY_COLORS.platform,
      minWidth: 150,
    },
    {
      label: t('scenarios.filters.protocol'),
      value: filterProto,
      options: ALL_PROTOCOLS.map(value => ({ value, label: value })),
      onChange: setFilterProto,
      allLabel: t('scenarios.filterAll'),
      accentColor: CATEGORY_COLORS.protocol,
      minWidth: 135,
    },
    {
      label: t('scenarios.filters.architecture'),
      value: filterArch,
      options: ALL_ARCHITECTURES.map(value => ({ value, label: value })),
      onChange: setFilterArch,
      allLabel: t('scenarios.filterAllArchitectures'),
      accentColor: CATEGORY_COLORS.architecture,
      minWidth: 145,
    },
  ];

  return (
    <div style={{ ...S.page, maxWidth: 1340 }}>
      <GlobalBenchmarkStyles />
      {showModal     && <ScenarioModal mode={modalMode as 'create' | 'edit'} initial={modalInitial} onClose={() => { setShowModal(false); setEditScenario(null); }} onSaved={handleScenarioSaved} />}
      {deleteTarget  && <DeleteModal name={deleteTarget.name || 'aquest escenari'} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} />}
      {executeTarget && <ExecuteModal scenario={executeTarget} onStarted={handleScenarioStarted} onClose={() => { setExecuteTarget(null); refreshScenariosSilently(); fetchRunningMap(); }} />}
      {toast         && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Capçalera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{t('scenarios.heading')}</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 15 }}>
            {t('scenarios.subtitle')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <TutorialButton page="scenarios" createExampleHref={DEMO_SCENARIO_URL} />
          <button onClick={() => { setEditScenario(null); setShowModal(true); }} style={{ ...S.btnPrimary, whiteSpace: 'nowrap' }}>
            <PlusIcon /> {t('scenarios.actions.new')}
          </button>
        </div>
      </div>

      {/* Resum curt: total d'escenaris i quants estan en execucio. */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: t('scenarios.stats.total'), value: scenarios.length,              color: 'var(--text-secondary)', bg: 'var(--bg-card)' },
            { label: t('scenarios.stats.running'), value: Object.keys(runningMap).length, color: '#3b82f6',               bg: 'rgba(59,130,246,0.08)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color, letterSpacing: '-0.02em' }}>{s.value}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* -- Guia -- */}
      <ScenarioGuide />

      {/* -- Escenaris Predefinits -- */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {t('scenarios.presets.heading')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(255px, 1fr))', gap: 12 }}>
          {PREDEFINED_PRESETS.map((preset, i) => {
            const dfColor = DATA_FORMAT_COLORS[preset.dataFormat] || '#6b7280';
            const warmupSec = Number(preset.warmup || 120);
            const measureSec = Math.max(0, Number(preset.duration) - warmupSec);
            return (
              <button
                key={i}
                onClick={() => openPreset(preset)}
                style={{
                  background:   'var(--bg-card)',
                  border:       `1px solid var(--border)`,
                  borderTop:    `3px solid ${preset.color}`,
                  borderRadius: 10,
                  padding:      '16px',
                  textAlign:    'left',
                  cursor:       'pointer',
                  fontFamily:   'var(--font)',
                  transition:   'all 0.18s ease',
                  display:      'flex',
                  flexDirection: 'column' as const,
                  gap:          8,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${preset.color}18`;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.borderColor = preset.color + '50';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{t(preset.nameKey)}</span>
                  <span style={{ ...S.badge(dfColor), fontSize: 10, flexShrink: 0, marginLeft: 6 }}>
                    {t(`scenarios.dataFormatShort.${preset.dataFormat}`) !== `scenarios.dataFormatShort.${preset.dataFormat}` ? t(`scenarios.dataFormatShort.${preset.dataFormat}`) : DATA_FORMAT_LABELS[preset.dataFormat] || preset.dataFormat}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {t(preset.descKey)}
                </p>
                <div
                  title={t('scenarios.warmup.tooltip')}
                  style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700 }}
                >
                  {t('scenarios.warmup.label')}: {formatDurationFriendly(warmupSec)} · {t('scenarios.warmup.measure')}: {formatDurationFriendly(measureSec)}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ ...S.badge(PLATFORM_COLORS[preset.platform] || '#666'), fontSize: 10 }}>{preset.platform}</span>
                  <span style={{ ...S.badge(ARCHITECTURE_COLORS[preset.architecture] || '#666'), fontSize: 10 }}>{preset.architecture}</span>
                  <span style={{ ...S.badge(PROTOCOL_COLORS[preset.protocol] || '#666'), fontSize: 10 }}>{preset.protocol}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '8px 9px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{t('scenarios.detail.labelDuration')}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{formatDurationFriendly(Number(preset.duration))}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{t('scenarios.detail.labelRate')}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{preset.rate} msg/s</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Payload</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>{formatBytesFriendly(Number(preset.payloadSize))}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: preset.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <PlusIcon /> {t('scenarios.presets.btnUse')}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* -- Filtres millorats -- */}
      <FilterPanel
        title={t('scenarios.filters.title')}
        activeFilterCount={activeFiltersCount}
        visibleCount={loading ? 0 : filtered.length}
        totalCount={scenarios.length}
        searchValue={searchQuery}
        searchPlaceholder={t('scenarios.filters.searchPlaceholder')}
        visibleLabel={(visible, total) => `${visible} ${t('catalog.filters.visibleOf')} ${total}`}
        clearSearchLabel={t('catalog.filters.clearSearch')}
        clearFiltersLabel={t('catalog.filters.clearAll')}
        onSearchChange={setSearchQuery}
        onClearFilters={() => { setFilterArch('all'); setFilterProto('all'); setFilterPlatform('all'); setFilterDataFormat('all'); setSearchQuery(''); }}
      >
        {FILTER_DEFS.map(({ label, value, options, onChange, allLabel, accentColor, minWidth }) => (
          <FilterSelect
            key={label}
            label={label}
            value={value}
            onChange={onChange}
            minWidth={minWidth}
            accentColor={accentColor}
            options={[{ value: 'all', label: allLabel }, ...options]}
          />
        ))}
      </FilterPanel>

      {/* Taula + Detall */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ ...S.card, padding: 0, overflow: 'hidden', flex: selectedScenario ? '0 0 auto' : 1, width: selectedScenario ? 'calc(100% - 340px)' : '100%' }}>
          <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{loading ? '-' : filtered.length}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>escenari{filtered.length !== 1 ? 's' : ''}</span>
              {isFiltered && !loading && (
                <span style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 10 }}>
                  de {scenarios.length} totals
                </span>
              )}
              {Object.keys(runningMap).length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulseDot 1.5s ease infinite' }} />
                  {Object.keys(runningMap).length} en execució
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Bulk execute bar */}
              {selectedIds.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>
                    {selectedIds.size} seleccionat{selectedIds.size !== 1 ? 's' : ''}
                  </span>
                  <div style={{ width: 1, height: 14, background: 'rgba(34,197,94,0.25)' }} />
                  <button
                    onClick={handleBulkExecute}
                    disabled={bulkExecuting}
                    style={{ ...S.btnPrimary, fontSize: 12, padding: '3px 12px', background: 'var(--success)', boxShadow: 'none', gap: 4, opacity: bulkExecuting ? 0.6 : 1 }}
                  >
                    <PlayIcon /> {bulkExecuting ? 'Executant...' : `Executar ${selectedIds.size}`}
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    style={{ ...S.btn, fontSize: 11, padding: '3px 8px' }}
                  >
                    Cancel·la
                  </button>
                </div>
              )}
              <button onClick={() => fetchData()} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font)' }}>
                <RefreshIcon /> Actualitzar
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--error)', padding: '12px 18px', margin: 0 }}>Error: {error}</p>}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-busy={loading} aria-label="Llista d'escenaris de benchmark">
              <thead>
                <tr style={S.tableHeader}>
                  <th style={{ ...S.th, width: 40, textAlign: 'center', paddingLeft: 12, paddingRight: 4 }}>
                    <button
                      onClick={toggleSelectAll}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Seleccionar/deseleccionar tots"
                    >
                      {(() => {
                        const nonRunning = sortedFiltered.filter(s => s.id && !runningMap[s.id!]);
                        const allSel = nonRunning.length > 0 && nonRunning.every(s => selectedIds.has(s.id!));
                        const someSel = nonRunning.some(s => selectedIds.has(s.id!)) && !allSel;
                        if (someSel) return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.5"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/></svg>;
                        if (allSel) return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--accent)"/><path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                        return <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/></svg>;
                      })()}
                    </button>
                  </th>
                  <SortTh label="Nom"          sk="name"         current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Arquitectura" sk="architecture" current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Protocol"     sk="protocol"     current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Plataforma"   sk="platform"     current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Format"       sk="dataFormat"   current={sortKey} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Estat"        sk="status"       current={sortKey} dir={sortDir} onSort={handleSort} extraStyle={{ textAlign: 'center' }} />
                  <SortTh label="Creat"        sk="createdAt"    current={sortKey} dir={sortDir} onSort={handleSort} extraStyle={{ textAlign: 'right' }} />
                  <th style={{ ...S.th, textAlign: 'center', width: 130 }}>Accions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} delay={i * 0.08} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 60, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <EmptyIcon />
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{t('scenarios.table.emptyShort')}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {isFiltered ? t('scenarios.table.emptyFiltered') : t('scenarios.table.emptyCreate')}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : sortedFiltered.map((s, i) => {
                  const st         = STATUS_CONFIG[s.status || 'idle'] || STATUS_CONFIG.idle;
                  const isRunning  = !!runningMap[s.id!];
                  const dfColor    = DATA_FORMAT_COLORS[s.dataFormat || 'default'] || '#6b7280';
                  const dfLabel    = DATA_FORMAT_LABELS[s.dataFormat || 'default'] || 'Base';
                  const platName   = normalizePlatform(s.platform || s.broker);
                  const platColor  = PLATFORM_COLORS[platName] || 'var(--text-secondary)';
                  const isSelected = selectedScenario?.id === s.id;
                  return (
                    <tr key={s.id || i}
                      style={{
                        ...S.tableRow,
                        background:   isSelected ? 'rgba(37,99,235,0.10)' : hoveredRow === i ? 'var(--bg-hover)' : selectedIds.has(s.id!) ? 'rgba(34,197,94,0.03)' : 'transparent',
                        cursor:       'pointer',
                        borderLeft:   isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                        boxShadow:    isSelected ? 'inset 0 0 0 1px rgba(37,99,235,0.18)' : undefined,
                        transition:   'all 0.15s ease',
                      }}
                      onMouseEnter={() => setHoveredRow(i)} onMouseLeave={() => setHoveredRow(null)}
                      onClick={() => setSelectedScenario((prev: Scenario | null) => prev?.id === s.id ? null : s)}
                    >
                      {/* Checkbox */}
                      <td style={{ ...S.td, width: 40, paddingLeft: 12, paddingRight: 4, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        {!isRunning && s.id && (
                          <button
                            onClick={() => toggleSelect(s.id!)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={selectedIds.has(s.id!) ? 'Deseleccionar' : 'Seleccionar'}
                          >
                            {selectedIds.has(s.id!)
                              ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--accent)" stroke="var(--accent)"/><path d="M4 8l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="3" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="1.5"/></svg>}
                          </button>
                        )}
                      </td>
                      <td style={{ ...S.td, fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {isRunning && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, animation: 'pulseDot 1.5s ease infinite' }} />}
                          {s.name || '-'}
                        </div>
                      </td>
                      <td style={S.td}>
                        {s.architecture ? <span style={{ ...S.badge(ARCHITECTURE_COLORS[s.architecture] || '#2563eb'), fontSize: 11 }}>{s.architecture}</span> : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={S.td}>
                        {s.protocol ? <span style={{ ...S.badge(PROTOCOL_COLORS[s.protocol] || '#16a34a'), fontSize: 11 }}>{s.protocol}</span> : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={S.td}>
                        {platName
                          ? <span style={{ ...S.badge(platColor), fontSize: 11 }}>{platName}</span>
                          : <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>-</span>}
                      </td>
                      <td style={S.td}>
                        <span style={{ ...S.badge(dfColor), fontSize: 10 }}>
                          {dfLabel || 'Base'}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <span style={{ background: isRunning ? 'rgba(59,130,246,0.1)' : st.bg, color: isRunning ? '#3b82f6' : st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isRunning && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', animation: 'pulseDot 1.5s ease infinite' }} />}
                          {isRunning ? t('scenarios.stats.running') : st.label}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {formatTime(s.createdAt || '')}
                      </td>
                      <td style={{ ...S.td, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {isRunning ? (
                            <button title="Aturar execució" aria-label={`Aturar execució de ${s.name}`} onClick={() => handleStopScenario(s)}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--error)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--error)' }}>
                              <StopIcon />
                            </button>
                          ) : (
                            <button title="Executar a AKS" aria-label={`Executar ${s.name} a AKS`} onClick={() => setExecuteTarget(s)}
                              style={{ background: '#22c55e', border: '1px solid #16a34a', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontFamily: 'var(--font)', fontSize: 11, fontWeight: 700, transition: 'all 0.18s ease', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(34,197,94,0.35)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#22c55e'; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(34,197,94,0.25)'; }}>
                              <PlayIcon /> Executar
                            </button>
                          )}
                          <button title="Duplicar escenari" aria-label={`Duplicar ${s.name}`} onClick={() => handleDuplicate(s)}
                            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.32)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--accent)' }}>
                            <DuplicateIcon />
                          </button>
                          <button title="Editar" aria-label={`Editar ${s.name}`} onClick={() => openEdit(s)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--text-secondary)' }}>
                            <EditIcon />
                          </button>
                          <button title="Eliminar" aria-label={`Eliminar ${s.name}`} onClick={() => setDeleteTarget(s)}
                            style={{ background: 'none', border: '1px solid var(--error)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', color: 'var(--error)' }}>
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedScenario && (
          <ScenarioDetail
            scenario={selectedScenario}
            isRunning={!!runningMap[selectedScenario.id!]}
            onClose={() => setSelectedScenario(null)}
            onExecute={() => setExecuteTarget(selectedScenario)}
            onStop={() => handleStopScenario(selectedScenario)}
            onEdit={() => openEdit(selectedScenario)}
            onDelete={() => setDeleteTarget(selectedScenario)}
            onDuplicate={() => handleDuplicate(selectedScenario)}
          />
        )}
      </div>
    </div>
  );
};
