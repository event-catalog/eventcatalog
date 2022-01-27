module.exports = {
  darkMode: false,
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  purge: {
    content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
    safelist: ['bg-red-50', 'bg-yellow-50', 'bg-indigo-50', 'text-red-400', 'text-yellow-400', 'text-indigo-400'],
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms'), require('@tailwindcss/line-clamp')],
};
