/**
 * Travel-time helpers built on the Mapbox Isochrone API
 * (https://docs.mapbox.com/api/navigation/isochrone/) — the area reachable
 * within N minutes on foot, by bike, or by car. Uses the same Mapbox token
 * as the map, so no extra API key is needed.
 */

import { haversineMiles } from './geocode';

const TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

/**
 * Fetch the reachable-area polygon.
 * @param profile 'walking' | 'cycling' | 'driving'
 * @param minutes 1–60 (API maximum)
 * @returns a GeoJSON Polygon feature, or null if none returned
 */
export async function fetchIsochrone(profile, minutes, { lng, lat }, signal) {
  const url =
    `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}` +
    `?contours_minutes=${minutes}&polygons=true&denoise=1&access_token=${TOKEN}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Isochrone request failed (${res.status})`);
  const data = await res.json();
  return data?.features?.[0] ?? null;
}

// Rough travel speeds, used only to pick a generous fetch radius for the
// resources API; the isochrone polygon does the precise filtering after.
const SPEED_MPH = { walking: 3, cycling: 12, driving: 40 };

/** Miles to request from the resources API for a profile + minutes. */
export function fetchRadiusMiles(profile, minutes) {
  const miles = ((SPEED_MPH[profile] || 40) * minutes) / 60;
  return Math.min(60, Math.max(2, miles * 1.3));
}

// ── Point-in-polygon (ray casting) ─────────────────────────────

function inRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > y) !== (yj > y);
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inPolygon(pt, rings) {
  return inRing(pt, rings[0]) && rings.slice(1).every((hole) => !inRing(pt, hole));
}

/** True if [lng, lat] falls inside a GeoJSON Polygon/MultiPolygon feature. */
export function pointInPolygon(pt, feature) {
  const g = feature?.geometry;
  if (g?.type === 'Polygon') return inPolygon(pt, g.coordinates);
  if (g?.type === 'MultiPolygon') return g.coordinates.some((p) => inPolygon(pt, p));
  return false;
}

/**
 * Bounding-box center of a drawn ring plus a radius (miles) that covers it —
 * used to fetch resources for a hand-drawn area.
 */
export function ringCenterRadius(ring) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
  }
  const lng = (minLng + maxLng) / 2;
  const lat = (minLat + maxLat) / 2;
  const radius = Math.max(1, haversineMiles(lng, lat, maxLng, maxLat));
  return { lng, lat, radius: Math.min(60, radius * 1.2) };
}
