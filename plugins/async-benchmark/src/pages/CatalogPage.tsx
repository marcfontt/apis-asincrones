import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation, tRaw } from '../i18n';
import { S, CATEGORY_COLORS } from '../theme';
import { FilterPanel, FilterSelect } from '../components/FilterPanel';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';
import { TutorialButton } from '../components/TutorialOverlay';
import { GuidePanel } from '../components/GuidePanel';
import {
  ALL_PLATFORMS,
  COMPATIBILITY,
  DISABLED_PLATFORMS,
} from '../shared/catalog/compatibility';
import { DEFAULT_CATALOG_COMPONENTS } from '../shared/catalog/defaultComponents';
import {
  getKnownComponentVersion,
  getReproducibilityRows,
  getReproducibilitySnippet,
  getReproducibilityStatus,
  type ReproducibilityStatus,
} from '../shared/catalog/reproducibility';

const API_BASE = '/api/proxy/catalog-service';

const LOCALE_BY_LANGUAGE: Record<string, string> = {
  ca: 'ca-ES',
  es: 'es-ES',
  en: 'en-US',
};

const getLocale = (language: string) => LOCALE_BY_LANGUAGE[language] || 'ca-ES';

type CatalogComponent = {
  id?: string;
  shortName?: string;
  name?: string;
  category?: 'architecture' | 'protocol' | 'platform' | string;
  description?: string;
  version?: string;
  tags?: string[];
  predefined?: boolean;
  createdAt?: string;
};

type CategoryFilter = 'all' | 'architecture' | 'protocol' | 'platform';
type SortKey = 'name' | 'category' | 'version' | 'repro' | 'description';
type SortDir = 'asc' | 'desc' | null;

const CATEGORY_LABELS: Record<string, string> = {
  architecture: 'Arquitectura',
  protocol: 'Protocol',
  platform: 'Plataforma',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  architecture:
    "Patró que descriu com circulen els missatges dins d'un escenari: per esdeveniments, cues, logs o streaming.",
  protocol:
    "Regles de comunicació que indiquen com s'envien i es reben els missatges entre productor, broker i consumidor.",
  platform:
    "Broker o plataforma real desplegada al clúster. És la peça que processa missatges i condiciona els resultats.",
};

const CATEGORY_IMPACTS: Record<string, string> = {
  architecture:
    'Canvia la forma del flux i, per tant, pot afectar latència, desacoblament i capacitat de consum.',
  protocol:
    "Canvia el transport i les confirmacions. Pot afectar compatibilitat, errors, latència i pèrdua de missatges.",
  platform:
    'Canvia la implementació que corre a AKS. Aquí és on versions, ports, topologia i límits importen per replicar.',
};

const CATEGORY_ORDER: CategoryFilter[] = ['all', 'platform', 'protocol', 'architecture'];

const HIDDEN_LEGACY_COMPONENTS = ['pulsar', 'apache pulsar', 'sse', 'server-sent events', 'coap'];

const PLATFORM_DISPLAY_LABELS: Record<string, string> = {
  Kafka: 'Apache Kafka',
  Confluent: 'Redpanda / API Kafka-compatible',
  RabbitMQ: 'RabbitMQ',
  'NATS Server': 'NATS Server',
};

const COMPATIBILITY_NOTES: Record<string, string> = {
  Kafka: 'Referència per logs i streaming. Quan es combini amb protocols que no són Kafka, cal que l’escenari declari clarament el gateway o adaptador.',
  RabbitMQ: 'Fort en cues, ACKs i encaminament flexible. És la plataforma natural per AMQP i proves de treball en cua.',
  Confluent: 'Endpoint Redpanda amb API Kafka. El valor intern Confluent es manté per compatibilitat amb escenaris creats abans.',
  'NATS Server': 'Molt lleuger per pub/sub i baixa latència. Per payloads grans cal verificar max_payload abans de llançar el benchmark.',
};

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);


const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CategoryIcon = ({ category }: { category: string }) => {
  if (category === 'platform') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="6" rx="2" />
        <rect x="3" y="14" width="18" height="6" rx="2" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
        <line x1="7" y1="17" x2="7.01" y2="17" />
      </svg>
    );
  }

  if (category === 'protocol') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  }

  if (category === 'architecture') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
        <path d="M10 6.5h4" />
        <path d="M12 10v4" />
      </svg>
    );
  }

  return <SearchIcon />;
};

