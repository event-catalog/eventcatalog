import type { RemarkPlugin } from '@astrojs/markdown-remark';
import { visit } from 'unist-util-visit';
// import dedent from "ts-dedent"

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

    // @ts-ignore
    node.type = 'html';
    node.value = `
      <div class="mermaid" data-content="${escapeHtml(node.value)}">
        <p>Loading graph...</p>
      </div>
    `;
  });
};
