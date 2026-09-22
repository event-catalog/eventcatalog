type Node = {
  type: string;
  value?: string;
  lang?: string;
  meta?: string | null;
  children?: Node[];
  data?: Record<string, unknown>;
};

/** Recognize only CodeGroup wrappers in plain Markdown; never enable arbitrary HTML or JSX. */
export function remarkMarkdownCodeGroup() {
  return (tree: Node) => {
    const walk = (parent: Node) => {
      const children = parent.children;
      if (!children) return;
      for (let index = 0; index < children.length; index++) {
        const opening = children[index].type === 'html' && children[index].value?.trim().match(/^<CodeGroup\b([^>]*)>$/);
        if (!opening) {
          walk(children[index]);
          continue;
        }
        const end = children.findIndex(
          (child, i) => i > index && child.type === 'html' && child.value?.trim() === '</CodeGroup>'
        );
        if (end === -1) continue;
        const blocks = children.slice(index + 1, end);
        if (!blocks.length || blocks.some((child) => child.type !== 'code')) continue;
        const className = opening[1].match(/\bclassName=(?:"([^"]*)"|'([^']*)')/);
        const dropdown = /(?:^|\s)dropdown(?:\s|$|=\{true\})/.test(opening[1]);
        children.splice(index, end - index + 1, {
          type: 'codeGroup',
          data: {
            hName: 'div',
            hProperties: {
              'data-code-group': 'true',
              'data-dropdown': String(dropdown),
              className: className?.[1] ?? className?.[2],
            },
          },
          children: blocks.map((code, i) => {
            const meta = code.meta?.trim() ?? '';
            const title =
              meta.match(/(?:^|\s)title=(?:"([^"]*)"|'([^']*)')/) ?? meta.match(/^(?:"([^"]+)"|'([^']+)'|([^\s={}]+))/);
            const label = title?.[1] ?? title?.[2] ?? title?.[3] ?? code.lang ?? `Code ${i + 1}`;
            return {
              type: 'codeGroupPanel',
              data: {
                hName: 'div',
                hProperties: { 'data-code-panel': label, ...(code.lang ? { 'data-code-lang': code.lang } : {}) },
              },
              children: [code],
            };
          }),
        });
      }
    };
    walk(tree);
  };
}
