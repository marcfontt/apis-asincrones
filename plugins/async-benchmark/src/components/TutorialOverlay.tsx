import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { S } from '../theme';

type TutorialPage = 'home' | 'catalog' | 'scenarios' | 'execucions' | 'resultats';

type TutorialTarget = {
  labelKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cursorX?: number;
  cursorY?: number;
};

type TutorialStepConfig = {
  titleKey: string;
  bodyKey: string;
  detailKey: string;
  visual: TutorialPage;
  target: TutorialTarget;
};

const TUTORIAL_STEPS: Record<TutorialPage, TutorialStepConfig[]> = {
  home: [
    {
      titleKey: 'tutorial.home.step1.title',
      bodyKey: 'tutorial.home.step1.body',
      detailKey: 'tutorial.home.step1.details',
      visual: 'home',
      target: { labelKey: 'tutorial.visual.homeStart', x: 13, y: 32, width: 24, height: 11, cursorX: 35, cursorY: 41 },
    },
    {
      titleKey: 'tutorial.home.step2.title',
      bodyKey: 'tutorial.home.step2.body',
      detailKey: 'tutorial.home.step2.details',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.catalogCard', x: 8, y: 41, width: 27, height: 23, cursorX: 32, cursorY: 59 },
    },
    {
      titleKey: 'tutorial.home.step3.title',
      bodyKey: 'tutorial.home.step3.body',
      detailKey: 'tutorial.home.step3.details',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.composition', x: 12, y: 43, width: 31, height: 25, cursorX: 40, cursorY: 63 },
    },
    {
      titleKey: 'tutorial.home.step4.title',
      bodyKey: 'tutorial.home.step4.body',
      detailKey: 'tutorial.home.step4.details',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.executionRow', x: 10, y: 48, width: 77, height: 12, cursorX: 84, cursorY: 57 },
    },
    {
      titleKey: 'tutorial.home.step5.title',
      bodyKey: 'tutorial.home.step5.body',
      detailKey: 'tutorial.home.step5.details',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.scoreDetail', x: 67, y: 52, width: 22, height: 27, cursorX: 87, cursorY: 74 },
    },
  ],
  catalog: [
    {
      titleKey: 'tutorial.catalog.step1.title',
      bodyKey: 'tutorial.catalog.step1.body',
      detailKey: 'tutorial.catalog.step1.details',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.filters', x: 69, y: 31, width: 20, height: 10, cursorX: 86, cursorY: 39 },
    },
    {
      titleKey: 'tutorial.catalog.step2.title',
      bodyKey: 'tutorial.catalog.step2.body',
      detailKey: 'tutorial.catalog.step2.details',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.catalogCard', x: 11, y: 45, width: 24, height: 22, cursorX: 32, cursorY: 62 },
    },
    {
      titleKey: 'tutorial.catalog.step3.title',
      bodyKey: 'tutorial.catalog.step3.body',
      detailKey: 'tutorial.catalog.step3.details',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.compatibility', x: 10, y: 69, width: 51, height: 17, cursorX: 58, cursorY: 82 },
    },
    {
      titleKey: 'tutorial.catalog.step4.title',
      bodyKey: 'tutorial.catalog.step4.body',
      detailKey: 'tutorial.catalog.step4.details',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.modalTabs', x: 61, y: 70, width: 29, height: 15, cursorX: 87, cursorY: 80 },
    },
    {
      titleKey: 'tutorial.catalog.step5.title',
      bodyKey: 'tutorial.catalog.step5.body',
      detailKey: 'tutorial.catalog.step5.details',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.useComponent', x: 62, y: 80, width: 26, height: 9, cursorX: 86, cursorY: 87 },
    },
  ],
  scenarios: [
    {
      titleKey: 'tutorial.scenarios.step1.title',
      bodyKey: 'tutorial.scenarios.step1.body',
      detailKey: 'tutorial.scenarios.step1.details',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.newScenario', x: 66, y: 31, width: 24, height: 10, cursorX: 87, cursorY: 39 },
    },
    {
      titleKey: 'tutorial.scenarios.step2.title',
      bodyKey: 'tutorial.scenarios.step2.body',
      detailKey: 'tutorial.scenarios.step2.details',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.composition', x: 11, y: 47, width: 34, height: 26, cursorX: 42, cursorY: 68 },
    },
    {
      titleKey: 'tutorial.scenarios.step3.title',
      bodyKey: 'tutorial.scenarios.step3.body',
      detailKey: 'tutorial.scenarios.step3.details',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.dataFormat', x: 12, y: 71, width: 33, height: 10, cursorX: 42, cursorY: 79 },
    },
    {
      titleKey: 'tutorial.scenarios.step4.title',
      bodyKey: 'tutorial.scenarios.step4.body',
      detailKey: 'tutorial.scenarios.step4.details',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.presetCard', x: 55, y: 48, width: 33, height: 26, cursorX: 85, cursorY: 68 },
    },
    {
      titleKey: 'tutorial.scenarios.step5.title',
      bodyKey: 'tutorial.scenarios.step5.body',
      detailKey: 'tutorial.scenarios.step5.details',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.scenarioActions', x: 55, y: 77, width: 33, height: 11, cursorX: 85, cursorY: 85 },
    },
    {
      titleKey: 'tutorial.scenarios.step6.title',
      bodyKey: 'tutorial.scenarios.step6.body',
      detailKey: 'tutorial.scenarios.step6.details',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.sustainedMode', x: 12, y: 81, width: 31, height: 9, cursorX: 41, cursorY: 88 },
    },
  ],
  execucions: [
    {
      titleKey: 'tutorial.execucions.step1.title',
      bodyKey: 'tutorial.execucions.step1.body',
      detailKey: 'tutorial.execucions.step1.details',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.runFilters', x: 9, y: 31, width: 79, height: 13, cursorX: 86, cursorY: 40 },
    },
    {
      titleKey: 'tutorial.execucions.step2.title',
      bodyKey: 'tutorial.execucions.step2.body',
      detailKey: 'tutorial.execucions.step2.details',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.executionRow', x: 9, y: 56, width: 59, height: 12, cursorX: 65, cursorY: 65 },
    },
    {
      titleKey: 'tutorial.execucions.step3.title',
      bodyKey: 'tutorial.execucions.step3.body',
      detailKey: 'tutorial.execucions.step3.details',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.liveMetrics', x: 68, y: 55, width: 22, height: 24, cursorX: 87, cursorY: 75 },
    },
    {
      titleKey: 'tutorial.execucions.step4.title',
      bodyKey: 'tutorial.execucions.step4.body',
      detailKey: 'tutorial.execucions.step4.details',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.runActions', x: 70, y: 56, width: 17, height: 12, cursorX: 85, cursorY: 65 },
    },
    {
      titleKey: 'tutorial.execucions.step5.title',
      bodyKey: 'tutorial.execucions.step5.body',
      detailKey: 'tutorial.execucions.step5.details',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.persistedHistory', x: 31, y: 83, width: 45, height: 9, cursorX: 73, cursorY: 89 },
    },
  ],
  resultats: [
    {
      titleKey: 'tutorial.resultats.step1.title',
      bodyKey: 'tutorial.resultats.step1.body',
      detailKey: 'tutorial.resultats.step1.details',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.resultFilters', x: 25, y: 31, width: 63, height: 13, cursorX: 85, cursorY: 40 },
    },
    {
      titleKey: 'tutorial.resultats.step2.title',
      bodyKey: 'tutorial.resultats.step2.body',
      detailKey: 'tutorial.resultats.step2.details',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.metricsPanel', x: 9, y: 44, width: 64, height: 18, cursorX: 70, cursorY: 58 },
    },
    {
      titleKey: 'tutorial.resultats.step3.title',
      bodyKey: 'tutorial.resultats.step3.body',
      detailKey: 'tutorial.resultats.step3.details',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.historyRow', x: 10, y: 66, width: 51, height: 12, cursorX: 58, cursorY: 75 },
    },
    {
      titleKey: 'tutorial.resultats.step4.title',
      bodyKey: 'tutorial.resultats.step4.body',
      detailKey: 'tutorial.resultats.step4.details',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.scoreBreakdown', x: 72, y: 62, width: 18, height: 25, cursorX: 88, cursorY: 82 },
    },
    {
      titleKey: 'tutorial.resultats.step5.title',
      bodyKey: 'tutorial.resultats.step5.body',
      detailKey: 'tutorial.resultats.step5.details',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.comparison', x: 28, y: 82, width: 47, height: 11, cursorX: 72, cursorY: 90 },
    },
  ],
};

