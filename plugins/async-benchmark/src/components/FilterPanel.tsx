import React from 'react';
import { S } from '../theme';

type FilterPanelProps = {
  title?: string;
  activeFilterCount: number;
  visibleCount: number;
  totalCount: number;
  searchValue?: string;
  searchPlaceholder?: string;
  visibleLabel?: (visibleCount: number, totalCount: number) => string;
  clearSearchLabel?: string;
  clearFiltersLabel?: string;
  onSearchChange?: (value: string) => void;
  onClearFilters?: () => void;
  children?: React.ReactNode;
};

type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  minWidth?: number;
  accentColor?: string;
};

const FilterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

/**
 * Panell comu de filtres.
 *
 * Aquest component nomes pinta la carcassa: titol, cerca, recompte i accions.
 * Cada pagina decideix com filtra les seves dades. Aixi totes les pantalles
 * mantenen el mateix aspecte sense barrejar regles de negoci.
 */
export const FilterPanel = ({
  title = 'Filtres',
  activeFilterCount,
  visibleCount,
  totalCount,
  searchValue = '',
  searchPlaceholder = 'Cerca',
  visibleLabel,
  clearSearchLabel = 'Netejar cerca',
  clearFiltersLabel = 'Netejar filtres',
  onSearchChange,
  onClearFilters,
  children,
}: FilterPanelProps) => {
  const hasSearchText = searchValue.trim().length > 0;
  const hasActiveFilters = activeFilterCount > 0 || hasSearchText;
  const countLabel = visibleLabel
    ? visibleLabel(visibleCount, totalCount)
    : `${visibleCount} visibles de ${totalCount} totals`;

  return (
    <section style={{ ...S.card, marginBottom: 20, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: hasActiveFilters ? 'var(--accent)' : 'var(--text-disabled)', flexShrink: 0 }}>
          <FilterIcon />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </span>
          {activeFilterCount > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 999, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, padding: '0 5px' }}>
              {activeFilterCount}
            </span>
          )}
        </div>

        {onSearchChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '1 1 260px', minWidth: 220, background: 'var(--bg-subtle)', border: `1px solid ${hasSearchText ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '7px 10px', transition: 'border-color var(--transition), box-shadow var(--transition)' }}>
            <span style={{ display: 'flex', color: hasSearchText ? 'var(--accent)' : 'var(--text-disabled)', flexShrink: 0 }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={event => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              style={{ background: 'none', border: 'none', outline: 'none', width: '100%', minWidth: 0, color: 'var(--text-primary)', fontFamily: 'var(--font)', fontSize: 12 }}
            />
            {hasSearchText && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label={clearSearchLabel}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 0, display: 'flex', fontSize: 16, lineHeight: 1 }}
              >
                x
              </button>
            )}
          </div>
        )}

        <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {countLabel}
        </span>

        {hasActiveFilters && onClearFilters && (
          <button type="button" onClick={onClearFilters} style={{ ...S.btn, fontSize: 12, padding: '5px 12px' }}>
            {clearFiltersLabel}
          </button>
        )}
      </div>

      {children && (
        <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'nowrap', alignItems: 'flex-end', overflowX: 'auto', paddingBottom: 2 }}>
          {children}
        </div>
      )}
    </section>
  );
};

export const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  minWidth = 170,
  accentColor = 'var(--accent)',
}: FilterSelectProps) => {
  const isActive = value !== 'all' && value !== '';
  const borderColor = isActive ? accentColor : 'var(--border)';

  return (
    <label style={{ display: 'grid', gap: 6, minWidth }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: isActive ? accentColor : 'var(--text-disabled)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        style={{
          ...S.select,
          borderColor,
          boxShadow: isActive ? `0 0 0 3px ${accentColor}14` : 'none',
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};
