type Node = {
  type: string;
  value?: string;
  children?: Node[];
  data?: Record<string, unknown>;
};

const tagPattern = /<\/?(?:Columns|Column)\b[^>]*>/g;
const attribute = (attrs: string, name: string) =>
  attrs
    .match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|\\{([\\d.]+)\\})`))
    ?.slice(1)
    .find((value) => value !== undefined);

/** Support the layout tags in Markdown without evaluating JSX or allowing arbitrary HTML. */
export function remarkMarkdownColumns() {
  return (tree: Node) => {
    const walk = (parent: Node) => {
      if (!parent.children) return;
      // Markdown may put adjacent opening/closing tags in the same HTML node.
      const children = parent.children.flatMap((node) => {
        if (node.type !== 'html' || !node.value || node.value.replace(tagPattern, '').trim()) return [node];
        return Array.from(node.value.matchAll(tagPattern), ([value]) => ({ type: 'html', value }));
      });
      parent.children = children;
      for (let i = 0; i < children.length; i++) {
        const opening = children[i].type === 'html' && children[i].value?.trim().match(/^<(Columns|Column)\b([^>]*)>$/);
        if (!opening) {
          walk(children[i]);
          continue;
        }
        const name = opening[1];
        let depth = 1;
        let end = i + 1;
        for (; end < children.length; end++) {
          if (children[end].type !== 'html') continue;
          const value = children[end].value?.trim();
          if (value?.match(new RegExp(`^<${name}\\b[^>]*>$`))) depth++;
          if (value === `</${name}>` && --depth === 0) break;
        }
        if (end === children.length) continue;
        const attrs = opening[2];
        const wrapper: Node = {
          type: 'columnLayout',
          data: {
            hName: 'div',
            hProperties: {
              ...(name === 'Columns'
                ? {
                    'data-columns': 'true',
                    'data-cols': attribute(attrs, 'cols') ?? '2',
                    'data-ratio': attribute(attrs, 'ratio'),
                  }
                : { 'data-column': 'true', 'data-sticky': String(/(?:^|\s)sticky(?:\s|$|=\{true\})/.test(attrs)) }),
              className: attribute(attrs, 'className'),
            },
          },
          children: children.slice(i + 1, end),
        };
        walk(wrapper);
        children.splice(i, end - i + 1, wrapper);
      }
    };
    walk(tree);
  };
}
