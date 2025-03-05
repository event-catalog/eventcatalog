import config from './eventcatalog.config.js';

const HEADER_HEIGHT = '4rem';
const theme = config.theme || {};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      height: {
        header: HEADER_HEIGHT,
        content: `calc(100vh - ${HEADER_HEIGHT})`,
      },
      spacing: {
        header: HEADER_HEIGHT,
        content: `calc(100vh - ${HEADER_HEIGHT})`,
      },
      screens: {
        xxl: '1990px',
      },
      colors: {
        primary: {
          DEFAULT: '#a855f7',
        },
        secondary: {
          light: '#ff9980',
          DEFAULT: '#ff6633',
          dark: '#cc3300',
        },
        ...theme,
      },
    },
  },
  safelist: [
    { pattern: /border-.*-(200|400|500)/ },
    { pattern: /bg-.*-(100|200|400|500)/ },
    { pattern: /from-.*-(100|200|300|400|500|700)/ },
    { pattern: /to-.*-(100|200|300|400|500|700)/ },
    { pattern: /text-.*-(400|500|800)/ },
    'border-blue-200',
    'border-green-300',
    'bg-blue-600',
    'bg-orange-600',
    'bg-red-50',
    'bg-yellow-50',
    'bg-indigo-50',
    'border-l-red-500',
    'border-l-yellow-500',
    'border-l-blue-500',
  ],

  plugins: [require('@tailwindcss/typography')],
};
