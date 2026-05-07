/**
 * SettingsPage.tsx — Pàgina de configuració personalitzada
 *
 * Seccions:
 *   1. Identitat   — informació de l'usuari actual (via identityApiRef)
 *   2. Idioma      — selector ca/es/en, persistit a localStorage
 *   3. Aparença    — commutador de tema clar/fosc (via storageApiRef)
 *
 * Utilitza el patró S de theme.ts per a tots els estils inline.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { changeLanguage } from '../../i18n';
import { useApi, identityApiRef, storageApiRef } from '@backstage/core-plugin-api';
import { S, GLOBAL_CSS } from '@internal/plugin-async-benchmark/src/theme';

const LANGUAGE_KEY = 'apis-asincrones.language';
const THEME_KEY = '@backstage/core-app-api:themeId';

type Language = 'ca' | 'es' | 'en';

// ── Injecció del CSS global (variables + animacions) ──────────────────────────
const useGlobalCss = () => {
  useEffect(() => {
    const id = 'async-benchmark-global-css';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = GLOBAL_CSS;
      document.head.appendChild(el);
    }
  }, []);
};

// ── Secció card genèrica ──────────────────────────────────────────────────────
const SettingsCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div
    style={{
      ...S.card,
      marginBottom: 24,
      padding: 24,
    }}
  >
    <h2
      style={{
        margin: '0 0 16px',
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font)',
        letterSpacing: '-0.01em',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {title}
    </h2>
    {children}
  </div>
);

// ── 1. Secció Identitat ───────────────────────────────────────────────────────
const IdentitySection = () => {
  const { t } = useTranslation();
  const identityApi = useApi(identityApiRef);
  const [profile, setProfile] = useState<{
    displayName?: string;
    email?: string;
    userEntityRef?: string;
  }>({});

  useEffect(() => {
    identityApi.getProfileInfo().then(p => {
      setProfile({ displayName: p.displayName, email: p.email });
    });
    identityApi.getBackstageIdentity().then(identity => {
      setProfile(prev => ({ ...prev, userEntityRef: identity.userEntityRef }));
    });
  }, [identityApi]);

  const rows: { label: string; value?: string }[] = [
    { label: t('settings.identity.user'), value: profile.displayName },
    { label: t('settings.identity.email'), value: profile.email },
    { label: t('settings.identity.entity'), value: profile.userEntityRef },
  ];

  return (
    <SettingsCard title={t('settings.identity.title')}>
      <dl style={{ margin: 0, display: 'grid', gap: 8 }}>
        {rows.map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: 8,
              alignItems: 'start',
              padding: '6px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <dt
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                fontFamily: 'var(--font)',
                paddingTop: 2,
              }}
            >
              {label}
            </dt>
            <dd
              style={{
                margin: 0,
                fontSize: 13,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, monospace)',
                wordBreak: 'break-all',
              }}
            >
              {value ?? (
                <span style={{ color: 'var(--text-disabled)', fontFamily: 'var(--font)' }}>—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </SettingsCard>
  );
};

// ── 2. Secció Idioma ──────────────────────────────────────────────────────────
const LanguageSection = () => {
  const { t } = useTranslation();

  const savedLang = (): Language => {
    try {
      const v = localStorage.getItem(LANGUAGE_KEY);
      if (v === 'ca' || v === 'es' || v === 'en') return v;
    } catch {
      // ignore
    }
    return 'ca';
  };

  const [selected, setSelected] = useState<Language>(savedLang);

  const options: { value: Language; label: string }[] = [
    { value: 'ca', label: t('settings.language.ca') },
    { value: 'es', label: t('settings.language.es') },
    { value: 'en', label: t('settings.language.en') },
  ];

  const handleChange = (lang: Language) => {
    setSelected(lang);
    try {
      localStorage.setItem(LANGUAGE_KEY, lang);
    } catch {
      // ignore
    }
    changeLanguage(lang);
  };

  return (
    <SettingsCard title={t('settings.language.title')}>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font)',
        }}
      >
        {t('settings.language.description')}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {options.map(opt => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleChange(opt.value)}
              style={{
                ...S.btn,
                ...(active
                  ? {
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontWeight: 600,
                    }
                  : {}),
                minWidth: 100,
                justifyContent: 'center',
              }}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
};

// ── 3. Secció Aparença ────────────────────────────────────────────────────────
const AppearanceSection = () => {
  const { t } = useTranslation();
  const storageApi = useApi(storageApiRef);

  const readTheme = (): 'light' | 'dark' => {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed === 'dark') return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme);

  const handleTheme = (id: 'light' | 'dark') => {
    setTheme(id);
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(id));
      // Notify same-tab listeners (Root.tsx polls every 300ms, but storage
      // event doesn't fire for the same tab — the poll covers it)
      document.documentElement.setAttribute('data-theme', id);
    } catch {
      // ignore
    }
    // Also persist via backstage storageApi for consistency
    storageApi.forBucket('core').set('themeId', id);
  };

  const options: { value: 'light' | 'dark'; label: string }[] = [
    { value: 'light', label: t('settings.appearance.light') },
    { value: 'dark', label: t('settings.appearance.dark') },
  ];

  return (
    <SettingsCard title={t('settings.appearance.title')}>
      <p
        style={{
          margin: '0 0 14px',
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font)',
        }}
      >
        {t('settings.appearance.description')}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {options.map(opt => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTheme(opt.value)}
              style={{
                ...S.btn,
                ...(active
                  ? {
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontWeight: 600,
                    }
                  : {}),
                minWidth: 110,
                justifyContent: 'center',
              }}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
};

const SessionSection = () => {
  const { t } = useTranslation();

  const handleLogout = () => {
    localStorage.removeItem('apis-asincrones.language');
    // Future: clear auth token here
    window.location.href = '/';
  };

  return (
    <SettingsCard title={t('settings.session.title')}>
      <p
        style={{
          margin: '0 0 16px',
          fontSize: 14,
          fontWeight: 400,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font)',
          lineHeight: 1.6,
        }}
      >
        {t('settings.session.description')}
      </p>
      <button
        type="button"
        onClick={handleLogout}
        style={{
          ...S.btn,
          background: 'var(--danger-soft)',
          color: 'var(--danger)',
          border: '1px solid var(--danger-border)',
          fontWeight: 700,
        }}
      >
        {t('settings.session.logout')}
      </button>
    </SettingsCard>
  );
};

// ── Component principal ───────────────────────────────────────────────────────
export const SettingsPage = () => {
  const { t } = useTranslation();
  useGlobalCss();

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h1
          style={{
            margin: '0 0 24px',
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font)',
            letterSpacing: '-0.02em',
          }}
        >
          {t('settings.title')}
        </h1>

        <IdentitySection />
        <LanguageSection />
        <AppearanceSection />
        <SessionSection />
      </div>
    </div>
  );
};
