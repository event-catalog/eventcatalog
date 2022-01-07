module.exports = {
  // purge: ['./src/**/*.html', './src/**/*.js', './src/**/*.tsx'],
  purge: false,
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
  corePlugins: { preflight: false },
  important: `#tailwind`,
};