export const DEMO_SCENARIO_URL =
  '/escenaris?create=true&platform=Kafka&architecture=EDA&protocol=Kafka&duration=360&rate=20000&payloadSize=500&dataFormat=default';

const TUTORIAL_CSS = `
@keyframes asyncbench-tutorial-in {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes asyncbench-tutorial-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.28); }
  50% { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
}
@keyframes asyncbench-tutorial-cursor {
  0%, 100% { transform: translate(-16px, -12px) scale(1); }
  46% { transform: translate(0, 0) scale(1); }
  55% { transform: translate(0, 0) scale(0.92); }
  66% { transform: translate(0, 0) scale(1); }
}
.asyncbench-tutorial-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 24px;
}
.asyncbench-tutorial-preview {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--bg-surface);
}
.asyncbench-tutorial-target {
  position: absolute;
  z-index: 4;
  border: 2px solid var(--accent);
  border-radius: 12px;
  pointer-events: none;
  animation: asyncbench-tutorial-pulse 1.9s ease-in-out infinite;
  background: rgba(37,99,235,0.08);
  box-shadow: 0 0 0 999px rgba(15,23,42,0.05);
}
.asyncbench-tutorial-cursor {
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  animation: asyncbench-tutorial-cursor 2.2s ease-in-out infinite;
  pointer-events: none;
}
.asyncbench-tutorial-cursor-label {
  border: 1px solid var(--border);
  background: var(--bg-card);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 800;
  box-shadow: var(--shadow-sm);
  white-space: nowrap;
}
.asyncbench-tutorial-topbar {
  height: 34px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  background: var(--bg-card);
}
.asyncbench-tutorial-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
}
.asyncbench-tutorial-app {
  display: flex;
  flex-direction: column;
  min-height: 326px;
}
.asyncbench-tutorial-nav {
  border-bottom: 1px solid var(--border);
  padding: 10px 12px;
  background: var(--bg-subtle);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}
.asyncbench-tutorial-nav span,
.asyncbench-tutorial-line {
  display: block;
  border-radius: 999px;
  background: var(--border);
}
.asyncbench-tutorial-nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  color: var(--text-secondary);
  background: transparent;
  white-space: nowrap;
}
.asyncbench-tutorial-nav-item[data-active="true"] {
  color: var(--accent);
  background: rgba(37,99,235,0.12);
}
.asyncbench-tutorial-content {
  position: relative;
  padding: 18px;
}
.asyncbench-tutorial-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}
@media (max-width: 780px) {
  .asyncbench-tutorial-shell {
    grid-template-columns: 1fr;
  }
  .asyncbench-tutorial-preview {
    min-height: 300px;
  }
  .asyncbench-tutorial-app {
    min-height: 270px;
  }
  .asyncbench-tutorial-nav {
    gap: 5px;
    padding: 8px;
  }
  .asyncbench-tutorial-nav-item {
    padding: 0 7px;
    font-size: 9px;
  }
  .asyncbench-tutorial-cursor-label {
    display: none;
  }
}
`;

