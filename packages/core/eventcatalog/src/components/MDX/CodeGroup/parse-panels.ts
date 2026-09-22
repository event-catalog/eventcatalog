import { parseFragment, serialize } from 'parse5';

// Only parse the trusted HTML produced by Astro's rendered MDX slot.
export function parseCodePanels(html: string) {
  return parseFragment(html).childNodes.flatMap((node) => {
    if (!('attrs' in node)) return [];
    const label = node.attrs.find((attr) => attr.name === 'data-code-panel')?.value;
    if (label === undefined) return [];
    return [{ label, language: node.attrs.find((attr) => attr.name === 'data-code-lang')?.value, html: serialize(node) }];
  });
}
