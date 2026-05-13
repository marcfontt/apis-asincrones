// Overlay de tutorial guiado compartido por todas las páginas.
//
// Cada página llama a <TutorialButton page="..." /> para abrir un modal
// que explica los pasos clave y enlaza a la página real. Se eliminó el
// preview sintético (no era representativo de la UI real) y ahora cada
// paso muestra: numeración, título, explicación, lista de puntos clave
// y un CTA que abre la página real para que el usuario vea el flujo en
// el portal en vez de en una maqueta.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from '../i18n';
import { S } from '../theme';

type TutorialPage = 'home' | 'catalog' | 'scenarios' | 'execucions' | 'resultats';

type TutorialStepConfig = {
  titleKey: string;
  bodyKey: string;
  detailKey: string;
  visual: TutorialPage;
};

const TUTORIAL_STEPS: Record<TutorialPage, TutorialStepConfig[]> = {
  home: [
    { titleKey: 'tutorial.home.step1.title', bodyKey: 'tutorial.home.step1.body', detailKey: 'tutorial.home.step1.details', visual: 'home' },
    { titleKey: 'tutorial.home.step2.title', bodyKey: 'tutorial.home.step2.body', detailKey: 'tutorial.home.step2.details', visual: 'catalog' },
    { titleKey: 'tutorial.home.step3.title', bodyKey: 'tutorial.home.step3.body', detailKey: 'tutorial.home.step3.details', visual: 'scenarios' },
    { titleKey: 'tutorial.home.step4.title', bodyKey: 'tutorial.home.step4.body', detailKey: 'tutorial.home.step4.details', visual: 'execucions' },
    { titleKey: 'tutorial.home.step5.title', bodyKey: 'tutorial.home.step5.body', detailKey: 'tutorial.home.step5.details', visual: 'resultats' },
  ],
  catalog: [
    { titleKey: 'tutorial.catalog.step1.title', bodyKey: 'tutorial.catalog.step1.body', detailKey: 'tutorial.catalog.step1.details', visual: 'catalog' },
    { titleKey: 'tutorial.catalog.step2.title', bodyKey: 'tutorial.catalog.step2.body', detailKey: 'tutorial.catalog.step2.details', visual: 'catalog' },
    { titleKey: 'tutorial.catalog.step3.title', bodyKey: 'tutorial.catalog.step3.body', detailKey: 'tutorial.catalog.step3.details', visual: 'catalog' },
    { titleKey: 'tutorial.catalog.step4.title', bodyKey: 'tutorial.catalog.step4.body', detailKey: 'tutorial.catalog.step4.details', visual: 'catalog' },
    { titleKey: 'tutorial.catalog.step5.title', bodyKey: 'tutorial.catalog.step5.body', detailKey: 'tutorial.catalog.step5.details', visual: 'catalog' },
  ],
  scenarios: [
    { titleKey: 'tutorial.scenarios.step1.title', bodyKey: 'tutorial.scenarios.step1.body', detailKey: 'tutorial.scenarios.step1.details', visual: 'scenarios' },
    { titleKey: 'tutorial.scenarios.step2.title', bodyKey: 'tutorial.scenarios.step2.body', detailKey: 'tutorial.scenarios.step2.details', visual: 'scenarios' },
    { titleKey: 'tutorial.scenarios.step3.title', bodyKey: 'tutorial.scenarios.step3.body', detailKey: 'tutorial.scenarios.step3.details', visual: 'scenarios' },
    { titleKey: 'tutorial.scenarios.step4.title', bodyKey: 'tutorial.scenarios.step4.body', detailKey: 'tutorial.scenarios.step4.details', visual: 'scenarios' },
    { titleKey: 'tutorial.scenarios.step5.title', bodyKey: 'tutorial.scenarios.step5.body', detailKey: 'tutorial.scenarios.step5.details', visual: 'scenarios' },
  ],
  execucions: [
    { titleKey: 'tutorial.execucions.step1.title', bodyKey: 'tutorial.execucions.step1.body', detailKey: 'tutorial.execucions.step1.details', visual: 'execucions' },
    { titleKey: 'tutorial.execucions.step2.title', bodyKey: 'tutorial.execucions.step2.body', detailKey: 'tutorial.execucions.step2.details', visual: 'execucions' },
    { titleKey: 'tutorial.execucions.step3.title', bodyKey: 'tutorial.execucions.step3.body', detailKey: 'tutorial.execucions.step3.details', visual: 'execucions' },
    { titleKey: 'tutorial.execucions.step4.title', bodyKey: 'tutorial.execucions.step4.body', detailKey: 'tutorial.execucions.step4.details', visual: 'execucions' },
    { titleKey: 'tutorial.execucions.step5.title', bodyKey: 'tutorial.execucions.step5.body', detailKey: 'tutorial.execucions.step5.details', visual: 'execucions' },
  ],
  resultats: [
    { titleKey: 'tutorial.resultats.step1.title', bodyKey: 'tutorial.resultats.step1.body', detailKey: 'tutorial.resultats.step1.details', visual: 'resultats' },
    { titleKey: 'tutorial.resultats.step2.title', bodyKey: 'tutorial.resultats.step2.body', detailKey: 'tutorial.resultats.step2.details', visual: 'resultats' },
    { titleKey: 'tutorial.resultats.step3.title', bodyKey: 'tutorial.resultats.step3.body', detailKey: 'tutorial.resultats.step3.details', visual: 'resultats' },
    { titleKey: 'tutorial.resultats.step4.title', bodyKey: 'tutorial.resultats.step4.body', detailKey: 'tutorial.resultats.step4.details', visual: 'resultats' },
    { titleKey: 'tutorial.resultats.step5.title', bodyKey: 'tutorial.resultats.step5.body', detailKey: 'tutorial.resultats.step5.details', visual: 'resultats' },
  ],
};