const PreviewLine = ({
  width,
  height = 8,
  color = 'var(--border)',
}: {
  width: string | number;
  height?: number;
  color?: string;
}) => (
  <span
    className="asyncbench-tutorial-line"
    style={{ width, height, background: color }}
  />
);

const MiniRow = ({
  accent = 'var(--accent)',
  active = false,
}: {
  accent?: string;
  active?: boolean;
}) => (
  <div
    className="asyncbench-tutorial-card"
    style={{
      display: 'grid',
      gridTemplateColumns: '20px 1.2fr 0.7fr 0.6fr',
      gap: 10,
      alignItems: 'center',
      padding: '10px 12px',
      borderColor: active ? 'rgba(37,99,235,0.42)' : 'var(--border)',
      background: active ? 'rgba(37,99,235,0.06)' : 'var(--bg-card)',
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent }} />
    <PreviewLine width="78%" height={7} />
    <PreviewLine width="68%" height={7} color="var(--bg-hover)" />
    <PreviewLine width="42%" height={7} color={accent} />
  </div>
);

const PreviewButton = ({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'soft' }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 92,
      height: 34,
      borderRadius: 10,
      border: tone === 'primary' ? '1px solid var(--accent)' : '1px solid var(--border)',
      background: tone === 'primary' ? 'var(--accent)' : 'var(--bg-card)',
      color: tone === 'primary' ? '#fff' : 'var(--text-primary)',
      fontSize: 11,
      fontWeight: 800,
      boxShadow: tone === 'primary' ? '0 10px 18px rgba(37,99,235,0.20)' : 'var(--shadow-sm)',
    }}
  >
    {label}
  </div>
);

