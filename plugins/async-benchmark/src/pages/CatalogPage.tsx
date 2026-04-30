import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { S, CATEGORY_COLORS } from '../theme';
import { FilterPanel } from '../components/FilterPanel';
import { GlobalBenchmarkStyles } from '../components/GlobalBenchmarkStyles';
import {
  ALL_PLATFORMS,
  COMPATIBILITY,
  DISABLED_PLATFORMS,
} from '../shared/catalog/compatibility';
import {
  getKnownComponentVersion,
  getReproducibilityRows,
  getReproducibilitySnippet,
  getReproducibilityStatus,
  type ReproducibilityStatus,
} from '../shared/catalog/reproducibility';

const API_BASE = '/api/proxy/catalog-service';

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

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
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

const componentColor = (component: CatalogComponent): string =>
  CATEGORY_COLORS[component.category || ''] || 'var(--accent)';

const componentCategoryLabel = (component: CatalogComponent): string =>
  CATEGORY_LABELS[component.category || ''] || component.category || 'Sense categoria';

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

const getCompatibilityDetails = (component: CatalogComponent) => {
  const code = component.shortName || component.name || '';

  if (component.category === 'platform') {
    const platform = platformKeyForCompatibility(component);
    const entry = COMPATIBILITY[platform];

    if (!entry) {
      return [];
    }

    return [
      { label: 'Arquitectures compatibles', values: entry.architectures, color: CATEGORY_COLORS.architecture },
      { label: 'Protocols compatibles', values: entry.protocols, color: CATEGORY_COLORS.protocol },
    ];
  }

  if (component.category === 'architecture') {
    const platforms = ALL_PLATFORMS.filter(platform =>
      COMPATIBILITY[platform]?.architectures.includes(code),
    );
    const protocols = uniqueValues(platforms.flatMap(platform => COMPATIBILITY[platform]?.protocols || []));

    return [
      { label: 'Plataformes que la poden usar', values: platforms, color: CATEGORY_COLORS.platform },
      { label: 'Protocols disponibles en aquestes plataformes', values: protocols, color: CATEGORY_COLORS.protocol },
    ];
  }

  if (component.category === 'protocol') {
    const platforms = ALL_PLATFORMS.filter(platform =>
      COMPATIBILITY[platform]?.protocols.includes(code),
    );
    const architectures = uniqueValues(platforms.flatMap(platform => COMPATIBILITY[platform]?.architectures || []));

    return [
      { label: 'Plataformes que el poden usar', values: platforms, color: CATEGORY_COLORS.platform },
      { label: 'Arquitectures disponibles en aquestes plataformes', values: architectures, color: CATEGORY_COLORS.architecture },
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
  count,
  active,
  onClick,
}: {
  category: 'architecture' | 'protocol' | 'platform';
  title: string;
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
        {CATEGORY_DESCRIPTIONS[category]}
      </p>
    </button>
  );
};

const CompatibilitySummary = () => {
  const chip = (value: string, color: string) => (
    <span key={value} style={{ ...S.badge(color), fontSize: 10, padding: '2px 7px' }}>
      {value}
    </span>
  );

  return (
    <details style={{ ...S.card, marginBottom: 20, padding: 0, overflow: 'hidden' }}>
      <summary
        style={{
          cursor: 'pointer',
          padding: '14px 18px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        Combinacions compatibles del portal
        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
          Taula compacta per entendre quina plataforma accepta cada arquitectura i protocol
        </span>
      </summary>
      <div style={{ padding: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={S.tableHeader}>
              <th style={{ ...S.th, width: 170 }}>Plataforma</th>
              <th style={S.th}>Arquitectures admeses</th>
              <th style={S.th}>Protocols admesos</th>
              <th style={S.th}>Lectura ràpida</th>
            </tr>
          </thead>
          <tbody>
            {ALL_PLATFORMS.map(platform => {
              const entry = COMPATIBILITY[platform];
              const disabled = DISABLED_PLATFORMS.includes(platform);
              return (
                <tr key={platform} style={S.tableRow}>
                  <td style={{ ...S.td, fontWeight: 850 }}>
                    {platform}
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
                    Una fila és una plataforma real. Les dues columnes centrals indiquen quines arquitectures i protocols es poden escollir per crear un escenari reproduïble.
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
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
    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55, wordBreak: 'break-word' }}>
      {value || '-'}
    </div>
  </div>
);

const ComponentCompatibilityDetails = ({ component }: { component: CatalogComponent }) => {
  const details = getCompatibilityDetails(component);

  if (details.length === 0) {
    return null;
  }

  return (
    <section style={{ ...S.card, boxShadow: 'none', marginTop: 16 }}>
      <div style={{ fontSize: 11, color: componentColor(component), fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        Compatibilitat dins del portal
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        Aquest bloc connecta el component amb les opcions que apareixeran a Escenaris. Serveix per evitar combinacions que el portal encara no sap executar de manera reproduïble.
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
                <span style={{ fontSize: 12, color: 'var(--text-disabled)' }}>Cap combinació declarada</span>
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
  const [copied, setCopied] = useState(false);
  const color = componentColor(component);
  const label = componentCategoryLabel(component);
  const version = getKnownComponentVersion(component);
  const reproducibilityRows = getReproducibilityRows(component);
  const snippet = getReproducibilitySnippet(component);
  const scenarioUrl = buildScenarioUrl(component);

  const copySnippet = () => {
    if (!snippet || !navigator?.clipboard) {
      return;
    }

    navigator.clipboard.writeText(snippet.codi).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
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
          maxWidth: 860,
          margin: '0 auto',
          background: 'var(--bg-card)',
          border: `1px solid ${color}40`,
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          padding: 26,
          animation: 'fadeUp 0.18s ease',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 18 }}>
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
              {component.name || 'Component sense nom'}
            </h2>
            <p style={{ margin: '10px 0 0', maxWidth: 680, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {component.description || 'Aquest component encara no té una descripció al catàleg.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tanca el detall del component"
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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(260px, 0.9fr)', gap: 16 }} className="async-responsive-grid">
          <section style={{ ...S.card, boxShadow: 'none' }}>
            <div style={{ fontSize: 11, color, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Què representa dins del benchmark
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65 }}>
              {CATEGORY_DESCRIPTIONS[component.category || ''] || 'Component utilitzat pel portal de benchmark.'}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {CATEGORY_IMPACTS[component.category || ''] || 'El seu impacte depèn de com es combina dins de l’escenari.'}
            </p>
          </section>

          <section style={{ ...S.card, boxShadow: 'none' }}>
            <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Fitxa ràpida
            </div>
            <DetailRow label="Categoria" value={label} />
            <DetailRow label="Nom curt" value={component.shortName || '-'} />
            <DetailRow label="Versió" value={version || '-'} />
            <DetailRow label="Reproductibilitat" value={getReproducibilityStatus(component)} />
            {component.createdAt && (
              <DetailRow label="Afegit el" value={new Date(component.createdAt).toLocaleDateString('ca-ES')} />
            )}
          </section>
        </div>

        <ComponentCompatibilityDetails component={component} />

        {(reproducibilityRows || snippet) && (
          <section style={{ ...S.card, boxShadow: 'none', marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color, fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Reproductibilitat
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Aquests valors expliquen com està definit o desplegat el component perquè una altra persona pugui replicar la prova.
                </p>
              </div>
              <StatusBadge status={getReproducibilityStatus(component)} />
            </div>

            {reproducibilityRows && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {reproducibilityRows.map(row => (
                  <DetailRow key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            )}

            {snippet && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 850, color: 'var(--text-primary)' }}>{snippet.titol}</div>
                  <button
                    type="button"
                    onClick={copySnippet}
                    style={{ ...S.btn, fontSize: 12, padding: '5px 11px' }}
                  >
                    {copied ? 'Copiat' : 'Copiar'}
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
            )}
          </section>
        )}

        {Array.isArray(component.tags) && component.tags.length > 0 && (
          <section style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-disabled)', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Etiquetes
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {component.tags.map(tag => (
                <span key={tag} style={{ ...S.badge(color), fontSize: 11 }}>{tag}</span>
              ))}
            </div>
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
            <div style={{ fontSize: 14, fontWeight: 850, color: 'var(--text-primary)' }}>Utilitzar aquest component</div>
            <div style={{ marginTop: 4, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Obre el formulari d’escenaris amb aquest valor preseleccionat quan sigui possible.
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
            Crear escenari
          </a>
        </div>
      </aside>
    </div>
  );
};

export const CatalogPage = () => {
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [activeReproducibility, setActiveReproducibility] = useState<'all' | ReproducibilityStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>('category');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<CatalogComponent | null>(null);

  useEffect(() => {
    document.title = 'Catàleg | APIs Asíncrones';
  }, []);

  const fetchComponents = async () => {
    const firstLoad = components.length === 0;
    setError('');
    if (firstLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await fetch(`${API_BASE}/components`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setComponents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const activeFilterCount =
    (activeCategory !== 'all' ? 1 : 0) +
    (activeReproducibility !== 'all' ? 1 : 0);

  const filteredComponents = useMemo(() => {
    const normalizedQuery = normalizeText(searchQuery);

    return visibleComponents.filter(component => {
      if (activeCategory !== 'all' && component.category !== activeCategory) {
        return false;
      }

      if (
        activeReproducibility !== 'all' &&
        getReproducibilityStatus(component) !== activeReproducibility
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchHaystack = [
        component.name,
        component.shortName,
        component.description,
        componentCategoryLabel(component),
        getKnownComponentVersion(component),
        getReproducibilityStatus(component),
        ...(Array.isArray(component.tags) ? component.tags : []),
      ].map(normalizeText);

      return searchHaystack.some(value => value.includes(normalizedQuery));
    });
  }, [activeCategory, activeReproducibility, searchQuery, visibleComponents]);

  const sortedComponents = useMemo(() => {
    if (!sortKey || !sortDir) {
      return filteredComponents;
    }

    const getSortValue = (component: CatalogComponent): string => {
      if (sortKey === 'category') {
        return componentCategoryLabel(component);
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
  }, [filteredComponents, sortDir, sortKey]);

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
    setActiveReproducibility('all');
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

  const countByReproducibility = (status: ReproducibilityStatus): number =>
    visibleComponents.filter(component => getReproducibilityStatus(component) === status).length;

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
            Catàleg de components
          </h1>
          <p style={{ margin: '8px 0 0', maxWidth: 780, color: 'var(--text-secondary)', fontSize: 14.5, lineHeight: 1.65 }}>
            Inventari de plataformes, protocols i arquitectures que poden formar un escenari. La prioritat d’aquesta pàgina és la reproductibilitat: versió, configuració i límits visibles abans de comparar resultats.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchComponents}
          disabled={refreshing}
          style={{ ...S.btn, padding: '8px 14px' }}
        >
          <RefreshIcon /> {refreshing ? 'Actualitzant' : 'Actualitzar'}
        </button>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 18 }}>
        <CategoryCard
          category="platform"
          title="Plataformes"
          count={platformCount}
          active={activeCategory === 'platform'}
          onClick={() => setActiveCategory(activeCategory === 'platform' ? 'all' : 'platform')}
        />
        <CategoryCard
          category="protocol"
          title="Protocols"
          count={protocolCount}
          active={activeCategory === 'protocol'}
          onClick={() => setActiveCategory(activeCategory === 'protocol' ? 'all' : 'protocol')}
        />
        <CategoryCard
          category="architecture"
          title="Arquitectures"
          count={architectureCount}
          active={activeCategory === 'architecture'}
          onClick={() => setActiveCategory(activeCategory === 'architecture' ? 'all' : 'architecture')}
        />
      </section>

      <CompatibilitySummary />

      <FilterPanel
        title="Filtres del catàleg"
        activeFilterCount={activeFilterCount}
        visibleCount={loading ? 0 : filteredComponents.length}
        totalCount={visibleComponents.length}
        searchValue={searchQuery}
        searchPlaceholder="Cerca per nom, versió, tag, categoria o reproductibilitat"
        onSearchChange={setSearchQuery}
        onClearFilters={resetFilters}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {CATEGORY_ORDER.map(category => {
            const isActive = activeCategory === category;
            const label = category === 'all' ? 'Tots' : CATEGORY_LABELS[category];
            const color = category === 'all' ? 'var(--accent)' : CATEGORY_COLORS[category];
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                style={{ ...S.chip(isActive, color), display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {category !== 'all' && <CategoryIcon category={category} />}
                {label}
                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.72 }}>{countByCategory(category)}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {(['all', 'Completa', 'Parcial'] as Array<'all' | ReproducibilityStatus>).map(status => {
            const isActive = activeReproducibility === status;
            const label = status === 'all' ? 'Tota reproductibilitat' : status;
            const color = status === 'Completa' ? 'var(--success)' : status === 'Parcial' ? 'var(--warning)' : 'var(--neutral)';
            const count = status === 'all' ? visibleComponents.length : countByReproducibility(status);
            const disabled = status !== 'all' && count === 0;
            return (
              <button
                key={status}
                type="button"
                disabled={disabled}
                onClick={() => setActiveReproducibility(status)}
                style={{
                  ...S.chip(isActive, color),
                  opacity: disabled ? 0.45 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {label}
                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.72 }}>{count}</span>
              </button>
            );
          })}
        </div>
      </FilterPanel>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
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
        <span>
          <strong style={{ color: CATEGORY_COLORS.platform, fontFamily: 'var(--font-mono)' }}>
            {loading ? '-' : compatibleCombinationCount}
          </strong>{' '}
          combinacions compatibles
        </span>
        <span style={{ color: 'var(--text-disabled)' }}>·</span>
        <span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {loading ? '-' : theoreticalCombinationCount}
          </strong>{' '}
          combinacions possibles sense aplicar la matriu
        </span>
        <span style={{ color: 'var(--text-disabled)' }}>·</span>
        <span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {loading ? '-' : filteredComponents.length}
          </strong>{' '}
          components visibles de {visibleComponents.length}
        </span>
        <span style={{ color: 'var(--text-disabled)' }}>·</span>
        <span>
          SEA està inclosa com a arquitectura i es manté disponible per als escenaris compatibles.
        </span>
      </div>

      {error && (
        <div style={{ ...S.card, borderColor: 'rgba(220,38,38,0.35)', color: 'var(--error)', marginBottom: 16 }}>
          No s’ha pogut carregar el catàleg: {error}
        </div>
      )}

      <section style={tableCardStyle}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 850, color: 'var(--text-primary)' }}>
              Components del benchmark
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-secondary)' }}>
              Obre una fila per veure la configuració, la versió i les ordres de verificació.
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: searchQuery ? 'var(--accent)' : 'var(--text-disabled)', fontSize: 12 }}>
            <SearchIcon />
            {searchQuery ? `Cerca activa: ${searchQuery}` : 'Sense cerca activa'}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={S.tableHeader}>
                <SortHeader label="Component" sortKey="name" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Categoria" sortKey="category" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Versió" sortKey="version" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Reproductibilitat" sortKey="repro" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
                <SortHeader label="Què aporta" sortKey="description" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {[42, 24, 20, 26, 68].map((width, cellIndex) => (
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
                  <td colSpan={5} style={{ padding: 42, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No s’ha trobat cap component amb els filtres actuals.
                  </td>
                </tr>
              ) : (
                sortedComponents.map(component => {
                  const rowId = component.id || `${component.category}-${component.name}`;
                  const color = componentColor(component);
                  const selected = selectedComponent?.id === component.id && component.id != null;
                  const hovered = hoveredId === rowId;
                  const version = getKnownComponentVersion(component);
                  const status = getReproducibilityStatus(component);

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
                        <span style={{ ...S.badge(color), fontSize: 11 }}>{componentCategoryLabel(component)}</span>
                      </td>
                      <td style={{ ...S.td, fontFamily: 'var(--font-mono)', fontSize: 12, color: version ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
                        {version || '-'}
                      </td>
                      <td style={S.td}>
                        <StatusBadge status={status} />
                      </td>
                      <td style={{ ...S.td, color: 'var(--text-secondary)', maxWidth: 470 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {component.description || 'Sense descripció'}
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
