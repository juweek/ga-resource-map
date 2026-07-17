import config from '../config';
import { useT } from '../i18n';

const NEEDS = Object.keys(config.needs);

/**
 * Above-the-fold intro. The "What do you need?" buttons pick a broad
 * category so people don't have to reason about pantry-vs-bank-vs-fridge;
 * `onPickNeed` selects it and moves focus to the location field.
 *
 * `activeNeed` is the currently picked need (or null). Only that button is
 * highlighted, so nothing is highlighted before the user picks one.
 */
export default function Intro({ onPickNeed, activeNeed }) {
  const t = useT();
  return (
    <section className="border-b border-gray-300 bg-[#f7f5f0] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-6xl font-extrabold leading-none tracking-tight text-brand-500 sm:text-8xl lg:text-9xl">
          {t('title')}
        </h1>
        <p className="mt-4 flex items-center gap-3 font-display text-xl font-medium text-gray-600 sm:text-2xl">
          <span
            aria-hidden="true"
            className="h-6 w-1 shrink-0 rounded-full bg-brand-500 sm:h-7"
          />
          {t('tagline')}
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-700 sm:text-base">
          {t('introLead')}
        </p>

        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-700">
          {t('introNeedsTitle')}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {NEEDS.map((need) => {
            const color = config.needs[need].color;
            const active = need === activeNeed;
            return (
              <button
                key={need}
                type="button"
                onClick={() => onPickNeed(need)}
                aria-pressed={active}
                className={`rounded-md border bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 shadow-sm transition-all ${
                  active ? 'border-transparent' : 'border-gray-400 hover:border-gray-600'
                }`}
                style={
                  active
                    ? {
                        borderLeftWidth: 4,
                        borderLeftColor: color,
                        backgroundColor: color + '14',
                        boxShadow: `0 0 0 2px ${color}`,
                      }
                    : { borderLeftWidth: 4, borderLeftColor: color }
                }
              >
                {t(`intro_${need}`)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
