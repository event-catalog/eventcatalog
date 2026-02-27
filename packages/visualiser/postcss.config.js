import tailwindcss from '@tailwindcss/postcss';

const SCOPE = '.eventcatalog-visualizer';

/** @type {import('postcss').Plugin} */
const removeLayers = {
  postcssPlugin: 'remove-layers',
  AtRule: {
    layer(atRule) {
      if (atRule.nodes && atRule.nodes.length > 0) {
        atRule.replaceWith(atRule.nodes);
      } else {
        atRule.remove();
      }
    },
  },
};

/**
 * Remove the bare `.hidden` utility rule from the output.
 * Tailwind v4 content scanning detects "hidden" in inline style strings
 * (e.g. `overflow: "hidden"`) and emits `.hidden { display: none }`.
 * This conflicts with responsive header utilities (e.g. `hidden lg:flex`)
 * in the consuming Astro app because removeLayers flattens all CSS out of
 * @layer, making cascade order—not layer priority—decide the winner.
 */
/** @type {import('postcss').Plugin} */
const removeHiddenUtility = {
  postcssPlugin: 'remove-hidden-utility',
  Rule(rule) {
    if (rule.selector === '.hidden') {
      rule.remove();
    }
  },
};

/**
 * Scope all CSS rules under `.eventcatalog-visualizer` so the visualiser
 * package is fully self-contained and won't leak styles into the host app.
 *
 * Handles special cases:
 * - Selectors already containing the scope class are left as-is
 * - `:root` / `html` / `body` selectors are replaced with the scope class
 * - `[data-theme="dark"]` selectors get the scope inserted after the attribute
 * - `@keyframes` and other at-rules are left untouched
 */
/** @type {import('postcss').Plugin} */
const scopeSelectors = {
  postcssPlugin: 'scope-selectors',
  Rule(rule) {
    // Skip rules inside @keyframes — animation names are global
    if (rule.parent?.type === 'atrule' && rule.parent.name === 'keyframes') {
      return;
    }

    rule.selectors = rule.selectors.map((selector) => {
      // Already scoped
      if (selector.includes(SCOPE)) {
        return selector;
      }

      // :root / html / body with attribute selectors or pseudo-classes
      // e.g. `:root:not([data-theme="dark"]) .react-flow` → `:not([data-theme="dark"]) .eventcatalog-visualizer .react-flow`
      // e.g. `:root[data-theme="light"] .react-flow` → `[data-theme="light"] .eventcatalog-visualizer .react-flow`
      const rootMatch = selector.match(/^(:root|html|body)((?::[^\s]+|\[[^\]]+\])+)(\s.*)?$/);
      if (rootMatch) {
        const modifiers = rootMatch[2]; // e.g. :not([data-theme="dark"]) or [data-theme="light"]
        const rest = rootMatch[3] || ''; // e.g. " .react-flow"
        return `${modifiers} ${SCOPE}${rest}`;
      }

      // :root or html or body alone or followed by space — replace with scope class
      if (/^(:root|html|body)(\s|$)/.test(selector)) {
        return selector.replace(/^(:root|html|body)/, SCOPE);
      }

      // [data-theme="..."] at the start — insert scope after the attribute selector
      if (/^\[data-theme/.test(selector)) {
        return selector.replace(/^(\[data-theme="[^"]*"\])/, `$1 ${SCOPE}`);
      }

      // Everything else — prepend the scope
      return `${SCOPE} ${selector}`;
    });
  },
};

export default {
  plugins: [
    tailwindcss(),
    removeLayers,
    removeHiddenUtility,
    scopeSelectors,
  ],
};
