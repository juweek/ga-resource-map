/**
 * Lightweight geo helpers: ZIP → center via the Mapbox Geocoding API, a
 * haversine distance, and a circle-polygon generator for drawing the search
 * radius on the map. Mapbox token is the same one used by the map itself.
 */

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

// Bias/limit geocoding to Georgia so "30303" resolves cleanly.
const GA_BBOX = '-85.7,30.3,-80.8,35.1';

/**
 * Geocode a location to { lng, lat, place }. Accepts either a 5-digit US ZIP
 * or a free-text address / place name; results are limited to Georgia.
 * Returns null if the token is missing or nothing matches.
 */
export async function geocodeLocation(query, signal) {
  if (!MAPBOX_TOKEN) {
    console.error('Missing REACT_APP_MAPBOX_TOKEN — cannot geocode location.');
    return null;
  }
  const q = String(query).trim();
  if (!q) return null;

  // A bare 5-digit ZIP resolves cleanest as a postcode; anything else is
  // treated as an address / place, biased toward the center of Georgia.
  const types = /^\d{5}$/.test(q)
    ? 'postcode'
    : 'address,place,locality,neighborhood,postcode,poi';
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?country=US&bbox=${GA_BBOX}&proximity=-83.5,32.7&limit=1&types=${types}` +
    `&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const data = await res.json();
  const feature = data?.features?.[0];
  if (!feature?.center) return null;
  const [lng, lat] = feature.center;
  return { lng, lat, place: feature.place_name };
}

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(aLng, aLat, bLng, bLat) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/** GeoJSON Polygon approximating a circle of `radiusMiles` around [lng,lat]. */
export function circlePolygon([lng, lat], radiusMiles, steps = 64) {
  const coords = [];
  const distDegLat = radiusMiles / 69; // ~69 miles per degree latitude
  const distDegLng = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([
      lng + distDegLng * Math.cos(theta),
      lat + distDegLat * Math.sin(theta),
    ]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: {},
  };
}
