/**
 * Feed America API client (https://feedam.org/api/docs).
 *
 * searchNearby(lat, lng, { mode, radius }) → GET /api/resources/nearby
 * `mode` picks a dataset: free | snap | school | summer | wic | health.
 *
 * Results are normalized here — the raw API nests results under a
 * `resources` array and stores hours/services as JSON strings — so the
 * UI never has to think about the wire format. Each resource is also
 * tagged with a `need` (see config.needs) for filtering and map colors.
 */

import config from '../config';

const { baseUrl } = config.api;

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function safeParse(json, fallback) {
  if (json == null) return fallback;
  if (typeof json !== 'string') return json;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Turn {"monday":"09:00-12:00", ...} into [{ day, hours }] in week order.
const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function parseHours(hoursJson) {
  const obj = safeParse(hoursJson, null);
  if (!obj || typeof obj !== 'object') return [];
  return DAY_ORDER.filter((d) => obj[d]).map((d) => ({
    day: d.charAt(0).toUpperCase() + d.slice(1),
    hours: obj[d],
  }));
}

/** Which broad "need" a resource belongs to: by type first, then by the mode it came from. */
export function needOf(resourceType, fetchMode) {
  for (const [need, { types }] of Object.entries(config.needs)) {
    if (types.includes(resourceType)) return need;
  }
  return config.modeFallbackNeed[fetchMode] || 'groceries';
}

/** Normalize a raw API resource into the shape the UI consumes. */
export function normalizeResource(r, fetchMode) {
  return {
    id: r.id,
    need: needOf(r.resource_type, fetchMode),
    name: r.name || 'Unnamed resource',
    organization: r.organization || null,
    address: r.address || '',
    city: r.city || '',
    state: r.state || '',
    zip: r.zip || '',
    lat: num(r.lat),
    lng: num(r.lng),
    phone: r.phone || null,
    website: r.website || null,
    resourceType: r.resource_type || 'unknown',
    services: safeParse(r.services_offered_json, []),
    requirements: r.requirements_text || null,
    hours: parseHours(r.hours_json),
    distance: num(r.distance), // miles from the search origin
    acceptsWalkins: r.accepts_walkins === 1 || r.accepts_walkins === true,
    requiresAppointment:
      r.requires_appointment === 1 || r.requires_appointment === true,
  };
}

/**
 * Search one mode around a lat/lng.
 * @returns normalized resources (only those with usable coordinates)
 */
export async function searchNearby(lat, lng, { mode, radius }, signal) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    mode,
    radius: String(radius),
    limit: String(config.api.limit),
  });
  const res = await fetch(`${baseUrl}/resources/nearby?${params}`, { signal });
  if (!res.ok) throw new Error(`Feed America API error (${res.status})`);
  const data = await res.json();
  if (!data?.success) {
    throw new Error('Feed America API returned an unsuccessful response');
  }
  const list = Array.isArray(data.resources) ? data.resources : [];
  return list
    .map((r) => normalizeResource(r, mode))
    .filter((r) => r.lat != null && r.lng != null);
}

/**
 * Search several modes at once and merge, de-duplicating by id.
 * One request per mode (at most 3 in practice).
 */
export async function searchNearbyModes(lat, lng, modes, radius, signal) {
  const results = await Promise.all(
    modes.map((mode) => searchNearby(lat, lng, { mode, radius }, signal))
  );
  const byId = new Map();
  for (const list of results) {
    for (const r of list) if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return [...byId.values()];
}