const MiniField = ({
  color = 'var(--accent)',
  wide = false,
}: {
  color?: string;
  wide?: boolean;
}) => (
  <div style={{ display: 'grid', gap: 5 }}>
    <PreviewLine width={wide ? '62%' : '44%'} height={6} color={color} />
    <div
      style={{
        height: 24,
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      <PreviewLine width={wide ? '76%' : '58%'} height={6} color="var(--bg-hover)" />
    </div>
  </div>
);

const MiniActionDots = () => (
  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
    {['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'].map(color => (
      <span key={color} style={{ width: 18, height: 18, borderRadius: 6, background: color, opacity: 0.86 }} />
    ))}
  </div>
);

const MiniTabs = ({ activeIndex = 0 }: { activeIndex?: number }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {[0, 1, 2].map(index => (
      <span
        key={index}
        style={{
          width: index === activeIndex ? 54 : 40,
          height: 18,
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: index === activeIndex ? 'rgba(37,99,235,0.12)' : 'var(--bg-card)',
        }}
      />
    ))}
  </div>
);

const NAV_LABEL_KEYS: Record<TutorialPage, string> = {
  home: 'nav.home',
  catalog: 'nav.catalog',
  scenarios: 'nav.escenaris',
  execucions: 'nav.execucions',
  resultats: 'nav.resultats',
};

const PREVIEW_TITLE_KEYS: Record<TutorialPage, string> = {
  home: 'home.title',
  catalog: 'catalog.heading',
  scenarios: 'scenarios.heading',
  execucions: 'nav.execucions',
  resultats: 'nav.resultats',
};

const PREVIEW_SUBTITLE_KEYS: Record<TutorialPage, string> = {
  home: 'home.guide.subtitle',
  catalog: 'catalog.subheading',
  scenarios: 'scenarios.guide.subtitle',
  execucions: 'execucions.guide.subtitle',
  resultats: 'resultats.glossary.shortSubtitle',
};

const PreviewText = ({ children, color = 'var(--text-primary)' }: { children: string; color?: string }) => (
  <span style={{ fontSize: 10.5, fontWeight: 850, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
    {children}
  </span>
);

const PreviewHeader = ({ page, t }: { page: TutorialPage; t: (key: string) => string }) => (
  <div style={{ display: 'grid', gap: 5, minWidth: 0 }}>
    <PreviewText color="var(--accent)">{t(NAV_LABEL_KEYS[page])}</PreviewText>
    <div style={{ display: 'grid', gap: 6 }}>
      <PreviewLine width="44%" height={13} color="var(--text-primary)" />
      <PreviewText color="var(--text-secondary)">{t(PREVIEW_TITLE_KEYS[page])}</PreviewText>
      <PreviewText color="var(--text-disabled)">{t(PREVIEW_SUBTITLE_KEYS[page])}</PreviewText>
      <PreviewLine width="72%" height={6} />
    </div>
  </div>
);

const PreviewContent = ({ page, t }: { page: TutorialPage; t: (key: string) => string }) => {
  if (page === 'home') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <PreviewHeader page="home" t={t} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <PreviewText color="var(--text-primary)">{t('home.sections.executionTitle')}</PreviewText>
            <PreviewLine width="86%" />
            <PreviewLine width="70%" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              <PreviewButton label={t('tutorial.visual.newScenario')} />
              <PreviewButton label={t('tutorial.visual.openCatalog')} tone="soft" />
            </div>
          </div>
          <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <PreviewText color="var(--accent)">{t('home.sections.metricsLabel')}</PreviewText>
            <MiniRow accent="#ef4444" />
            <MiniRow accent="#22c55e" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
              <PreviewLine width="40%" height={9} color={i === 0 ? '#f59e0b' : i === 1 ? '#22c55e' : '#3b82f6'} />
              <PreviewLine width="80%" height={7} />
              <PreviewLine width="58%" height={7} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === 'catalog') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <PreviewHeader page="catalog" t={t} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 8, flex: 1 }}>
            <PreviewText color="var(--text-primary)">{t('catalog.tableHeading')}</PreviewText>
            <PreviewLine width="62%" />
          </div>
          <PreviewButton label={t('tutorial.visual.filters')} tone="soft" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map((color, i) => (
            <div key={color} className="asyncbench-tutorial-card" style={{ padding: 14, minHeight: 86, display: 'grid', gap: 10, borderColor: i === 0 ? 'rgba(37,99,235,0.36)' : 'var(--border)' }}>
              <PreviewLine width="42%" height={8} color={color} />
              <PreviewLine width="76%" />
              <PreviewLine width="52%" />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.78fr', gap: 10 }}>
          <div className="asyncbench-tutorial-card" style={{ padding: 12, display: 'grid', gap: 8 }}>
            <PreviewText color="var(--text-primary)">{t('catalog.compatTable.heading')}</PreviewText>
            <MiniRow accent="#22c55e" />
            <MiniRow accent="#3b82f6" />
          </div>
          <div className="asyncbench-tutorial-card" style={{ padding: 12, display: 'grid', gap: 10, borderColor: 'rgba(37,99,235,0.34)' }}>
            <MiniTabs activeIndex={1} />
            <PreviewText color="var(--text-primary)">{t('catalog.modal.tabs.repro')}</PreviewText>
            <PreviewLine width="82%" height={7} />
            <PreviewLine width="66%" height={7} />
            <PreviewButton label={t('tutorial.visual.useComponent')} tone="soft" />
          </div>
        </div>
      </div>
    );
  }

  if (page === 'scenarios') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <PreviewHeader page="scenarios" t={t} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 8, flex: 1 }}>
            <PreviewText color="var(--text-primary)">{t('scenarios.guide.compatSummary')}</PreviewText>
            <PreviewLine width="64%" />
          </div>
          <PreviewButton label={t('tutorial.visual.newScenario')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <PreviewText color="var(--accent)">{t('tutorial.visual.composition')}</PreviewText>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <MiniField color="#3b82f6" />
              <MiniField color="#22c55e" />
              <MiniField color="#f59e0b" />
              <MiniField color="#8b5cf6" />
            </div>
            <MiniField color="#ef4444" wide />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ width: 34, height: 18, borderRadius: 999, background: 'var(--accent)' }} />
              <PreviewLine width="46%" height={7} />
            </div>
          </div>
          <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <PreviewText color="#22c55e">{t('scenarios.predefined.heading')}</PreviewText>
            <MiniRow accent="#ef4444" active />
            <MiniRow accent="#f59e0b" />
            <MiniRow accent="#3b82f6" />
            <MiniActionDots />
          </div>
        </div>
      </div>
    );
  }

  if (page === 'execucions') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <PreviewHeader page="execucions" t={t} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {['#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'].map(color => (
            <div key={color} className="asyncbench-tutorial-card" style={{ padding: 10, display: 'grid', gap: 7 }}>
              <PreviewLine width="44%" height={7} color={color} />
              <PreviewLine width="78%" height={7} />
            </div>
          ))}
        </div>
        <div className="asyncbench-tutorial-card" style={{ padding: 12, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <PreviewText color="var(--text-primary)">{t('tutorial.visual.executionRow')}</PreviewText>
            <PreviewButton label={t('tutorial.visual.filters')} tone="soft" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.42fr', gap: 10 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <MiniRow accent="#22c55e" active />
              <MiniRow accent="#f59e0b" />
              <MiniRow accent="#ef4444" />
            </div>
            <div className="asyncbench-tutorial-card" style={{ padding: 10, display: 'grid', gap: 8, borderColor: 'rgba(34,197,94,0.34)' }}>
              <PreviewText color="#22c55e">{t('execucions.status.running')}</PreviewText>
              <PreviewLine width="70%" height={7} />
              <PreviewLine width="56%" height={7} />
              <PreviewLine width="82%" height={7} color="#3b82f6" />
              <MiniActionDots />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PreviewButton label={t('tutorial.visual.persistedHistory')} tone="soft" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <PreviewHeader page="resultats" t={t} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        <MiniTabs activeIndex={1} />
        <PreviewButton label={t('tutorial.visual.resultFilters')} tone="soft" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 1.25fr', gap: 10 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="asyncbench-tutorial-card" style={{ padding: 10, display: 'grid', gap: 7 }}>
            <PreviewLine width="40%" height={7} color={i === 0 ? '#3b82f6' : i === 1 ? '#22c55e' : '#f59e0b'} />
            <PreviewLine width="62%" height={9} color="var(--text-primary)" />
          </div>
        ))}
        <div className="asyncbench-tutorial-card" style={{ padding: 10, display: 'grid', gap: 7, borderColor: 'rgba(34,197,94,0.32)' }}>
          <PreviewLine width="38%" height={7} color="#22c55e" />
          <PreviewLine width="80%" height={9} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr', gap: 14 }}>
        <div className="asyncbench-tutorial-card" style={{ padding: 12, display: 'grid', gap: 9 }}>
          <PreviewText color="var(--text-primary)">{t('resultats.tabHistory')}</PreviewText>
          <MiniRow accent="#22c55e" active />
          <MiniRow accent="#3b82f6" />
          <MiniRow accent="#ef4444" />
          <PreviewButton label={t('tutorial.visual.comparison')} tone="soft" />
        </div>
        <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', placeItems: 'center', gap: 10 }}>
          <div style={{ width: 86, height: 86, borderRadius: '50%', border: '10px solid rgba(34,197,94,0.28)', borderTopColor: '#22c55e', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>
            84
          </div>
          <PreviewText color="var(--text-primary)">{t('tutorial.visual.scoreBreakdown')}</PreviewText>
          <div style={{ display: 'grid', gap: 5, width: '100%' }}>
            <PreviewLine width="82%" height={6} color="#3b82f6" />
            <PreviewLine width="64%" height={6} color="#22c55e" />
            <PreviewLine width="48%" height={6} color="#ef4444" />
          </div>
        </div>
      </div>
    </div>
  );
};

