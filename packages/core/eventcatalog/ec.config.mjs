import { defineEcConfig } from 'astro-expressive-code';

// Expressive Code configuration lives in this dedicated file (rather than inline
// in astro.config.mjs) because it contains non-serializable options such as the
// `themeCssSelector` function. Astro's `<Code>` component (used on the print
// pages) requires Expressive Code options coming from the Astro config to be
// JSON-serializable, so functions must be defined here instead.
//
// `useDarkModeMediaQuery: false` + `themeCssSelector` make code blocks follow
// EventCatalog's own `data-theme` toggle instead of the OS `prefers-color-scheme`
// media query, so they stay readable when the catalog theme and the OS
// preference disagree (see issue #2607).
export default defineEcConfig({
  themes: ['github-light', 'github-dark'],
  useDarkModeMediaQuery: false,
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
  defaultProps: {
    wrap: true,
  },
});