export const DEMO_SCENARIO_URL =
  '/escenaris?create=true&platform=Kafka&architecture=EDA&protocol=Kafka&duration=360&rate=20000&payloadSize=500&dataFormat=default';

// Ruta real de cada página dentro del portal. Cada paso del tutorial usa
// esta tabla para saber a dónde navegar cuando el usuario decide ver la
// pantalla real.
const PAGE_ROUTES: Record<TutorialPage, string> = {
  home: '/home',
  catalog: '/catalog',
  scenarios: '/escenaris',
  execucions: '/execucions',
  resultats: '/resultats',
};

const NAV_LABEL_KEYS: Record<TutorialPage, string> = {
  home: 'nav.home',
  catalog: 'nav.catalog',
  scenarios: 'nav.escenaris',
  execucions: 'nav.execucions',
  resultats: 'nav.resultats',
};

// Color identificador de cada página (mismo código que la nav real).
const PAGE_COLORS: Record<TutorialPage, string> = {
  home: '#2563eb',
  catalog: '#f59e0b',
  scenarios: '#7c3aed',
  execucions: '#16a34a',
  resultats: '#dc2626',
};

const TUTORIAL_CSS = `
@keyframes asyncbench-tutorial-in {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes asyncbench-tutorial-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.28); }
  50% { box-shadow: 0 0 0 12px rgba(37,99,235,0); }
}
.asyncbench-tutorial-shell {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(280px, 1.05fr);
  gap: 24px;
}
.asyncbench-tutorial-pagecard {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-surface);
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 360px;
}
.asyncbench-tutorial-stepdot {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 24px;
  font-weight: 900;
  animation: asyncbench-tutorial-pulse 2s ease-in-out infinite;
}
.asyncbench-tutorial-pagebadge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.asyncbench-tutorial-stepscroll {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}
.asyncbench-tutorial-steplink {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  font-family: var(--font);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.asyncbench-tutorial-steplink[data-active="true"] {
  border-color: var(--border);
  background: var(--bg-hover);
  color: var(--text-primary);
}
.asyncbench-tutorial-steplink:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.asyncbench-tutorial-steplink-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 800;
  color: var(--text-primary);
}
.asyncbench-tutorial-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 12.5px;
  font-weight: 800;
  border: 1px solid transparent;
  transition: filter 120ms ease, transform 120ms ease;
}
.asyncbench-tutorial-cta:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}
@media (max-width: 780px) {
  .asyncbench-tutorial-shell {
    grid-template-columns: 1fr;
  }
}
`;

interface TutorialStepCardProps {
  visual: TutorialPage;
  stepNumber: number;
  totalSteps: number;
  steps: Array<{ title: string; visual: TutorialPage }>;
  currentIndex: number;
  onSelectStep: (index: number) => void;
  t: (key: string) => string;
  onNavigate: () => void;
}

const TutorialStepCard = ({
  visual,
  stepNumber,
  totalSteps,
  steps,
  currentIndex,
  onSelectStep,
  t,
  onNavigate,
}: TutorialStepCardProps) => {
  const color = PAGE_COLORS[visual];
  const route = PAGE_ROUTES[visual];
  const navLabel = t(NAV_LABEL_KEYS[visual]);

  const cardStyle: CSSProperties = {
    border: `1px solid ${color}33`,
    background: `linear-gradient(160deg, ${color}10, var(--bg-surface))`,
  };

  const stepDotStyle: CSSProperties = {
    background: `${color}1a`,
    color,
    border: `2px solid ${color}55`,
  };

  const pageBadgeStyle: CSSProperties = {
    background: `${color}1a`,
    color,
    border: `1px solid ${color}33`,
  };

  const ctaStyle: CSSProperties = {
    background: color,
    color: '#fff',
  };

  return (
    <div className="asyncbench-tutorial-pagecard" style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div className="asyncbench-tutorial-stepdot" style={stepDotStyle}>
          {stepNumber}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="asyncbench-tutorial-pagebadge" style={pageBadgeStyle}>
            {navLabel}
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {route} · {t('tutorial.stepCounter').replace('{current}', String(stepNumber)).replace('{total}', String(totalSteps))}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 850, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {t('tutorial.stepIndex')}
        </div>
        <div className="asyncbench-tutorial-stepscroll">
          {steps.map((step, index) => (
            <button
              type="button"
              key={`${step.title}-${index}`}
              className="asyncbench-tutorial-steplink"
              data-active={index === currentIndex}
              onClick={() => onSelectStep(index)}
            >
              <span className="asyncbench-tutorial-steplink-num">{index + 1}</span>
              <span>{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      <a href={route} onClick={onNavigate} className="asyncbench-tutorial-cta" style={ctaStyle}>
        {t('tutorial.openPage').replace('{page}', navLabel)}
      </a>
    </div>
  );
};

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
            <TutorialStepCard
              visual={step.visual}
              stepNumber={currentStep + 1}
              totalSteps={steps.length}
              steps={steps.map(({ title, visual }) => ({ title, visual }))}
              currentIndex={currentStep}
              onSelectStep={setCurrentStep}
              t={t}
              onNavigate={closeAndRemember}
            />

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