const normalizeText = (value: unknown): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const hasCorruptVisibleText = (value: unknown): boolean => {
  const text = String(value || '').trim();
  const compact = text.replace(/\s+/g, '');

  if (!compact) {
    return false;
  }

  // Protegeix la UI de dades corruptes amb caràcters repetits.
  return /(.)\1{24,}/.test(compact) || /compatibles{8,}/i.test(compact);
};

const safeCatalogText = (value: unknown, fallback: string): string => {
  const text = String(value || '').trim();
  if (!text || hasCorruptVisibleText(text)) {
    return fallback;
  }
  return text;
};

const sanitizeCatalogComponent = (component: CatalogComponent): CatalogComponent => {
  const tags = Array.isArray(component.tags)
    ? component.tags.filter(tag => !hasCorruptVisibleText(tag))
    : component.tags;
  const isKafkaCompatibleAlias =
    normalizeText(component.shortName) === 'confluent' ||
    normalizeText(component.name) === 'confluent platform';
  const description = isKafkaCompatibleAlias
    ? 'Endpoint Kafka-compatible del clúster. El codi actual hi arriba amb brokerType=confluent, però el servei desplegat és Redpanda.'
    : hasCorruptVisibleText(component.description) ? '' : component.description;

  return {
    ...component,
    ...(isKafkaCompatibleAlias
      ? {
          name: 'Redpanda / API Kafka-compatible',
          version: undefined,
          tags: ['kafka-compatible', 'redpanda', 'streaming'],
        }
      : {}),
    description,
    tags: isKafkaCompatibleAlias ? ['kafka-compatible', 'redpanda', 'streaming'] : tags,
  };
};

const catalogComponentKeys = (component: CatalogComponent): string[] => {
  const category = String(component.category || '').trim().toLowerCase();
  const names = [component.shortName, component.name]
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  return names.map(name => `${category}:${name}`);
};

const mergeWithDefaultCatalogComponents = (componentsFromApi: CatalogComponent[]): CatalogComponent[] => {
  const visibleKeys = new Set(componentsFromApi.flatMap(catalogComponentKeys));
  const missingDefaults = DEFAULT_CATALOG_COMPONENTS.filter(defaultComponent =>
    catalogComponentKeys(defaultComponent).every(key => !visibleKeys.has(key)),
  );

  return [
    ...componentsFromApi,
    ...missingDefaults.map(sanitizeCatalogComponent),
  ];
};

const componentColor = (component: CatalogComponent): string =>
  CATEGORY_COLORS[component.category || ''] || 'var(--accent)';

const componentCategoryLabel = (
  component: CatalogComponent,
  labels: Record<string, string> = CATEGORY_LABELS,
): string =>
  labels[component.category || ''] || component.category || 'Sense categoria';

const isLegacyComponent = (component: CatalogComponent): boolean => {
  const searchableValues = [
    component.name,
    component.shortName,
    component.description,
    ...(Array.isArray(component.tags) ? component.tags : []),
  ].map(normalizeText);

  return searchableValues.some(value =>
    HIDDEN_LEGACY_COMPONENTS.some(hidden => value.includes(hidden)),
  );
};

const buildScenarioUrl = (component: CatalogComponent): string => {
  const params = new URLSearchParams({ create: 'true' });
  const value = component.shortName || component.name || '';

  if (component.category === 'platform') {
    params.set('platform', value);
  }
  if (component.category === 'protocol') {
    params.set('protocol', value);
  }
  if (component.category === 'architecture') {
    params.set('architecture', value);
  }

  return `/escenaris?${params.toString()}`;
};

const uniqueValues = (values: string[]): string[] =>
  Array.from(new Set(values.filter(Boolean)));

const platformKeyForCompatibility = (component: CatalogComponent): string => {
  const rawValue = component.shortName || component.name || '';
  const normalized = normalizeText(rawValue);
  const aliasMap: Record<string, string> = {
    kafka: 'Kafka',
    'apache kafka': 'Kafka',
    confluent: 'Confluent',
    'confluent platform': 'Confluent',
    rabbitmq: 'RabbitMQ',
    'rabbit mq': 'RabbitMQ',
    nats: 'NATS Server',
    'nats server': 'NATS Server',
  };

  return aliasMap[normalized] || rawValue;
};