const TutorialPreview = ({
  page,
  target,
  stepIndex,
  t,
}: {
  page: TutorialPage;
  target: TutorialTarget;
  stepIndex: number;
  t: (key: string) => string;
}) => (
  <div className="asyncbench-tutorial-preview" aria-hidden="true">
    <div className="asyncbench-tutorial-topbar">
      <span className="asyncbench-tutorial-dot" />
      <span className="asyncbench-tutorial-dot" />
      <span className="asyncbench-tutorial-dot" />
      <PreviewLine width="38%" height={7} />
    </div>
    <div className="asyncbench-tutorial-app">
      <nav className="asyncbench-tutorial-nav">
        {(['home', 'catalog', 'scenarios', 'execucions', 'resultats'] as TutorialPage[]).map(item => (
          <span
            key={item}
            className="asyncbench-tutorial-nav-item"
            data-active={item === page}
          >
            {t(NAV_LABEL_KEYS[item])}
          </span>
        ))}
      </nav>
      <main className="asyncbench-tutorial-content">
        <PreviewContent page={page} t={t} />
      </main>
    </div>
    <div
      key={`target-${page}-${stepIndex}`}
      className="asyncbench-tutorial-target"
      style={{
        left: `${target.x}%`,
        top: `${target.y}%`,
        width: `${target.width}%`,
        height: `${target.height}%`,
      }}
    />
    <div
      key={`cursor-${page}-${stepIndex}`}
      className="asyncbench-tutorial-cursor"
      style={{
        left: `${target.cursorX ?? target.x + target.width - 1}%`,
        top: `${target.cursorY ?? target.y + target.height - 1}%`,
      }}
    >
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" style={{ filter: 'drop-shadow(0 5px 9px rgba(0,0,0,0.32))' }}>
        <path d="M6 3.5L24 17.2L15.6 18.4L12.3 26.5L6 3.5Z" fill="#fff" stroke="#0f172a" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M15.8 18.8L20.4 25.4" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="asyncbench-tutorial-cursor-label">{t(target.labelKey)}</span>
    </div>
  </div>
);

