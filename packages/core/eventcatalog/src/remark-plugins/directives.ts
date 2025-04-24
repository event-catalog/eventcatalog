// src/remark-plugins/directives.js
import { visit } from 'unist-util-visit';

export function remarkDirectives() {
  return (tree: any) => {
    visit(tree, (node) => {
      if (node.type === 'containerDirective') {
        const blockTypes = {
          info: 'bg-blue-50 border-l-4 border-blue-500',
          warning: 'bg-yellow-50 border-l-4 border-yellow-500',
          danger: 'bg-red-50 border-l-4 border-red-500',
          tip: 'bg-green-50 border-l-4 border-green-500',
          note: 'bg-gray-50 border-l-4 border-gray-500',
        };

        // Lucide icon paths
        const iconPaths = {
          info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          warning:
            'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
          danger:
            'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
          tip: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
          note: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        };

        node.data = node.data || {};
        node.data.hName = 'div';
        node.data.hProperties = {
          class: `rounded-lg p-4 my-4 ${blockTypes[node.name as keyof typeof blockTypes] || ''}`,
        };

        // Create header div that will contain icon and type
        const headerNode = {
          type: 'element',
          data: {
            hName: 'div',
            hProperties: {
              class: 'flex items-center gap-2 font-semibold mb-2',
            },
          },
          children: [
            // Lucide Icon SVG
            {
              type: 'element',
              data: {
                hName: 'svg',
                hProperties: {
                  xmlns: 'http://www.w3.org/2000/svg',
                  width: '26',
                  height: '26',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: '2',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  class: 'lucide',
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
            // Type label
            {
              type: 'element',
              data: {
                hName: 'span',
                hProperties: {
                  class: '',
                },
              },
              children: [
                {
                  type: 'text',
                  value: node.name.charAt(0).toUpperCase() + node.name.slice(1),
                },
              ],
            },
          ],
        };

        // Create content div for the rest of the children
        const contentNode = {
          type: 'element',
          data: {
            hName: 'div',
            hProperties: {
              class: 'prose prose-md w-full !max-w-none ',
            },
          },
          children: node.children,
        };

        // Replace node's children with header and content
        node.children = [headerNode, contentNode];
      }
    });
  };
}
