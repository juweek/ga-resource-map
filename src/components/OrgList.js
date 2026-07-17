import { memo, useEffect, useRef, useState } from 'react';
import config from '../config';
import { useT, typeLabel } from '../i18n';
import { googleDirectionsUrl, googlePlaceUrl } from '../utils/mapsLinks';

const NEED_KEYS = Object.keys(config.needs);

// Muted, tinted status badges. Colors are shared with the map tooltip via
// config.statusColors; the label key is per-status.
const STATUS_STYLE = {
  open: { key: 'statusOpen', ...config.statusColors.open },
  closed: { key: 'statusClosed', ...config.statusColors.closed },
  unknown: { key: 'statusUnknown', ...config.statusColors.unknown },
};

const actionButtonClass =
  'inline-flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-600';
const filterControlClass =
  'h-9 rounded-md border border-gray-400 px-3 text-base text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm';

const OrgCard = memo(function OrgCard({
  resource,
  isSelected,
  directionsOrigin,
  onSelect,
  onHover,
}) {
  const t = useT();
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const needColor = config.needs[resource.need]?.color || config.fallbackColor;
  const status = STATUS_STYLE[resource.status] || STATUS_STYLE.unknown;

  // Scroll the selected card into view when selection is driven from the map.
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  // Share the location's Google Maps link: the native share sheet on
  // phones, otherwise copy the link to the clipboard.
  const handleShare = async (e) => {
    e.stopPropagation();
    const url = googlePlaceUrl(resource);
    if (navigator.share) {
      try {
        await navigator.share({ title: resource.name, url });
      } catch {} // user closed the share sheet
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers: copy via a temporary text box
      const box = document.createElement('textarea');
      box.value = url;
      document.body.appendChild(box);
      box.select();
      document.execCommand('copy');
      box.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li
      ref={ref}
      onClick={() => onSelect(isSelected ? null : resource.id)}
      onMouseEnter={() => onHover(resource.id)}
      onMouseLeave={() => onHover(null)}
      className={`cursor-pointer border-l-4 px-4 py-3 transition-colors ${
        isSelected ? 'bg-brand-50' : 'hover:bg-gray-100'
      }`}
      style={{ borderLeftColor: needColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-sm font-semibold leading-snug text-gray-900">
          {resource.name}
        </h3>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {resource.distance != null && (
            <span className="whitespace-nowrap text-xs text-gray-600">
              {resource.distance.toFixed(1)} {t('miles')}
            </span>
          )}
          {/* Rotates to point up when the card is open. */}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isSelected ? 'rotate-180' : ''
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-gray-400 px-1.5 py-0.5 text-[11px] font-medium text-gray-700">
          {typeLabel(t, resource.resourceType)}
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: status.bg, color: status.fg }}
        >
          {t(status.key)}
        </span>
      </div>

      <p className="mt-1.5 text-xs text-gray-700">
        {resource.address}
        {resource.address && (resource.city || resource.zip) ? ', ' : ''}
        {resource.city} {resource.zip}
      </p>

      {resource.phone && (
        <a
          href={`tel:${resource.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 inline-block text-xs font-medium text-brand-500 hover:underline"
        >
          {resource.phone}
        </a>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={googleDirectionsUrl(directionsOrigin, resource)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={actionButtonClass}
        >
          {t('directions')}
        </a>
        <a
          href={googlePlaceUrl(resource)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={actionButtonClass}
        >
          {t('viewOnMap')}
        </a>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1 rounded-md border border-gray-400 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
        >
          {copied ? t('copied') : t('share')}
        </button>
      </div>

      {isSelected && (
        <div className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-700">
          {resource.hours.length > 0 ? (
            <ul className="space-y-0.5">
              {resource.hours.map((h) => (
                <li key={h.day} className="flex justify-between">
                  <span className="text-gray-600">{t('days')[h.day] || h.day}</span>
                  <span>{h.hours}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">{t('noHours')}</p>
          )}
          {resource.website && (
            <a
              href={resource.website}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-block font-medium text-brand-500 hover:underline"
            >
              {t('website')}
            </a>
          )}
        </div>
      )}
    </li>
  );
});

export default function OrgList({
  known, // resources with hours on file, sorted
  unknown, // resources without hours, sorted (rendered under a divider)
  loading,
  hasSearched,
  selectedId,
  directionsOrigin,
  onSelect,
  onHover,
  onRandom,
  query,
  onQueryChange,
  sortBy,
  onSortChange,
  enabledNeeds,
  onToggleNeed,
  needCounts,
}) {
  const t = useT();
  const shown = known.length + unknown.length;
  const subtitle = loading
    ? t('searching')
    : !hasSearched
      ? ' ' // blank line before a search — keeps the header height steady
      : ' '; // blank after a search too — the "N in view" count was removed

  const renderCard = (r) => (
    <OrgCard
      key={r.id}
      resource={r}
      isSelected={r.id === selectedId}
      directionsOrigin={directionsOrigin}
      onSelect={onSelect}
      onHover={onHover}
    />
  );

  return (
    <div className="flex h-full flex-col border-t border-gray-300 bg-white md:border-l md:border-t-0">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-bold text-gray-900">
            {t('listTitle')}
          </h2>
          {shown > 0 && (
            <button
              type="button"
              onClick={onRandom}
              className="shrink-0 rounded-md border border-gray-400 px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-100"
            >
              {t('random')}
            </button>
          )}
        </div>
        {/* Reserve one line's height so the layout stays put whether the
            subtitle shows "Searching…" or a blank space. */}
        <p className="min-h-4 text-xs text-gray-600">{subtitle}</p>

        {/* Need filter chips (same state as the map legend) */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {NEED_KEYS.map((need) => {
            const on = enabledNeeds.has(need);
            const { color } = config.needs[need];
            const count = needCounts?.[need];
            return (
              <button
                key={need}
                type="button"
                onClick={() => onToggleNeed(need)}
                aria-pressed={on}
                className="rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors"
                style={
                  on
                    ? { backgroundColor: color + '1e', borderColor: color, color }
                    : { borderColor: '#c8cbc7', color: '#8b9188' }
                }
              >
                {t(`need_${need}`)}
                {count ? ` · ${count}` : ''}
              </button>
            );
          })}
        </div>

        {/* Name search + sort */}
        <div className="mt-4 flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('filterPlaceholder')}
            className={`min-w-0 flex-1 ${filterControlClass}`}
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            {t('sortLabel')}
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className={filterControlClass}
            >
              <option value="distance">{t('sortDistance')}</option>
              <option value="name">{t('sortName')}</option>
              <option value="open">{t('sortOpen')}</option>
            </select>
          </label>
        </div>
      </div>

      <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {!loading && hasSearched && shown === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-600">
            {t('listEmpty')}
          </li>
        )}
        {known.map(renderCard)}
        {unknown.length > 0 && (
          <li className="bg-gray-200 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
            {t('unknownDivider')}
          </li>
        )}
        {unknown.map(renderCard)}
      </ul>
    </div>
  );
}
