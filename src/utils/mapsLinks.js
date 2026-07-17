/**
 * Builders for Google Maps deep links, using the official Maps URLs API
 * (https://developers.google.com/maps/documentation/urls/get-started).
 */

// Human-readable location string for a resource, preferring the street address
// and falling back to the org name when no address is on file. City/state/ZIP
// are appended for disambiguation so Google resolves the right place.
function addressQuery(r) {
  const locality = [r.city, [r.state, r.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  if (r.address) {
    return [r.address, locality].filter(Boolean).join(', ');
  }
  return [r.name, locality].filter(Boolean).join(', ');
}

// Fuller query for "view on map" — leads with the org name so the pin shows
// the business, not just a street address.
function placeQuery(r) {
  const locality = [r.city, [r.state, r.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [r.name, r.address, locality].filter(Boolean).join(', ');
}

/**
 * Directions from `origin` to the resource.
 * @param {string|null} origin - "lat,lng" or an address. When null, Google
 *   falls back to the device's current location.
 */
export function googleDirectionsUrl(origin, resource) {
  const params = new URLSearchParams({ api: '1' });
  if (origin) params.set('origin', origin);
  params.set('destination', addressQuery(resource));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Pull up the org on the map with no directions. */
export function googlePlaceUrl(resource) {
  const params = new URLSearchParams({ api: '1', query: placeQuery(resource) });
  return `https://www.google.com/maps/search/?${params}`;
}
