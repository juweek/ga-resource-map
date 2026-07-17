import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import config from '../config';
import { LangProvider, LANGUAGES, getT } from '../i18n';
import { searchNearbyModes } from '../utils/feedAmerica';
import { geocodeLocation } from '../utils/geocode';
import { openStatus } from '../utils/hours';
import {
  fetchIsochrone,
  fetchRadiusMiles,
  pointInPolygon,
  ringCenterRadius,
} from '../utils/isochrone';
import Intro from './Intro';
import ResourceMap from './ResourceMap';
import OrgList from './OrgList';
import Legend from './Legend';

const { profiles, defaultProfile, minutesOptions, defaultMinutes } = config.travel;

// Max cards rendered in the list at once — keeps the DOM light on phones.
// The map still shows every marker; the list shows the nearest N in view.
const LIST_CAP = 75;

// API modes required to cover a set of enabled needs. Several needs can share
// one mode (e.g. meals + groceries both come from the "free" dataset), so we
// dedupe with a Set.
function modesFor(needs) {
  const modes = new Set();
  for (const need of needs) config.needs[need].modes.forEach((m) => modes.add(m));
  return [...modes];
}

// Most translated strings are plain text, but a few are functions that take an
// argument (e.g. the ZIP that wasn't found). Call the function form when needed.
function translate(t, key, arg) {
  const value = t(key);
  return typeof value === 'function' ? value(arg) : value;
}

/**
 * FoodFinderMap — the whole app in one component.
 *
 * Data flows one way, and each step below is *derived* from the one above it
 * with useMemo, so the UI re-computes automatically when its inputs change:
 *
 *   resources          raw results from the Feed America API (set by load())
 *   → enriched         + a live open / closed / unknown status per resource
 *   → mapResources     filtered to the enabled needs + reachable area  → map dots
 *   → visibleResources further filtered to the map viewport + search    → the list
 *   → knownList /      visibleResources sorted, then split into "has hours"
 *     unknownList        and "hours unknown" groups                     → list sections
 *
 * The useState values near the top are the only things you set directly;
 * everything else is derived from them.
 */
