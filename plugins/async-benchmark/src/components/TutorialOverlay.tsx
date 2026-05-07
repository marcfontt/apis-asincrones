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
  visual: TutorialPage;
  target: TutorialTarget;
};

const TUTORIAL_STEPS: Record<TutorialPage, TutorialStepConfig[]> = {
  home: [
    {
      titleKey: 'tutorial.home.step1.title',
      bodyKey: 'tutorial.home.step1.body',
      visual: 'home',
      target: { labelKey: 'tutorial.visual.homeStart', x: 10, y: 16, width: 39, height: 22, cursorX: 45, cursorY: 35 },
    },
    {
      titleKey: 'tutorial.home.step2.title',
      bodyKey: 'tutorial.home.step2.body',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.catalogCard', x: 11, y: 36, width: 24, height: 24, cursorX: 32, cursorY: 56 },
    },
    {
      titleKey: 'tutorial.home.step3.title',
      bodyKey: 'tutorial.home.step3.body',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.newScenario', x: 67, y: 13, width: 23, height: 10, cursorX: 87, cursorY: 21 },
    },
    {
      titleKey: 'tutorial.home.step4.title',
      bodyKey: 'tutorial.home.step4.body',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.executionRow', x: 11, y: 45, width: 78, height: 12, cursorX: 85, cursorY: 55 },
    },
    {
      titleKey: 'tutorial.home.step5.title',
      bodyKey: 'tutorial.home.step5.body',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.scoreDetail', x: 69, y: 26, width: 20, height: 26, cursorX: 88, cursorY: 48 },
    },
  ],
  catalog: [
    {
      titleKey: 'tutorial.catalog.step1.title',
      bodyKey: 'tutorial.catalog.step1.body',
      visual: 'catalog',
      target: { labelKey: 'tutorial.visual.catalogCard', x: 11, y: 36, width: 24, height: 24, cursorX: 32, cursorY: 56 },
    },
  ],
  scenarios: [
    {
      titleKey: 'tutorial.scenarios.step1.title',
      bodyKey: 'tutorial.scenarios.step1.body',
      visual: 'scenarios',
      target: { labelKey: 'tutorial.visual.newScenario', x: 67, y: 13, width: 23, height: 10, cursorX: 87, cursorY: 21 },
    },
  ],
  execucions: [
    {
      titleKey: 'tutorial.execucions.step1.title',
      bodyKey: 'tutorial.execucions.step1.body',
      visual: 'execucions',
      target: { labelKey: 'tutorial.visual.executionRow', x: 11, y: 45, width: 78, height: 12, cursorX: 85, cursorY: 55 },
    },
  ],
  resultats: [
    {
      titleKey: 'tutorial.resultats.step1.title',
      bodyKey: 'tutorial.resultats.step1.body',
      visual: 'resultats',
      target: { labelKey: 'tutorial.visual.historyRow', x: 10, y: 57, width: 58, height: 11, cursorX: 66, cursorY: 66 },
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
  0%, 100% { transform: translate(-6px, -4px) scale(1); }
  46% { transform: translate(0, 0) scale(1); }
  55% { transform: translate(0, 0) scale(0.9); }
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
  background: rgba(37,99,235,0.05);
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
  display: grid;
  grid-template-columns: 112px 1fr;
  min-height: 326px;
}
.asyncbench-tutorial-nav {
  border-right: 1px solid var(--border);
  padding: 14px 10px;
  background: var(--bg-subtle);
}
.asyncbench-tutorial-nav span,
.asyncbench-tutorial-line {
  display: block;
  border-radius: 999px;
  background: var(--border);
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
    grid-template-columns: 82px 1fr;
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

const PreviewContent = ({ page, t }: { page: TutorialPage; t: (key: string) => string }) => {
  if (page === 'home') {
    return (
      <div style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <PreviewLine width="54%" height={15} color="var(--text-primary)" />
            <PreviewLine width="86%" />
            <PreviewLine width="70%" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              <PreviewButton label={t('tutorial.visual.newScenario')} />
              <PreviewButton label={t('tutorial.visual.openCatalog')} tone="soft" />
            </div>
          </div>
          <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <PreviewLine width="45%" height={8} color="var(--accent)" />
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 8, flex: 1 }}>
            <PreviewLine width="34%" height={14} color="var(--text-primary)" />
            <PreviewLine width="62%" />
          </div>
          <PreviewButton label={t('tutorial.visual.filters')} tone="soft" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#14b8a6'].map((color, i) => (
            <div key={color} className="asyncbench-tutorial-card" style={{ padding: 14, minHeight: 86, display: 'grid', gap: 10, borderColor: i === 0 ? 'rgba(37,99,235,0.36)' : 'var(--border)' }}>
              <PreviewLine width="42%" height={8} color={color} />
              <PreviewLine width="76%" />
              <PreviewLine width="52%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page === 'scenarios') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 8, flex: 1 }}>
            <PreviewLine width="42%" height={14} color="var(--text-primary)" />
            <PreviewLine width="64%" />
          </div>
          <PreviewButton label={t('tutorial.visual.newScenario')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <PreviewLine width="40%" height={9} color="var(--accent)" />
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 0.6fr', gap: 8 }}>
                <PreviewLine width="100%" />
                <PreviewLine width="100%" color="var(--bg-hover)" />
              </div>
            ))}
          </div>
          <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', gap: 10 }}>
            <PreviewLine width="52%" height={9} color="#22c55e" />
            <MiniRow accent="#ef4444" active />
            <MiniRow accent="#f59e0b" />
            <MiniRow accent="#3b82f6" />
          </div>
        </div>
      </div>
    );
  }

  if (page === 'execucions') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
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
            <PreviewLine width="28%" height={10} color="var(--text-primary)" />
            <PreviewButton label={t('tutorial.visual.filters')} tone="soft" />
          </div>
          <MiniRow accent="#22c55e" active />
          <MiniRow accent="#f59e0b" />
          <MiniRow accent="#ef4444" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
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
          <PreviewLine width="36%" height={10} color="var(--text-primary)" />
          <MiniRow accent="#22c55e" active />
          <MiniRow accent="#3b82f6" />
          <MiniRow accent="#ef4444" />
        </div>
        <div className="asyncbench-tutorial-card" style={{ padding: 14, display: 'grid', placeItems: 'center', gap: 10 }}>
          <div style={{ width: 86, height: 86, borderRadius: '50%', border: '10px solid rgba(34,197,94,0.28)', borderTopColor: '#22c55e', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>
            84
          </div>
          <PreviewLine width="58%" height={8} color="var(--text-primary)" />
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
        <div style={{ display: 'grid', gap: 12 }}>
          <PreviewLine width="72%" height={10} color="var(--text-primary)" />
          {['home', 'catalog', 'scenarios', 'execucions', 'resultats'].map(item => (
            <span
              key={item}
              style={{
                height: 9,
                width: item === page ? '84%' : '58%',
                background: item === page ? 'var(--accent)' : 'var(--border)',
                opacity: item === page ? 0.95 : 1,
              }}
            />
          ))}
        </div>
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
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.28))' }}>
        <path d="M5 3L23 15L15 17L12 25L5 3Z" fill="var(--bg-card)" stroke="var(--text-primary)" strokeWidth="1.7" strokeLinejoin="round" />
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
  const { t } = useTranslation();
  const storageKey = `apis-asincrones.tutorial.seen.${page}`;
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [seen, setSeen] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  const steps = useMemo(
    () =>
      TUTORIAL_STEPS[page].map(step => ({
        ...step,
        title: t(step.titleKey),
        body: t(step.bodyKey),
      })),
    [page, t],
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
        style={{ ...S.btn, fontWeight: 700 }}
      >
        {seen ? t('tutorial.replay') : t('tutorial.show')}
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
