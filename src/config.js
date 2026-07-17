/**
 * GEORGIA FOOD FINDER — CONFIGURATION
 *
 * A map of food-assistance resources across Georgia, powered by the
 * Feed America API (https://feedam.org/api/docs). Enter a ZIP code and a
 * travel time (walk / bike / drive) to see everything you can reach.
 *
 * All user-facing text lives in src/i18n.js (English / Spanish / French).
 */

const config = {
  brand: {
    primary: '#0c4383',
    secondary: '#6f87a3',
    fonts: {
      sans: 'Roboto',
      display: 'Urbanist',
    },
  },

  // ─── Feed America API ───────────────────────────────────────
  api: {
    baseUrl: 'https://feedam.org/api',
    // Max resources to pull per query, per mode.
    limit: 250,
    // Required by the CC BY 4.0 data license.
    attribution: 'Data from Feed America (feedam.org), CC BY 4.0',
    attributionUrl: 'https://feedam.org',
  },

  // ─── "What do you need?" categories ─────────────────────────
  // Each need maps to one or more API modes (free|snap|school|summer|wic|health)
  // and, within those, the resource_types that belong to it. A fetched
  // resource is matched to a need by type first, then by the mode it came
  // from (see needOf in utils/feedAmerica.js). Colors are used for map
  // dots, the legend, and card accents — keep them muted.
  needs: {
    meal: {
      modes: ['free'],
      types: ['soup_kitchen', 'community_fridge', 'emergency', 'rmp_restaurant'],
      color: '#a3593a', // terracotta
    },
    groceries: {
      modes: ['free'],
      types: ['food_pantry', 'food_bank', 'mobile_pantry', 'tribal_food', 'senior_commodity'],
      color: '#4e6e58', // sage
    },
    snap: {
      modes: ['snap'],
      types: [],
      color: '#4f6584', // slate
    },
    kids: {
      modes: ['school', 'summer'],
      types: ['school_meal', 'summer_meal', 'head_start'],
      color: '#8c6d3f', // ochre
    },
  },
  // Need assigned to a resource whose type isn't listed above,
  // based on which mode it was fetched under.
  modeFallbackNeed: { free: 'groceries', snap: 'snap', school: 'kids', summer: 'kids' },
  fallbackColor: '#6e675d',

  // Map dot color for the currently selected location ("Pick one for me" /
  // clicking a card). Deliberately off-palette so it stands out from the
  // muted need colors above.
  selectedColor: '#d6336c', // raspberry

  // Open/closed status badge colors, shared by the list cards and the map
  // tooltip so they read identically. Labels come from i18n.
  statusColors: {
    open: { bg: '#e7efe8', fg: '#3c5c45' },
    closed: { bg: '#f2e7e3', fg: '#8a4a38' },
    unknown: { bg: '#ebeceb', fg: '#5f645e' },
  },

  // Needs enabled when the page loads (one 'free' fetch covers both).
  defaultNeeds: ['meal', 'groceries'],

  // ─── Travel-time search (Mapbox Isochrone API) ──────────────
  travel: {
    profiles: ['walking', 'cycling', 'driving'],
    defaultProfile: 'walking',
    minutesOptions: [10, 15, 20, 30, 45, 60], // API max is 60
    defaultMinutes: 20,
  },

  // ─── Map Settings ───────────────────────────────────────────
  map: {
    style: 'mapbox://styles/mapbox/light-v11',
    // Georgia, roughly centered.
    center: [-83.5, 32.7], // [lng, lat]
    zoom: 6.2,
  },
};

export default config;