type CompatibilityDetailLabels = {
  platformArchitectures: string;
  platformProtocols: string;
  architecturePlatforms: string;
  architectureProtocols: string;
  protocolPlatforms: string;
  protocolArchitectures: string;
};

const getCompatibilityDetails = (component: CatalogComponent, labels: CompatibilityDetailLabels) => {
  const code = component.shortName || component.name || '';

  if (component.category === 'platform') {
    const platform = platformKeyForCompatibility(component);
    const entry = COMPATIBILITY[platform];

    if (!entry) {
      return [];
    }

    return [
      { label: labels.platformArchitectures, values: entry.architectures, color: CATEGORY_COLORS.architecture },
      { label: labels.platformProtocols, values: entry.protocols, color: CATEGORY_COLORS.protocol },
    ];
  }

  if (component.category === 'architecture') {
    const platforms = ALL_PLATFORMS.filter(platform =>
      COMPATIBILITY[platform]?.architectures.includes(code),
    );
    const protocols = uniqueValues(platforms.flatMap(platform => COMPATIBILITY[platform]?.protocols || []));

    return [
      { label: labels.architecturePlatforms, values: platforms, color: CATEGORY_COLORS.platform },
      { label: labels.architectureProtocols, values: protocols, color: CATEGORY_COLORS.protocol },
    ];
  }

  if (component.category === 'protocol') {
    const platforms = ALL_PLATFORMS.filter(platform =>
      COMPATIBILITY[platform]?.protocols.includes(code),
    );
    const architectures = uniqueValues(platforms.flatMap(platform => COMPATIBILITY[platform]?.architectures || []));

    return [
      { label: labels.protocolPlatforms, values: platforms, color: CATEGORY_COLORS.platform },
      { label: labels.protocolArchitectures, values: architectures, color: CATEGORY_COLORS.architecture },
    ];
  }

  return [];
};

const StatusBadge = ({ status }: { status: ReproducibilityStatus }) => {
  const color =
    status === 'Completa'
      ? 'var(--success)'
      : status === 'Parcial'
        ? 'var(--warning)'
        : 'var(--neutral)';

  return <span style={{ ...S.badge(color), fontSize: 11 }}>{status}</span>;
};

const SortHeader = ({
  label,
  sortKey,
  currentKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey | null;
  direction: SortDir;
  onSort: (key: SortKey) => void;
}) => {
  const active = currentKey === sortKey;
  const arrow = !active ? '↕' : direction === 'asc' ? '↑' : '↓';

  return (
    <th style={S.th}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          padding: 0,
          background: 'transparent',
          color: active ? 'var(--accent)' : 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          textTransform: 'inherit',
          letterSpacing: 'inherit',
        }}
      >
        {label}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{arrow}</span>
      </button>
    </th>
  );
};

