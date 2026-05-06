import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../i18n';
import { S } from '../theme';

type TutorialPage = 'home' | 'catalog' | 'scenarios' | 'execucions' | 'resultats';

const STEP_COUNTS: Record<TutorialPage, number> = {
  home: 5,
  catalog: 1,
  scenarios: 1,
  execucions: 1,
  resultats: 1,
};

export const DEMO_SCENARIO_URL =
  '/escenaris?create=true&platform=Kafka&architecture=EDA&protocol=Kafka&duration=360&rate=20000&payloadSize=500&dataFormat=default';

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
      Array.from({ length: STEP_COUNTS[page] }, (_, index) => ({
        title: t(`tutorial.${page}.step${index + 1}.title`),
        body: t(`tutorial.${page}.step${index + 1}.body`),
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
            background: 'rgba(0,0,0,0.60)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={event => {
            if (event.target === event.currentTarget) closeAndRemember();
          }}
        >
          <section
            style={{
              ...S.card,
              width: '100%',
              maxWidth: 480,
              padding: 28,
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeUp 0.18s ease',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 850, marginBottom: 10 }}>
              {currentStep + 1}/{steps.length}
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>
              {steps[currentStep]?.title}
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {steps[currentStep]?.body}
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(step => Math.max(0, step - 1))}
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
                    onClick={() => (last ? closeAndRemember() : setCurrentStep(step => step + 1))}
                    style={S.btnPrimary}
                  >
                    {last ? t('tutorial.finish') : t('tutorial.next')}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
