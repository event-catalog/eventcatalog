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

const PLACEMENTS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

export interface MermaidCodeBlockOptions {
  /** Position of the interactive controls */
  placement?: (typeof PLACEMENTS)[number];
  /** Force the interactive controls on or off */
  actions?: boolean;
}

/**
 * Parses options from the code fence meta string, e.g.
 *
 *   ```mermaid placement="top-left" actions={false}
 *
 * Supports `placement="..."` / `placement='...'` and `actions={true|false}` / `actions=true|false`.
 */
export function parseMermaidMeta(meta: string | null | undefined): MermaidCodeBlockOptions {
  const options: MermaidCodeBlockOptions = {};
  if (!meta) return options;

  const placementMatch = meta.match(/placement=(?:["']([^"']+)["']|\{["']([^"']+)["']\})/);
  const placement = placementMatch?.[1] ?? placementMatch?.[2];
  if (placement && (PLACEMENTS as readonly string[]).includes(placement)) {
    options.placement = placement as MermaidCodeBlockOptions['placement'];
  }

  const actionsMatch = meta.match(/actions=\{?(true|false)\}?/);
  if (actionsMatch) {
    options.actions = actionsMatch[1] === 'true';
  }

  return options;
}

/**
 * Builds the `data-*` attributes used by the client-side renderer to configure the controls
 */
export function buildControlAttributes(options: MermaidCodeBlockOptions): string {
  const attributes: string[] = [];
  if (options.placement) attributes.push(`data-placement="${options.placement}"`);
  if (options.actions !== undefined) attributes.push(`data-actions="${options.actions}"`);
  return attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
}

export const mermaid: RemarkPlugin<[]> = () => (tree) => {
  visit(tree, 'code', (node) => {
    if (node.lang !== 'mermaid') return;

    // @ts-ignore meta is present on code nodes
    const controlAttributes = buildControlAttributes(parseMermaidMeta(node.meta));

    // @ts-ignore test
    node.type = 'html';
    node.value = `
    <div class="mermaid-block pb-4">
      <div class="mermaid border border-[rgb(var(--ec-page-border))] rounded-lg p-1" data-content="${escapeHtml(node.value)}"${controlAttributes}>
        <p class="text-[rgb(var(--ec-page-text-muted))]">Loading graph...</p>
      </div>
    </div>
    `;
  });
};
