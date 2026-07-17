import config from '../config';
import { useT } from '../i18n';

/**
 * Color key that doubles as a filter. Clicking a row toggles whether that
 * need category is shown on the map + in the list. `counts` shows how many
 * of each are currently loaded.
 */
export default function Legend({ enabledNeeds, onToggle, counts }) {
  const t = useT();
  return (
    <div className="pointer-events-auto rounded-md border border-gray-300 bg-white/95 p-2 shadow-sm backdrop-blur">
      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
        {t('legendTitle')}
      </p>
      <ul className="space-y-0.5">
        {Object.entries(config.needs).map(([need, { color }]) => {
          const on = enabledNeeds.has(need);
          const count = counts?.[need] ?? 0;
          return (
            <li key={need}>
              <button
                type="button"
                onClick={() => onToggle(need)}
                className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-gray-100 ${
                  on ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border"
                  style={{
                    backgroundColor: on ? color : 'transparent',
                    borderColor: color,
                  }}
                />
                <span className="flex-1 font-medium">{t(`need_${need}`)}</span>
                <span className="tabular-nums text-[11px] text-gray-400">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