export const TutorialButton = ({
  page,
  createExampleHref,
}: {
  page: TutorialPage;
  createExampleHref?: string;
}) => {
  const { t, tRaw } = useTranslation();
  const storageKey = `apis-asincrones.tutorial.seen.${page}`;
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [, setSeen] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const steps = useMemo(
    () =>
      TUTORIAL_STEPS[page].map(step => {
        const rawDetails = tRaw(step.detailKey);
        const details: string[] = Array.isArray(rawDetails)
          ? rawDetails.flatMap(item => (typeof item === 'string' ? [item] : []))
          : [];
        return {
          ...step,
          title: t(step.titleKey),
          body: t(step.bodyKey),
          details,
        };
      }),
    [page, t, tRaw],
  );

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
    }
  }, [open]);

  const closeAndRemember = () => {
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
    setSeen(true);
    setOpen(false);
  };

  const last = currentStep === steps.length - 1;
  const step = steps[currentStep] ?? steps[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={S.btnTutorial}
      >
        {t('tutorial.show')}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3400,
            background: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={event => {
            if (event.target === event.currentTarget) closeAndRemember();
          }}
        >
          <style>{TUTORIAL_CSS}</style>
          <section
            className="asyncbench-tutorial-shell"
            style={{
              ...S.card,
              width: '100%',
              maxWidth: 980,
              padding: 28,
              boxShadow: 'var(--shadow-lg)',
              animation: 'asyncbench-tutorial-in 0.18s ease',
            }}
          >
            <TutorialPreview page={step.visual} target={step.target} stepIndex={currentStep} t={t} />

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 850, marginBottom: 10 }}>
                {currentStep + 1}/{steps.length}
              </div>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: 0 }}>
                {step.title}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {step.body}
              </p>

              {step.details.length > 0 && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'var(--bg-subtle)',
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 850, color: 'var(--text-primary)' }}>
                    {t('tutorial.keyPoints')}
                  </div>
                  {step.details.map(detail => (
                    <div
                      key={detail}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '8px 1fr',
                        gap: 9,
                        alignItems: 'start',
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', marginTop: 6 }} />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 18 }}>
                {steps.map((_, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    style={{
                      width: index === currentStep ? 22 : 7,
                      height: 7,
                      borderRadius: 999,
                      background: index === currentStep ? 'var(--accent)' : 'var(--border)',
                      transition: 'width 160ms ease, background 160ms ease',
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 'auto', paddingTop: 24, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(stepNumber => Math.max(0, stepNumber - 1))}
                  disabled={currentStep === 0}
                  style={S.btn}
                >
                  {t('tutorial.previous')}
                </button>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={closeAndRemember} style={S.btn}>
                    {t('tutorial.skip')}
                  </button>
                  {last && createExampleHref ? (
                    <a
                      href={createExampleHref}
                      onClick={closeAndRemember}
                      style={{ ...S.btnPrimary, textDecoration: 'none' }}
                    >
                      {t('tutorial.createExample')}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => (last ? closeAndRemember() : setCurrentStep(stepNumber => stepNumber + 1))}
                      style={S.btnPrimary}
                    >
                      {last ? t('tutorial.finish') : t('tutorial.next')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
