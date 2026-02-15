import tailwindcss from '@tailwindcss/postcss';

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

export default {
  plugins: [
    tailwindcss(),
    removeLayers,
    removeHiddenUtility,
  ],
};
