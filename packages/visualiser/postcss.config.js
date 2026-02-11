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

export default {
  plugins: [
    tailwindcss(),
    removeLayers,
  ],
};