const CategoryCard = ({
  category,
  title,
  description,
  count,
  active,
  onClick,
}: {
  category: 'architecture' | 'protocol' | 'platform';
  title: string;
  description: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) => {
  const color = CATEGORY_COLORS[category] || 'var(--accent)';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...S.card,
        textAlign: 'left',
        borderTop: `3px solid ${color}`,
        background: active ? `${color}10` : 'var(--bg-card)',
        cursor: 'pointer',
        transition: 'border-color var(--transition), background var(--transition), transform var(--transition)',
      }}
      className="card-hover"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${color}14`,
            border: `1px solid ${color}30`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CategoryIcon category={category} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 850, color }}>
          {count}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {description}
      </p>
    </button>
  );
};

// Guia del catàleg: mostra quines combinacions pot executar el portal.
// Usa el mateix format que la resta de guies.
const CompatibilitySummary = () => {
  const { t, tRaw } = useTranslation();
  const [open, setOpen] = useState(false);
  const compatibilityNotes = (tRaw('catalog.compatibilityNotes') as Record<string, string> | undefined) ?? COMPATIBILITY_NOTES;
  const chip = (value: string, color: string) => (
    <span key={value} style={{ ...S.badge(color), fontSize: 10, padding: '2px 7px' }}>
      {value}
    </span>
  );

  return (
    <GuidePanel
      title={t('catalog.compatTable.heading')}
      subtitle={t('catalog.compatTable.subtitle')}
      open={open}
      onToggle={() => setOpen(value => !value)}
      showLabel={t('scenarios.guide.show')}
      hideLabel={t('scenarios.guide.hide')}
      marginBottom={20}
    >
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={S.tableHeader}>
              <th style={{ ...S.th, width: 170 }}>{t('catalog.compatTable.colPlatform')}</th>
              <th style={S.th}>{t('catalog.compatTable.colArchitectures')}</th>
              <th style={S.th}>{t('catalog.compatTable.colProtocols')}</th>
              <th style={S.th}>{t('catalog.compatTable.colQuickRead')}</th>
            </tr>
          </thead>
          <tbody>
            {ALL_PLATFORMS.map(platform => {
              const entry = COMPATIBILITY[platform];
              const disabled = DISABLED_PLATFORMS.includes(platform);
              const displayName = PLATFORM_DISPLAY_LABELS[platform] || platform;
              return (
                <tr key={platform} style={S.tableRow}>
                  <td style={{ ...S.td, fontWeight: 850 }}>
                    {displayName}
                    {displayName !== platform && (
                      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 3 }}>
                        Valor a Escenaris: {platform}
                      </div>
                    )}
                    {disabled && (
                      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 3 }}>No desplegada</div>
                    )}
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(entry?.architectures || []).map(value => chip(value, CATEGORY_COLORS.architecture))}
                    </div>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(entry?.protocols || []).map(value => chip(value, CATEGORY_COLORS.protocol))}
                    </div>
                  </td>
                  <td style={{ ...S.td, color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.5 }}>
                    {compatibilityNotes[platform] || 'Combinació declarada a la matriu de compatibilitat del portal.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GuidePanel>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '150px minmax(0, 1fr)',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}
  >
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </div>
    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
      {value || '-'}
    </div>
  </div>
);

const ComponentCompatibilityDetails = ({ component }: { component: CatalogComponent }) => {
  const { t } = useTranslation();
  const details = getCompatibilityDetails(component, {
    platformArchitectures: t('catalog.compatDetails.platformArchitectures'),
    platformProtocols: t('catalog.compatDetails.platformProtocols'),
    architecturePlatforms: t('catalog.compatDetails.architecturePlatforms'),
    architectureProtocols: t('catalog.compatDetails.architectureProtocols'),
    protocolPlatforms: t('catalog.compatDetails.protocolPlatforms'),
    protocolArchitectures: t('catalog.compatDetails.protocolArchitectures'),
  });

  if (details.length === 0) {
    return null;
  }

  return (
    <section style={{ ...S.card, boxShadow: 'none', marginTop: 16 }}>
      <div style={{ fontSize: 11, color: componentColor(component), fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {t('catalog.compatDetails.portalTitle')}
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        {t('catalog.compatDetails.portalDescription')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {details.map(group => (
          <div key={group.label} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: 12, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 8 }}>{group.label}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {group.values.length > 0 ? group.values.map(value => (
                <span key={value} style={{ ...S.badge(group.color), fontSize: 10, padding: '2px 7px' }}>
                  {value}
                </span>
              )) : (
                <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>{t('catalog.compatDetails.noExecutable')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const ComponentDetailModal = ({
  component,
  onClose,
}: {
  component: CatalogComponent;
  onClose: () => void;
}) => {
  const { t, language } = useTranslation();
  const locale = getLocale(language);
  const categoryLabels = (tRaw('catalog.categoryLabels') as Record<string, string> | undefined) ?? CATEGORY_LABELS;
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'repro' | 'config'>('overview');
  const color = componentColor(component);
  const label = componentCategoryLabel(component, categoryLabels);
  const version = getKnownComponentVersion(component);
  const reproducibilityRows = getReproducibilityRows(component);
  const reproducibilityChecklist = (tRaw('catalog.modal.reproChecklist') as string[] | undefined) ?? [];
  const snippet = getReproducibilitySnippet(component);
  const scenarioUrl = buildScenarioUrl(component);
  const typedComponent = component as CatalogComponent & {
    license?: string;
    language?: string;
    maintainer?: string;
    useCases?: string[] | string;
  };
  const useCases = Array.isArray(typedComponent.useCases)
    ? typedComponent.useCases.join(', ')
    : typedComponent.useCases || (Array.isArray(component.tags) ? component.tags.join(', ') : '-');
  const overviewFields = [
    { label: t('catalog.modal.fields.version'), value: version || '-' },
    { label: t('catalog.modal.fields.license'), value: typedComponent.license || '-' },
    { label: t('catalog.modal.fields.language'), value: typedComponent.language || '-' },
    { label: t('catalog.modal.fields.maintainer'), value: typedComponent.maintainer || '-' },
    { label: t('catalog.modal.fields.useCases'), value: useCases },
  ];
  const tabs: { key: 'overview' | 'repro' | 'config'; label: string }[] = [
    { key: 'overview', label: t('catalog.modal.tabs.overview') },
    { key: 'repro', label: t('catalog.modal.tabs.repro') },
    { key: 'config', label: t('catalog.modal.tabs.config') },
  ];

  const copySnippet = () => {
    if (!snippet || !navigator?.clipboard) {
      return;
    }

    navigator.clipboard.writeText(snippet.codi).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3200,
        background: 'rgba(2,6,23,0.72)',
        backdropFilter: 'blur(6px)',
        overflowY: 'auto',
        padding: '88px 24px 32px',
      }}
      role="dialog"
      aria-modal="true"
      onClick={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: 'calc(100vh - 120px)',
          margin: '0 auto',
          background: 'var(--bg-card)',
          border: `1px solid ${color}40`,
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          padding: 0,
          animation: 'fadeUp 0.18s ease',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font)',
          overflowY: 'auto',
        }}
      >
        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg-card)', padding: '32px 32px 18px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <span style={{ ...S.badge(color), fontSize: 11 }}>{label}</span>
              {component.shortName && (
                <code
                  style={{
                    background: `${color}12`,
                    border: `1px solid ${color}30`,
                    color,
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {component.shortName}
                </code>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 900, letterSpacing: '-0.02em' }}>
              {component.name || t('catalog.modal.noName')}
            </h2>
            <p style={{ margin: '10px 0 0', maxWidth: 680, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, overflowWrap: 'anywhere' }}>
              {safeCatalogText(component.description, t('catalog.modal.noDescriptionLong'))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('catalog.modal.closeAriaLabel')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              border: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CloseIcon />
          </button>
        </div>
        </div>

        <div style={{ position: 'sticky', top: 105, zIndex: 1, display: 'flex', gap: 18, padding: '0 32px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          {tabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  border: 'none',
                  borderBottom: `2px solid ${active ? color : 'transparent'}`,
                  background: 'transparent',
                  color: active ? color : 'var(--text-secondary)',
                  padding: '12px 0 10px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  fontWeight: active ? 800 : 650,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 32 }}>
        {activeTab === 'overview' && (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, 0.9fr)', gap: 16 }} className="async-responsive-grid">
          <section style={{ ...S.card, boxShadow: 'none' }}>
            <div style={{ fontSize: 11, color, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t('catalog.modal.sectionWhat')}
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65 }}>
              {CATEGORY_DESCRIPTIONS[component.category || ''] || t('catalog.modal.overviewFallback')}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {CATEGORY_IMPACTS[component.category || ''] || t('catalog.modal.impactFallback')}
            </p>
          </section>

          <section style={{ ...S.card, boxShadow: 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t('catalog.modal.sectionCard')}
            </div>
            <DetailRow label={t('catalog.modal.labelCategory')} value={label} />
            <DetailRow label={t('catalog.modal.labelShortName')} value={component.shortName || '-'} />
            {overviewFields.map(field => (
              <DetailRow key={field.label} label={field.label} value={field.value} />
            ))}
            <DetailRow label={t('catalog.modal.labelRepro')} value={getReproducibilityStatus(component)} />
            {component.createdAt && (
              <DetailRow label={t('catalog.modal.labelCreatedAt')} value={new Date(component.createdAt).toLocaleDateString(locale)} />
            )}
          </section>
        </div>

        <ComponentCompatibilityDetails component={component} />
        </>
        )}

        {activeTab === 'repro' && (
          <section style={{ ...S.card, boxShadow: 'none', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('catalog.modal.tabs.repro')}
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {t('catalog.modal.reproDescription')}
                </p>
              </div>
              <StatusBadge status={getReproducibilityStatus(component)} />
            </div>

            {/* Checklist curt per saber què cal repetir abans de comparar resultats. */}
            {reproducibilityChecklist.length > 0 && (
              <div style={{ margin: '0 0 14px', padding: 12, border: `1px solid ${color}26`, borderRadius: 8, background: `${color}0d` }}>
                <div style={{ fontSize: 12, fontWeight: 850, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {t('catalog.modal.reproChecklistTitle')}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {reproducibilityChecklist.map(item => (
                    <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reproducibilityRows ? (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {reproducibilityRows.map(row => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>{t('catalog.modal.noReproRows')}</p>
            )}
          </section>
        )}

        {activeTab === 'config' && (
          <section style={{ ...S.card, boxShadow: 'none', marginTop: 16 }}>
            {snippet ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--text-primary)' }}>{snippet.titol}</div>
                  <button
                    type="button"
                    onClick={copySnippet}
                    style={{ ...S.btn, fontSize: 12, padding: '5px 11px' }}
                  >
                    {copied ? t('catalog.modal.copied') : t('catalog.modal.copy')}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'auto',
                    maxHeight: 220,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre' as const,
                  }}
                >
                  {snippet.codi}
                </pre>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>{t('catalog.modal.noConfigSnippet')}</p>
            )}
          </section>
        )}


        <div
          style={{
            marginTop: 22,
            padding: 16,
            borderRadius: 10,
            border: `1px solid ${color}30`,
            background: `${color}0f`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 850, color: 'var(--text-primary)' }}>{t('catalog.modal.btnUse')}</div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {t('catalog.modal.useDescription')}
            </div>
          </div>
          <a
            href={scenarioUrl}
            style={{
              ...S.btnPrimary,
              background: color,
              textDecoration: 'none',
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 850,
            }}
          >
            {t('catalog.modal.btnCreateScenario')}
          </a>
        </div>
        </div>
      </aside>
    </div>
  );
};

export const CatalogPage = () => {
  const { t } = useTranslation();
  const categoryLabels = (tRaw('catalog.categoryLabels') as Record<string, string> | undefined) ?? CATEGORY_LABELS;
  const categoryTitles = (tRaw('catalog.categoryTitles') as Record<string, string> | undefined) ?? {};
  const categoryDescriptions = (tRaw('catalog.categoryDescriptions') as Record<string, string> | undefined) ?? CATEGORY_DESCRIPTIONS;
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogNotice, setCatalogNotice] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>('category');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<CatalogComponent | null>(null);

  useEffect(() => {
    document.title = t('catalog.pageTitle');
  }, [t]);

  const fetchComponents = async () => {
    const firstLoad = components.length === 0;
    setError('');
    setCatalogNotice('');
    if (firstLoad) {
      setLoading(true);
    }

    try {
      const response = await fetch(`${API_BASE}/components`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const rawBody = await response.text();
      let data: unknown;
      try {
        data = JSON.parse(rawBody);
      } catch {
        throw new Error('El catalog-service no ha retornat JSON vàlid');
      }

      const nextComponents = Array.isArray(data)
        ? mergeWithDefaultCatalogComponents((data as CatalogComponent[]).map(sanitizeCatalogComponent))
        : [];
      if (nextComponents.length === 0) {
        setComponents(DEFAULT_CATALOG_COMPONENTS.map(sanitizeCatalogComponent));
        setCatalogNotice('El catalog-service ha respost sense components. Es mostra el catàleg base local per poder treballar igualment.');
        return;
      }

      setComponents(nextComponents);
    } catch (err) {
      if (components.length === 0) {
        setComponents(DEFAULT_CATALOG_COMPONENTS.map(sanitizeCatalogComponent));
        setCatalogNotice(`No s'ha pogut llegir el catalog-service (${(err as Error).message}). Es mostra el catàleg base local.`);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleComponents = useMemo(
    () =>
      components.filter(component =>
        component.predefined !== false &&
        component.category !== 'gateway' &&
        !isLegacyComponent(component),
      ),
    [components],
  );

  const countByCategory = (category: CategoryFilter): number => {
    if (category === 'all') {
      return visibleComponents.length;
    }
    return visibleComponents.filter(component => component.category === category).length;
  };

  const activeFilterCount = (activeCategory !== 'all' ? 1 : 0);

  const filteredComponents = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);

    return visibleComponents.filter(component => {
      if (activeCategory !== 'all' && component.category !== activeCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchHaystack = [
        component.name,
        component.shortName,
        component.description,
        componentCategoryLabel(component, categoryLabels),
        getKnownComponentVersion(component),
        ...(Array.isArray(component.tags) ? component.tags : []),
      ].map(normalizeText);

      return searchHaystack.some(value => value.includes(normalizedQuery));
    });
  }, [activeCategory, categoryLabels, searchQuery, visibleComponents]);

  const sortedComponents = useMemo(() => {
    if (!sortKey || !sortDir) {
      return filteredComponents;
    }

    const getSortValue = (component: CatalogComponent): string => {
      if (sortKey === 'category') {
        return componentCategoryLabel(component, categoryLabels);
      }
      if (sortKey === 'version') {
        return getKnownComponentVersion(component);
      }
      if (sortKey === 'repro') {
        return getReproducibilityStatus(component);
      }
      return String(component[sortKey] || '');
    };

    return [...filteredComponents].sort((a, b) => {
      const result = getSortValue(a).localeCompare(getSortValue(b), 'ca', { sensitivity: 'base' });
      return sortDir === 'asc' ? result : -result;
    });
  }, [categoryLabels, filteredComponents, sortDir, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
      return;
    }

    if (sortDir === 'asc') {
      setSortDir('desc');
      return;
    }

    setSortKey(null);
    setSortDir(null);
  };

  const resetFilters = () => {
    setActiveCategory('all');
    setSearchQuery('');
  };

  const architectureCount = countByCategory('architecture');
  const protocolCount = countByCategory('protocol');
  const platformCount = countByCategory('platform');
  const theoreticalCombinationCount = architectureCount * protocolCount * platformCount;
  const compatibleCombinationCount = useMemo(
    () =>
      ALL_PLATFORMS
        .filter(platform => !DISABLED_PLATFORMS.includes(platform))
        .reduce((total, platform) => {
          const entry = COMPATIBILITY[platform];
          if (!entry) {
            return total;
          }
          return total + entry.architectures.length * entry.protocols.length;
        }, 0),
    [],
  );

