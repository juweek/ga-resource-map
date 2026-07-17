# Georgia Food Finder

A mobile-first map of free food resources across Georgia, searched by
**travel time** — "everything I can reach in 20 minutes on foot" — instead
of a plain mile radius.

Built for people who need help right now: fast on low-end phones, works in
English / Spanish / French, no sign-up.

## Quick start

```bash
npm install
cp .env.example .env   # add your Mapbox token
npm start
```

## How it works

1. User picks **what they need** — a meal, groceries, SNAP/EBT retailers, or
   kids' meals — and enters a ZIP (geocoded with the **Mapbox Geocoding API**).
2. We fetch the reachable area from the **Mapbox Isochrone API**
   (walk / bike / drive × minutes) and matching resources from the
   **Feed America API** (feedam.org/api/docs, CC BY 4.0) — one request per
   API mode (`free`, `snap`, `school`, `summer`).
3. Resources are filtered to points inside the isochrone polygon.
   If the isochrone request fails we quietly fall back to a radius search.

The Mapbox APIs use the single `REACT_APP_MAPBOX_TOKEN`; Feed America needs no key.

## Code map

| File | Role |
|------|------|
| `src/config.js` | Brand, API, **need categories**, travel and map settings — start here |
| `src/i18n.js` | Every user-facing string, EN / ES / FR |
| `src/components/FoodFinderMap.js` | Page layout + all state (search, filters, sort) |
| `src/components/ResourceMap.js` | The Mapbox map: markers, isochrone, hover tooltip, freehand draw |
| `src/components/OrgList.js` | Result cards: search box, sort, need chips, share, hours divider |
| `src/components/Legend.js` | On-map color key (also toggles needs) |
| `src/components/Intro.js` | Above-the-fold intro + "What do you need?" shortcuts |
| `src/utils/feedAmerica.js` | Feed America client, multi-mode fetch, need categorization |
| `src/utils/hours.js` | Weekly hours → "Open now / Closed / Hours unknown" |
| `src/utils/isochrone.js` | Isochrone fetch, point-in-polygon, fetch-radius math |
| `src/utils/geocode.js` | ZIP → lat/lng, haversine distance |
| `src/utils/mapsLinks.js` | Google Maps directions / place deep links |

## Need categories

Users pick plain-language needs instead of resource-type jargon. Each need
in `config.needs` maps to Feed America API modes + resource types:

| Need | API mode(s) | Types |
|------|-------------|-------|
| Meals | `free` | soup kitchens, community fridges, emergency food |
| Groceries | `free` | food pantries, food banks, mobile pantries |
| SNAP / EBT | `snap` | SNAP retailers |
| Kids | `school`, `summer` | school + summer meal sites |

Toggling a need is a client-side filter unless it requires an API mode that
hasn't been fetched yet — then the last search silently re-runs with it.

## Features

- **Travel-time search** — walk / bike / drive, 10–60 minutes.
- **Draw an area** — freehand-draw a shape on the map to search inside it
  (button at the top right of the map).
- **Live hours badges** — "Open now / Closed / Hours unknown", computed
  client-side from each resource's weekly hours so the badge always matches
  the expanded hours list. Known-hours locations sort above a divider.
- **Filter + sort + random** — need chips, name search, sort by
  distance / name / open-first, and a "Pick one for me" button.
- **Share** — native share sheet on phones, copy-Google-Maps-link elsewhere.
- **EN / ES / FR** language dropdown (`src/i18n.js`).

## Performance notes

- The list renders at most 75 cards (`LIST_CAP` in `FoodFinderMap.js`); the
  map still shows every marker via one GeoJSON layer (no DOM per marker).
- Requests are aborted when a new search starts (`AbortController`).

## Tech stack

React 19 · Mapbox GL JS v1 · Tailwind CSS · Create React App
