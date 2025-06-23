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

export const mermaid: RemarkPlugin<[]> = () => (tree) => {
  visit(tree, 'code', (node) => {
    if (node.lang !== 'mermaid') return;

    // @ts-ignore test
    node.type = 'html';
    node.value = `
    <div class="mermaid-block pb-4">
      <div class="mermaid border border-gray-200 rounded-lg p-1" data-content="${escapeHtml(node.value)}">
        <p>Loading graph...</p>
      </div>
    </div>
    `;
  });
};