export default function FoodFinderMap() {
  const [lang, setLang] = useState('en');
  const t = getT(lang);

  // Search inputs
  const [locationInput, setLocationInput] = useState('');
  const [profile, setProfile] = useState(defaultProfile);
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [enabledNeeds, setEnabledNeeds] = useState(() => new Set(config.defaultNeeds));

  // Results
  const [center, setCenter] = useState(null);
  const centerRef = useRef(null); // cached so control changes skip re-geocoding
  const [resources, setResources] = useState([]);
  // The exact arguments of the last load(), so toggling a need on can re-run
  // the same search with an extra mode: load({ ...lastFetchRef.current, modes }).
  const lastFetchRef = useRef(null); // { loc, radiusMiles, iso, modes }
  // The reachable area: an isochrone polygon, or a hand-drawn one.
  const [area, setArea] = useState(null); // { kind: 'isochrone' | 'drawn', feature }
  const [drawing, setDrawing] = useState(false);
  // Bumped to send the map back to its default view (see handleClearDrawnArea).
  const [resetToken, setResetToken] = useState(0);

  // List controls
  const [bounds, setBounds] = useState(null); // mapbox LngLatBounds
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('distance'); // distance | name | open
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // { key, arg? } → translated at render
  const [hasSearched, setHasSearched] = useState(false);
  const [userLocation, setUserLocation] = useState(null); // {lat,lng} for directions

  const abortRef = useRef(null);
  const mapSectionRef = useRef(null);
  const locationRef = useRef(null);

  // Move focus to the location field and bring it into view — used by the
  // "what do you need?" shortcuts and the pre-search map overlay.
  const focusLocation = useCallback(() => {
    locationRef.current?.focus();
    locationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Ask the browser for the user's location once, for the "Directions" links.
  // If denied or unavailable we silently fall back to the searched ZIP center.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  /**
   * Fetch the resources around a location, then show them. Takes one options
   * object so every call site reads clearly:
   *
   *   loc          { lat, lng } — center of the search
   *   radiusMiles  how far out to ask the API for resources
   *   iso          { profile, minutes } to also draw a travel-time area, or null
   *   modes        which API datasets to fetch (see modesFor)
   */
  const load = useCallback(async ({ loc, radiusMiles, iso, modes }) => {
    setError(null);
    setLoading(true);
    setSelectedId(null);
    lastFetchRef.current = { loc, radiusMiles, iso, modes };

    // Cancel any in-flight request so a fast second search wins.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [found, isoFeature] = await Promise.all([
        searchNearbyModes(loc.lat, loc.lng, modes, radiusMiles, controller.signal),
        iso
          ? fetchIsochrone(iso.profile, iso.minutes, loc, controller.signal)
              .catch(() => null) // isochrone failure → fall back to plain radius
          : Promise.resolve(undefined),
      ]);
      setResources(found);
      if (iso) setArea(isoFeature ? { kind: 'isochrone', feature: isoFeature } : null);
      setHasSearched(true);
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error(e);
        setError({ key: 'errFetch' });
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  /** Location (ZIP or address) + travel-time search. */
  const runSearch = useCallback(
    async (locationText, prof, mins, needs) => {
      const q = String(locationText).trim();
      if (!q) {
        setError({ key: 'errNoLocation' });
        focusLocation();
        return;
      }
      let loc;
      try {
        loc = await geocodeLocation(q);
      } catch {
        setError({ key: 'errZipLookup' });
        return;
      }
      if (!loc) {
        setError({ key: 'errLocNotFound', arg: q });
        return;
      }
      centerRef.current = { lng: loc.lng, lat: loc.lat };
      setCenter(centerRef.current);
      load({
        loc,
        radiusMiles: fetchRadiusMiles(prof, mins),
        iso: { profile: prof, minutes: mins },
        modes: modesFor(needs),
      });
    },
    [load, focusLocation]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch(locationInput, profile, minutes, enabledNeeds);
  };

  // Changing travel mode or minutes re-runs the search from the cached center.
  const changeProfile = (nextProfile) => {
    setProfile(nextProfile);
    if (centerRef.current)
      load({
        loc: centerRef.current,
        radiusMiles: fetchRadiusMiles(nextProfile, minutes),
        iso: { profile: nextProfile, minutes },
        modes: modesFor(enabledNeeds),
      });
  };
  const changeMinutes = (e) => {
    const nextMinutes = Number(e.target.value);
    setMinutes(nextMinutes);
    if (centerRef.current)
      load({
        loc: centerRef.current,
        radiusMiles: fetchRadiusMiles(profile, nextMinutes),
        iso: { profile, minutes: nextMinutes },
        modes: modesFor(enabledNeeds),
      });
  };

  // Toggling a need is a client-side filter — unless it requires an API
  // mode we haven't fetched yet, in which case the last search re-runs.
  const handleToggleNeed = useCallback(
    (need) => {
      setEnabledNeeds((prev) => {
        const next = new Set(prev);
        if (next.has(need)) next.delete(need);
        else next.add(need);

        // Re-fetch only if the new set needs a mode we haven't loaded yet;
        // otherwise it's just a client-side filter change (free).
        const last = lastFetchRef.current;
        if (last && !modesFor(next).every((m) => last.modes.includes(m))) {
          load({ ...last, modes: modesFor(next) });
        }
        return next;
      });
    },
    [load]
  );

  // Intro shortcut: "I need a meal" narrows to that one need and jumps to the
  // location box. If a search already ran, re-fetch when the need needs a mode
  // we haven't loaded yet.
  const handlePickNeed = useCallback(
    (need) => {
      setEnabledNeeds(new Set([need]));
      const last = lastFetchRef.current;
      if (last && !last.modes.includes(config.needs[need].modes[0])) {
        load({ ...last, modes: modesFor(new Set([need])) });
      }
      focusLocation();
    },
    [load, focusLocation]
  );

  // A finished hand-drawn shape becomes the area filter, and we fetch
  // everything inside its bounding box.
  const handleDrawComplete = useCallback(
    (ring) => {
      setDrawing(false);
      if (ring.length < 3) return;
      setArea({
        kind: 'drawn',
        feature: {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
          properties: {},
        },
      });
      const { lng, lat, radius } = ringCenterRadius(ring);
      centerRef.current = { lng, lat };
      setCenter(centerRef.current);
      // No `iso` — the drawn shape is the area, so we don't fetch a travel-time one.
      load({ loc: { lng, lat }, radiusMiles: radius, iso: null, modes: modesFor(enabledNeeds) });
    },
    [load, enabledNeeds]
  );

  // Clear a hand-drawn area and zoom back out to the default statewide view.
  // Loaded resources stay put; only the drawn shape and the camera reset.
  const handleClearDrawnArea = useCallback(() => {
    setArea(null);
    setCenter(null);
    centerRef.current = null;
    setResetToken((n) => n + 1);
  }, []);

  const handleBoundsChange = useCallback((b) => setBounds(b), []);

  // Attach a live open/closed status to each resource (badges + tooltips).
  const enriched = useMemo(
    () => resources.map((r) => ({ ...r, status: openStatus(r.hours) })),
    [resources]
  );

  // Per-need counts of what's actually reachable — i.e. inside the travel-time
  // (or hand-drawn) area, if one is set — so the chip/legend numbers match the
  // dots on the map. Independent of which needs are toggled on, so a need's own
  // count never drops to 0 when you switch it off.
  const needCounts = useMemo(() => {
    const counts = {};
    for (const r of enriched) {
      if (area && !pointInPolygon([r.lng, r.lat], area.feature)) continue;
      counts[r.need] = (counts[r.need] || 0) + 1;
    }
    return counts;
  }, [enriched, area]);

  // Markers on the map: enabled needs, inside the reachable/drawn area.
  const mapResources = useMemo(
    () =>
      enriched.filter(
        (r) =>
          enabledNeeds.has(r.need) &&
          (!area || pointInPolygon([r.lng, r.lat], area.feature))
      ),
    [enriched, enabledNeeds, area]
  );

  // The list: map markers currently in the viewport, matching the name search.
  const visibleResources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mapResources.filter(
      (r) =>
        (!bounds || bounds.contains([r.lng, r.lat])) &&
        (!q ||
          `${r.name} ${r.organization || ''} ${r.address} ${r.city}`
            .toLowerCase()
            .includes(q))
    );
  }, [mapResources, bounds, query]);

  // Sort, then split into known-hours (first) and unknown-hours groups.
  const { knownList, unknownList } = useMemo(() => {
    const statusRank = { open: 0, closed: 1, unknown: 2 };
    const byDistance = (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity);
    const compare = {
      distance: byDistance,
      name: (a, b) => a.name.localeCompare(b.name),
      open: (a, b) => statusRank[a.status] - statusRank[b.status] || byDistance(a, b),
    }[sortBy];

    const known = visibleResources.filter((r) => r.hours.length > 0).sort(compare);
    const unknown = visibleResources.filter((r) => r.hours.length === 0).sort(compare);
    return {
      knownList: known.slice(0, LIST_CAP),
      unknownList: unknown.slice(0, Math.max(0, LIST_CAP - known.length)),
    };
  }, [visibleResources, sortBy]);

  // "Pick one for me": select a random location from the list.
  const handleRandom = useCallback(() => {
    const pool = [...knownList, ...unknownList];
    if (!pool.length) return;
    setSelectedId(pool[Math.floor(Math.random() * pool.length)].id);
  }, [knownList, unknownList]);

  // Origin for directions: the user's real location if we have it, otherwise
  // the searched ZIP center. Null lets Google use the device location.
  const directionsOrigin = useMemo(() => {
    if (userLocation) return `${userLocation.lat},${userLocation.lng}`;
    if (center) return `${center.lat},${center.lng}`;
    return null;
  }, [userLocation, center]);

  const errorText = error ? translate(t, error.key, error.arg) : null;

  // The intro highlights a need only when it's the single active filter, so
  // nothing is highlighted by default (meals + groceries are both on).
  const activeNeed = enabledNeeds.size === 1 ? [...enabledNeeds][0] : null;

  const inputClass =
    'mt-0.5 rounded-md border border-gray-400 px-3 py-1.5 text-base text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm';

  return (
    <LangProvider value={lang}>
      <div className="min-h-screen w-full overflow-x-hidden">
        {/* ── Top menu bar (language switcher, top right) ─────── */}
        <header className="flex items-center justify-end border-b border-gray-200 bg-white px-4 py-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Language"
            className="cursor-pointer rounded-full border border-brand-500 bg-brand-50 px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-widest text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            {LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code} className="normal-case tracking-normal">
                {label}
              </option>
            ))}
          </select>
        </header>

        <Intro onPickNeed={handlePickNeed} activeNeed={activeNeed} />

        {/* ── Sticky search bar ─────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-gray-300 bg-white px-4 py-3 shadow-sm">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-4xl flex-wrap items-end justify-end gap-x-4 gap-y-2 sm:justify-start"
          >
            <label className="flex flex-col text-xs font-medium text-gray-700">
              {t('locationLabel')}
              <input
                ref={locationRef}
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder={t('locationPlaceholder')}
                className={`w-52 ${inputClass}`}
              />
            </label>

            <div className="flex flex-col text-xs font-medium text-gray-700">
              {t('travelLabel')}
              <div className="mt-0.5 flex overflow-hidden rounded-md border border-gray-400">
                {profiles.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => changeProfile(p)}
                    aria-pressed={profile === p}
                    className={`px-3 py-1.5 text-sm ${
                      profile === p
                        ? 'bg-brand-500 font-semibold text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t(p)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex w-full items-end gap-3 sm:contents">
              <button
                type="submit"
                disabled={loading}
                className="order-1 rounded-md bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60 sm:order-2"
              >
                {loading ? t('searching') : t('search')}
              </button>

              <label className="order-2 ml-auto flex flex-col items-end text-right text-xs font-medium text-gray-700 sm:order-1 sm:ml-0 sm:items-start sm:text-left">
                {t('timeLabel')}
                <select
                  value={minutes}
                  onChange={changeMinutes}
                  className={inputClass}
                >
                  {minutesOptions.map((m) => (
                    <option key={m} value={m}>
                      {m} {t('min')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </form>
          {errorText && (
            <p className="mx-auto mt-1 max-w-4xl text-xs font-medium text-red-700">
              {errorText}
            </p>
          )}
        </div>

        {/* ── Map + list (stacks on phones, side-by-side on md+) ── */}
        <div
          ref={mapSectionRef}
          className="relative scroll-mt-14 md:flex md:h-[calc(100vh-64px)]"
        >
          <div className="relative h-[55vh] md:h-auto md:min-h-0 md:flex-1">
            <ResourceMap
              resources={mapResources}
              center={center}
              area={area?.feature ?? null}
              drawing={drawing}
              onDrawComplete={handleDrawComplete}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onBoundsChange={handleBoundsChange}
              resetToken={resetToken}
            />

            {/* Draw-an-area controls + legend, top right */}
            <div className="absolute right-2 top-2 z-10 flex max-w-[60%] flex-col items-end gap-2">
              {drawing ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-gray-900/85 px-3 py-1.5 text-xs font-medium text-white">
                    {t('drawHint')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDrawing(false)}
                    className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100"
                  >
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    area?.kind === 'drawn' ? handleClearDrawnArea() : setDrawing(true)
                  }
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-gray-800"
                >
                  {area?.kind === 'drawn' ? t('clearArea') : t('drawArea')}
                </button>
              )}

              {/* Hidden on phones — the chips in the list do the same job */}
              {hasSearched && (
                <div className="hidden sm:block">
                  <Legend
                    enabledNeeds={enabledNeeds}
                    onToggle={handleToggleNeed}
                    counts={needCounts}
                  />
                </div>
              )}
            </div>

            <a
              href={config.api.attributionUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-1 left-1 z-10 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-gray-600 hover:text-gray-800"
            >
              {config.api.attribution}
            </a>
          </div>

          <aside className="h-[60vh] md:h-auto md:w-96 md:shrink-0">
            <OrgList
              known={knownList}
              unknown={unknownList}
              loading={loading}
              hasSearched={hasSearched}
              selectedId={selectedId}
              directionsOrigin={directionsOrigin}
              onSelect={setSelectedId}
              onHover={setHoveredId}
              onRandom={handleRandom}
              query={query}
              onQueryChange={setQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              enabledNeeds={enabledNeeds}
              onToggleNeed={handleToggleNeed}
              needCounts={needCounts}
            />
          </aside>

          {/* Before the first search, cover the map+list area with a white
              veil and center the prompt in it. The veil captures clicks (no
              pointer-events-none), so nothing underneath — map, draw button,
              list — is usable until a location is entered. On desktop it spans
              the full row; on phones it sits over the map. */}
          {!hasSearched && !loading && (
            <div className="absolute inset-x-0 top-0 z-20 flex h-[55vh] items-center justify-center bg-white/65 p-4 backdrop-blur-[1px] md:inset-0 md:h-auto">
              <div className="max-w-sm rounded-xl border border-gray-300 bg-white p-6 text-center shadow-xl">
                <p className="font-display text-lg font-bold text-brand-500">
                  {t('overlayTitle')}
                </p>
                <p className="mt-1 text-sm text-gray-700">{t('overlayBody')}</p>
                <button
                  type="button"
                  onClick={focusLocation}
                  className="mt-3 rounded-md bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
                >
                  {t('overlayCta')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LangProvider>
  );
}
