// src/remark-plugins/directives.js
import { visit } from 'unist-util-visit';

export function remarkDirectives() {
  return (tree: any) => {
    visit(tree, (node) => {
      if (node.type === 'containerDirective') {
        // Subtle, tinted backgrounds with a coloured left bar and icon.
        // Body text inherits the page's normal text colour for readability.
        const blockTypes = {
          info: 'ec-admonition ec-admonition--info bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60',
          warning:
            'ec-admonition ec-admonition--warning bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60',
          danger:
            'ec-admonition ec-admonition--danger bg-red-50/60 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/60',
          tip: 'ec-admonition ec-admonition--tip bg-emerald-50/60 dark:bg-emerald-900/40 border border-emerald-200/70 dark:border-emerald-700/80',
          note: 'ec-admonition ec-admonition--note bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60',
        };

        // Distinct Lucide icons per intent (warning vs danger no longer share).
        const iconPaths = {
          // Info — circle with "i"
          info: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 8h.01M11 12h1v4h1',
          // Warning — triangle with !
          warning: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4 M12 17h.01',
          // Danger — octagon with !
          danger: 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z M12 8v4 M12 16h.01',
          // Tip — lightbulb
          tip: 'M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z',
          // Note — pencil-line
          note: 'M12 20h9 M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
        };

        // Coloured icon + title classes (intent accent colours).
        const accentTextClasses = {
          info: 'text-blue-700 dark:text-blue-300',
          warning: 'text-amber-700 dark:text-amber-300',
          danger: 'text-red-700 dark:text-red-300',
          tip: 'text-emerald-700 dark:text-emerald-300',
          note: 'text-slate-600 dark:text-slate-300',
        };

        const intent = node.name as keyof typeof blockTypes;
        const accentClass = accentTextClasses[intent] || accentTextClasses.note;

        node.data = node.data || {};
        node.data.hName = 'div';
        node.data.hProperties = {
          class: `rounded-md px-3 py-2.5 my-4 text-[0.85rem] leading-relaxed ${blockTypes[intent] || ''}`,
        };

        // Check if there's a custom title (label) provided via :::note[Custom Title]
        // In remark-directive, the label is stored in node.children as a paragraph node
        // with data.directiveLabel = true
        let titleChildren;
        let contentChildren;

        const firstChild = node.children && node.children.length > 0 ? node.children[0] : null;
        const hasCustomTitle = firstChild && firstChild.data?.directiveLabel === true;

        if (hasCustomTitle && firstChild) {
          // Custom title was provided in the label - it contains markdown parsed as inline content
          titleChildren = firstChild.children || [
            { type: 'text', value: node.name.charAt(0).toUpperCase() + node.name.slice(1) },
          ];
          contentChildren = node.children.slice(1);
        } else {
          // No custom title, use default based on directive name
          titleChildren = [
            {
              type: 'text',
              value: node.name.charAt(0).toUpperCase() + node.name.slice(1),
            },
          ];
          contentChildren = node.children;
        }

        // Create header div that will contain icon and title
        const headerNode = {
          type: 'element',
          data: {
            hName: 'div',
            hProperties: {
              class: `flex items-center gap-1.5 mb-1 ${accentClass}`,
            },
          },
          children: [
            // Lucide Icon SVG (smaller, accent-coloured)
            {
              type: 'element',
              data: {
                hName: 'svg',
                hProperties: {
                  xmlns: 'http://www.w3.org/2000/svg',
                  width: '14',
                  height: '14',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: '2.25',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  class: 'lucide shrink-0',
                },
              },
              children: [
                {
                  type: 'element',
                  data: {
                    hName: 'path',
                    hProperties: {
                      d: iconPaths[node.name as keyof typeof iconPaths] || '',
                    },
                  },
                },
              ],
            },
            // Title — small, uppercase, tracked
            {
              type: 'element',
              data: {
                hName: 'span',
                hProperties: {
                  class: 'text-[0.7rem] font-semibold uppercase tracking-wider',
                },
              },
              children: titleChildren,
            },
          ],
        };

        // Create content div for the rest of the children
        const contentNode = {
          type: 'element',
          data: {
            hName: 'div',
            hProperties: {
              class:
                'prose prose-sm dark:prose-invert w-full max-w-none! prose-p:my-0.5 prose-p:text-inherit prose-p:text-[0.85rem] prose-p:leading-relaxed prose-code:text-[0.8rem]',
            },
          },
          children: contentChildren,
        };

        // Replace node's children with header and content
        node.children = [headerNode, contentNode];
      }
    });
  };
}
