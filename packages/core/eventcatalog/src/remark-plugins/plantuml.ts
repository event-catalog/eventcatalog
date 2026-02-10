import type { RemarkPlugin } from '@astrojs/markdown-remark';
import { visit } from 'unist-util-visit';

const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (c) => escapeMap[c]);

function extractTitle(meta: string | undefined): string | null {
  if (!meta) return null;
  const match = meta.match(/title="([^"]+)"/);
  return match ? match[1] : null;
}

export const plantuml: RemarkPlugin<[]> = () => (tree) => {
  visit(tree, 'code', (node) => {
    if (node.lang !== 'plantuml') return;

    // @ts-ignore
    const title = extractTitle(node.meta);
    const escapedContent = escapeHtml(node.value);
    const escapedTitle = title ? escapeHtml(title) : null;

    // @ts-ignore
    node.type = 'html';
    node.value = `
      <div class="plantuml-block pb-4">
        ${escapedTitle ? `<h2 class="plantuml-title">${escapedTitle}</h2>` : ''}
        <div class="plantuml border border-gray-200 rounded-lg p-1" data-content="${escapedContent}">
          <p>Rendering PlantUML diagram...</p>
        </div>
      </div>
    `;
  });
};