const tableCardStyle: CSSProperties = {
    ...S.card,
    padding: 0,
    overflow: 'hidden',
  };

  return (
    <div style={{ ...S.page, maxWidth: 1240 }}>
      <GlobalBenchmarkStyles />

      {selectedComponent && (
        <ComponentDetailModal
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
        />
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {t('catalog.heading')}
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 780, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.65 }}>
            {t('catalog.subheading')}
          </p>
        </div>
        <TutorialButton page="catalog" />
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 18 }}>
        <CategoryCard
          category="platform"
          title={categoryTitles.platform || t('catalog.categoryTitles.platform')}
          description={categoryDescriptions.platform || CATEGORY_DESCRIPTIONS.platform}
          count={platformCount}
          active={activeCategory === 'platform'}
          onClick={() => setActiveCategory(activeCategory === 'platform' ? 'all' : 'platform')}
        />
        <CategoryCard
          category="protocol"
          title={categoryTitles.protocol || t('catalog.categoryTitles.protocol')}
          description={categoryDescriptions.protocol || CATEGORY_DESCRIPTIONS.protocol}
          count={protocolCount}
          active={activeCategory === 'protocol'}
          onClick={() => setActiveCategory(activeCategory === 'protocol' ? 'all' : 'protocol')}
        />
        <CategoryCard
          category="architecture"
          title={categoryTitles.architecture || t('catalog.categoryTitles.architecture')}
          description={categoryDescriptions.architecture || CATEGORY_DESCRIPTIONS.architecture}
          count={architectureCount}
          active={activeCategory === 'architecture'}
          onClick={() => setActiveCategory(activeCategory === 'architecture' ? 'all' : 'architecture')}
        />
      </section>

      <CompatibilitySummary />

      <FilterPanel
        title={t('catalog.filterTitle')}
        activeFilterCount={activeFilterCount}
        visibleCount={loading ? 0 : filteredComponents.length}
        totalCount={visibleComponents.length}
        searchValue={searchQuery}
        searchPlaceholder={t('catalog.searchPlaceholder')}
        visibleLabel={(visible, total) => `${visible} ${t('catalog.filters.visibleOf')} ${total}`}
        clearSearchLabel={t('catalog.filters.clearSearch')}
        clearFiltersLabel={t('catalog.filters.clearAll')}
        onSearchChange={setSearchQuery}
        onClearFilters={resetFilters}
      >
        <FilterSelect
          label={t('catalog.filters.category')}
          value={activeCategory}
          onChange={value => setActiveCategory(value as CategoryFilter)}
          minWidth={220}
          accentColor="var(--accent)"
          options={CATEGORY_ORDER.map(category => {
            const label = category === 'all' ? t('catalog.filterAll') : categoryLabels[category];
            return {
              value: category,
              label: `${label} (${countByCategory(category)})`,
            };
          })}
        />
      </FilterPanel>

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 8,
          flexWrap: 'wrap',
          padding: '10px 14px',
          marginBottom: 16,
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          fontSize: 13,
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <strong style={{ color: CATEGORY_COLORS.platform, fontFamily: 'var(--font-mono)' }}>
            {loading ? '-' : compatibleCombinationCount}
          </strong>{' '}
          {t('catalog.stats.compatibleCombinations')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {loading ? '-' : theoreticalCombinationCount}
          </strong>{' '}
          {t('catalog.stats.possibleCombinations')}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {loading ? '-' : filteredComponents.length}
          </strong>{' '}
          {t('catalog.stats.visibleOf')} {visibleComponents.length}
        </span>
      </div>

      {catalogNotice && (
        <div style={{ ...S.card, borderColor: 'rgba(245,158,11,0.35)', color: 'var(--warning)', marginBottom: 16, background: 'rgba(245,158,11,0.06)' }}>
          {catalogNotice}
        </div>
      )}

      {error && (
        <div style={{ ...S.card, borderColor: 'rgba(220,38,38,0.35)', color: 'var(--error)', marginBottom: 16 }}>
          {t('catalog.loadError')} {error}
        </div>
      )}

      <section style={tableCardStyle}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 850, color: 'var(--text-primary)' }}>
              {t('catalog.tableHeading')}
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('catalog.tableSubheading')}
            </div>
          </div>
          {searchQuery && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--accent)', fontSize: 12 }}>
              <SearchIcon />
              {`Cerca activa: ${searchQuery}`}
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={S.tableHeader}>
                <SortHeader label={t('catalog.colComponent')} sortKey="name" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label={t('catalog.colCategory')} sortKey="category" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label={t('catalog.colVersion')} sortKey="version" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label={t('catalog.colDescription')} sortKey="description" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {[42, 24, 20, 68].map((width, cellIndex) => (
                      <td key={cellIndex} style={{ ...S.td, padding: '13px 12px' }}>
                        <div
                          style={{
                            height: 11,
                            width: `${width}%`,
                            borderRadius: 5,
                            background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-hover) 50%, var(--border) 75%)',
                            backgroundSize: '200% 100%',
                            animation: `shimmer 1.5s ease-in-out infinite`,
                            animationDelay: `${rowIndex * 0.06}s`,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedComponents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 42, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {t('catalog.noComponents')}
                  </td>
                </tr>
              ) : (
                sortedComponents.map(component => {
                  const rowId = component.id || `${component.category}-${component.name}`;
                  const color = componentColor(component);
                  const selected = selectedComponent?.id === component.id && component.id != null;
                  const hovered = hoveredId === rowId;
                  const version = getKnownComponentVersion(component);

                  return (
                    <tr
                      key={rowId}
                      className="card-hover"
                      onMouseEnter={() => setHoveredId(rowId)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => setSelectedComponent(component)}
                      style={{
                        ...S.tableRow,
                        cursor: 'pointer',
                        background: selected ? `${color}12` : hovered ? 'var(--bg-hover)' : 'transparent',
                        borderLeft: `3px solid ${selected || hovered ? color : 'transparent'}`,
                      }}
                    >
                      <td style={{ ...S.td, fontWeight: 850 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                          <span
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 7,
                              background: `${color}14`,
                              border: `1px solid ${color}30`,
                              color,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <CategoryIcon category={component.category || ''} />
                          </span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {component.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{ ...S.badge(color), fontSize: 11 }}>{componentCategoryLabel(component, categoryLabels)}</span>
                      </td>
                      <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: version ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                        {version || '-'}
                      </td>
                      <td style={{ ...S.td, color: 'var(--text-secondary)', maxWidth: 470 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {safeCatalogText(component.description, t('catalog.noDescription'))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CatalogPage;
