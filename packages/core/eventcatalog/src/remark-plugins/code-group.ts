type Node = {
  type: string;
  name?: string;
  lang?: string;
  meta?: string | null;
  children?: Node[];
  attributes?: { type: string; name: string; value: string }[];
};

/** Keep fenced code in the normal highlighting pipeline, with a panel per fence. */
export function remarkCodeGroup() {
  return (tree: Node) => {
    const walk = (node: Node) => {
      if (node.type === 'mdxJsxFlowElement' && node.name === 'CodeGroup') {
        node.children = node.children?.map((child, index) => {
          if (child.type !== 'code') return child;
          const meta = child.meta?.trim() ?? '';
          const explicit = meta.match(/(?:^|\s)title=(?:"([^"]*)"|'([^']*)')/);
          const bare = meta.match(/^(?:"([^"]+)"|'([^']+)'|([^\s={}]+))(?=\s|$)/);
          const label =
            explicit?.[1] ?? explicit?.[2] ?? bare?.[1] ?? bare?.[2] ?? bare?.[3] ?? child.lang ?? `Code ${index + 1}`;
          // Bare titles are Mintlify syntax; remove them before Expressive Code reads modifiers.
          if (!explicit && bare) child.meta = meta.slice(bare[0].length).trim();
          return {
            type: 'mdxJsxFlowElement',
            name: 'div',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'data-code-panel', value: label },
              ...(child.lang ? [{ type: 'mdxJsxAttribute', name: 'data-code-lang', value: child.lang }] : []),
            ],
            children: [child],
          };
        });
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
