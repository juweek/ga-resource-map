/**
 * Tiny translation layer — no library needed.
 *
 * Usage: `const t = useT();` then `t('search')` → "Search" / "Buscar" / "Rechercher".
 * When you add UI text, add the key to ALL languages below.
 */
import { createContext, useContext } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

const STRINGS = {
  en: {
    // Intro
    title: 'Georgia Food Finder',
    tagline: 'Free food near you, right now.',
    introLead:
      'Every free food resource in Georgia, shown by how far you can actually travel. Free to use. No sign-up needed. Works on any phone.',
    introNeedsTitle: 'What do you need right now?',
    intro_meal: 'A meal today',
    intro_groceries: 'Groceries to take home',
    intro_snap: 'Places that take SNAP / EBT',
    intro_kids: 'Meals for my kids',

    // Need names (chips, legend)
    need_meal: 'Meals',
    need_groceries: 'Groceries',
    need_snap: 'SNAP / EBT',
    need_kids: 'Kids',

    // Search bar
    locationLabel: 'ZIP or address',
    locationPlaceholder: 'ZIP or address',
    travelLabel: 'Getting there by',
    timeLabel: 'Within',
    min: 'min',
    walking: 'Walk',
    cycling: 'Bike',
    driving: 'Drive',
    search: 'Search',
    searching: 'Searching…',

    // Map overlay (before the first search)
    overlayTitle: 'Find food near you',
    overlayBody: 'Enter your ZIP code or address above to see the food resources you can reach.',
    overlayCta: 'Enter your location',

    // Errors
    errNoLocation: 'Enter a ZIP code or address.',
    errZipLookup: 'Could not look up that location. Please try again.',
    errLocNotFound: (q) => `Couldn't find “${q}” in Georgia.`,
    errFetch: 'Something went wrong fetching resources. Please try again.',

    // Map overlays
    legendTitle: 'Showing',
    drawArea: 'Draw an area',
    drawHint: 'Draw a shape, then let go',
    cancel: 'Cancel',
    clearArea: 'Clear drawn area',

    // Results list
    listTitle: 'Locations in view',
    listEmpty: 'No locations in the current map view. Try more minutes, a different travel mode, or zoom out.',
    listPrompt: 'Search a ZIP code to begin',
    listCapped: (shown, total) => `Showing nearest ${shown} of ${total} — zoom in or filter to narrow`,
    listCount: (n) => `${n} in view — pan or zoom the map to change`,
    filterPlaceholder: 'Search by name…',
    sortLabel: 'Sort',
    sortDistance: 'Distance',
    sortName: 'Name',
    sortOpen: 'Open first',
    unknownDivider: 'Hours unknown',
    random: 'Pick one for me',

    // Cards
    statusOpen: 'Open now',
    statusClosed: 'Closed',
    statusUnknown: 'Hours unknown',
    directions: 'Directions',
    viewOnMap: 'View on map',
    share: 'Share',
    copied: 'Link copied',
    website: 'Visit website →',
    noHours: 'Hours not listed.',
    miles: 'mi',

    types: {
      food_pantry: 'Food Pantry',
      food_bank: 'Food Bank',
      soup_kitchen: 'Soup Kitchen',
      mobile_pantry: 'Mobile Pantry',
      community_fridge: 'Community Fridge',
      emergency: 'Emergency Food',
      snap_office: 'SNAP Office',
      wic_office: 'WIC Office',
      school_meal: 'School Meals',
      summer_meal: 'Summer Meals',
      health_center: 'Health Center',
      tribal_food: 'Tribal Food Program',
      senior_commodity: 'Senior Food Program',
      rmp_restaurant: 'Restaurant (SNAP meals)',
    },
    days: {
      Monday: 'Monday', Tuesday: 'Tuesday', Wednesday: 'Wednesday',
      Thursday: 'Thursday', Friday: 'Friday', Saturday: 'Saturday', Sunday: 'Sunday',
    },
  },

  es: {
    title: 'Buscador de Comida de Georgia',
    tagline: 'Comida gratis cerca de ti, ahora mismo.',
    introLead:
      'Todos los recursos de comida gratis en Georgia, según la distancia que realmente puedas recorrer. Gratis. Sin registrarse. Funciona en cualquier teléfono.',
    introNeedsTitle: '¿Qué necesitas ahora mismo?',
    intro_meal: 'Una comida hoy',
    intro_groceries: 'Víveres para llevar a casa',
    intro_snap: 'Lugares que aceptan SNAP / EBT',
    intro_kids: 'Comidas para mis hijos',

    need_meal: 'Comidas',
    need_groceries: 'Víveres',
    need_snap: 'SNAP / EBT',
    need_kids: 'Niños',

    locationLabel: 'Código postal o dirección',
    locationPlaceholder: 'Código postal o dirección',
    travelLabel: 'Cómo llegas',
    timeLabel: 'En',
    min: 'min',
    walking: 'A pie',
    cycling: 'En bici',
    driving: 'En carro',
    search: 'Buscar',
    searching: 'Buscando…',

    overlayTitle: 'Encuentra comida cerca de ti',
    overlayBody: 'Escribe tu código postal o dirección arriba para ver los recursos de comida que puedes alcanzar.',
    overlayCta: 'Escribe tu ubicación',

    errNoLocation: 'Escribe un código postal o una dirección.',
    errZipLookup: 'No pudimos encontrar esa ubicación. Inténtalo de nuevo.',
    errLocNotFound: (q) => `No encontramos “${q}” en Georgia.`,
    errFetch: 'Algo salió mal al buscar recursos. Inténtalo de nuevo.',

    legendTitle: 'Mostrando',
    drawArea: 'Dibujar un área',
    drawHint: 'Dibuja una forma y suelta',
    cancel: 'Cancelar',
    clearArea: 'Borrar el área',

    listTitle: 'Lugares a la vista',
    listEmpty: 'No hay lugares en esta parte del mapa. Prueba con más minutos, otro medio de transporte, o aleja el mapa.',
    listPrompt: 'Busca un código postal para empezar',
    listCapped: (shown, total) => `Mostrando los ${shown} más cercanos de ${total} — acerca el mapa o filtra`,
    listCount: (n) => `${n} a la vista — mueve el mapa para cambiar`,
    filterPlaceholder: 'Buscar por nombre…',
    sortLabel: 'Ordenar',
    sortDistance: 'Distancia',
    sortName: 'Nombre',
    sortOpen: 'Abiertos primero',
    unknownDivider: 'Horario desconocido',
    random: 'Elige uno por mí',

    statusOpen: 'Abierto ahora',
    statusClosed: 'Cerrado',
    statusUnknown: 'Horario desconocido',
    directions: 'Cómo llegar',
    viewOnMap: 'Ver en el mapa',
    share: 'Compartir',
    copied: 'Enlace copiado',
    website: 'Visitar sitio web →',
    noHours: 'Horario no disponible.',
    miles: 'mi',

    types: {
      food_pantry: 'Despensa de Alimentos',
      food_bank: 'Banco de Alimentos',
      soup_kitchen: 'Comedor Comunitario',
      mobile_pantry: 'Despensa Móvil',
      community_fridge: 'Refrigerador Comunitario',
      emergency: 'Comida de Emergencia',
      snap_office: 'Oficina SNAP',
      wic_office: 'Oficina WIC',
      school_meal: 'Comidas Escolares',
      summer_meal: 'Comidas de Verano',
      health_center: 'Centro de Salud',
      tribal_food: 'Programa de Alimentos Tribal',
      senior_commodity: 'Alimentos para Mayores',
      rmp_restaurant: 'Restaurante (comidas SNAP)',
    },
    days: {
      Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
      Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
    },
  },

  fr: {
    title: 'Localisateur Alimentaire de Géorgie',
    tagline: 'De la nourriture gratuite près de chez vous, maintenant.',
    introLead:
      "Toutes les ressources alimentaires gratuites de Géorgie, selon la distance que vous pouvez vraiment parcourir. Gratuit. Sans inscription. Fonctionne sur n'importe quel téléphone.",
    introNeedsTitle: 'De quoi avez-vous besoin ?',
    intro_meal: "Un repas aujourd'hui",
    intro_groceries: 'Des provisions à emporter',
    intro_snap: 'Des lieux qui acceptent SNAP / EBT',
    intro_kids: 'Des repas pour mes enfants',

    need_meal: 'Repas',
    need_groceries: 'Provisions',
    need_snap: 'SNAP / EBT',
    need_kids: 'Enfants',

    locationLabel: 'Code postal ou adresse',
    locationPlaceholder: 'Code postal ou adresse',
    travelLabel: 'Comment y aller',
    timeLabel: 'En',
    min: 'min',
    walking: 'À pied',
    cycling: 'À vélo',
    driving: 'En voiture',
    search: 'Rechercher',
    searching: 'Recherche…',

    overlayTitle: 'Trouvez de la nourriture près de chez vous',
    overlayBody: 'Entrez votre code postal ou adresse ci-dessus pour voir les ressources alimentaires accessibles.',
    overlayCta: 'Entrez votre position',

    errNoLocation: 'Entrez un code postal ou une adresse.',
    errZipLookup: 'Impossible de trouver ce lieu. Veuillez réessayer.',
    errLocNotFound: (q) => `« ${q} » introuvable en Géorgie.`,
    errFetch: 'Un problème est survenu. Veuillez réessayer.',

    legendTitle: 'Affichage',
    drawArea: 'Dessiner une zone',
    drawHint: 'Dessinez une forme, puis relâchez',
    cancel: 'Annuler',
    clearArea: 'Effacer la zone',

    listTitle: 'Lieux visibles',
    listEmpty: "Aucun lieu dans cette partie de la carte. Essayez plus de minutes, un autre moyen de transport, ou dézoomez.",
    listPrompt: 'Cherchez un code postal pour commencer',
    listCapped: (shown, total) => `Les ${shown} plus proches sur ${total} — zoomez ou filtrez`,
    listCount: (n) => `${n} visibles — déplacez la carte pour changer`,
    filterPlaceholder: 'Rechercher par nom…',
    sortLabel: 'Trier',
    sortDistance: 'Distance',
    sortName: 'Nom',
    sortOpen: "Ouverts d'abord",
    unknownDivider: 'Horaires inconnus',
    random: 'Choisissez pour moi',

    statusOpen: 'Ouvert',
    statusClosed: 'Fermé',
    statusUnknown: 'Horaires inconnus',
    directions: 'Itinéraire',
    viewOnMap: 'Voir sur la carte',
    share: 'Partager',
    copied: 'Lien copié',
    website: 'Site web →',
    noHours: 'Horaires non renseignés.',
    miles: 'mi',

    types: {
      food_pantry: 'Garde-manger',
      food_bank: 'Banque Alimentaire',
      soup_kitchen: 'Soupe Populaire',
      mobile_pantry: 'Garde-manger Mobile',
      community_fridge: 'Frigo Communautaire',
      emergency: "Aide d'Urgence",
      snap_office: 'Bureau SNAP',
      wic_office: 'Bureau WIC',
      school_meal: 'Repas Scolaires',
      summer_meal: "Repas d'Été",
      health_center: 'Centre de Santé',
      tribal_food: 'Programme Alimentaire Tribal',
      senior_commodity: 'Aliments pour Aînés',
      rmp_restaurant: 'Restaurant (repas SNAP)',
    },
    days: {
      Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi',
      Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche',
    },
  },
};

const LangContext = createContext('en');
export const LangProvider = LangContext.Provider;

/** Lookup for a specific language (for code outside the provider). */
const cache = {};
export function getT(lang) {
  cache[lang] ??= (key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return cache[lang];
}

/** Hook version — reads the current language from context. */
export function useT() {
  return getT(useContext(LangContext));
}

/**
 * Translated label for a resource_type key. Unknown types get a readable
 * fallback ("snap_retailer" → "SNAP Retailer") so new API types still render.
 */
export function typeLabel(t, type) {
  return (
    t('types')[type] ||
    type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bSnap\b/g, 'SNAP')
      .replace(/\bWic\b/g, 'WIC')
  );
}
