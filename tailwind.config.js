/**
 * Tailwind reads this at build time (CommonJS), so we duplicate the brand
 * palette here rather than importing from the ES-module config.js.
 * Keep these in sync with src/config.js → brand.palette / brand.grays.
 */
const BRAND = {
  DEFAULT: '#0c4383',
  10: '#f8fafb',
  50: '#f1f4f7',
  100: '#e4e9ef',
  200: '#c9d3df',
  300: '#a2b1c2',
  400: '#6f87a3',
  500: '#0c4383',
  600: '#0b3b74',
  700: '#093260',
  800: '#07284d',
  900: '#051f3a',
  950: '#031527',
};

const GRAYS = {
  100: '#fafafa',
  200: '#f6f6f6',
  300: '#dadcda',
  400: '#bfc2be',
  500: '#a5a9a3',
  600: '#8b9188',
  700: '#72796F',
  800: '#41463E',
  900: '#282b26',
  950: '#10120E',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { ...BRAND },
        gray: { ...GRAYS },
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        display: ['Urbanist', 'sans-serif'],
      },
      boxShadow: {
        'inner-strong': 'inset 0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
