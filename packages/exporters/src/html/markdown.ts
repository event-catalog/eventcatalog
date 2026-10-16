import { Marked } from 'marked';
import { escapeHtml, highlight } from './highlight';

/** Resolves a `[[type|id]]` resource link to its name and anchor in the document. */
export type ResolveLink = (type: string, id: string) => { name: string; anchor?: string } | undefined;

const FENCE = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;

/**
 * Removes what only renders inside an EventCatalog site: MDX imports and exports, and JSX components
 * such as <NodeGraph /> or <Tabs>. The markdown between paired components is kept.
 */
/**
 * Removes JSX component tags (opening, closing and self-closing, such as <NodeGraph /> or <Tabs>). Scans rather than
 * matching a pattern, because attribute values can hold quotes and nested braces, e.g. href={`/a/${frontmatter.id}`}.
 */
const stripComponentTags = (source: string) => {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const start = source.indexOf('<', i);
    if (start === -1) break;
    const isComponent = /^<\/?[A-Z]/.test(source.slice(start, start + 3));
    if (!isComponent) {
      out += source.slice(i, start + 1);
      i = start + 1;
      continue;
    }
    // Walk to the '>' that closes the tag, skipping quoted strings, template literals and {expressions}
    let j = start + 1;
    let depth = 0;
    let quote = '';
    for (; j < source.length; j++) {
      const c = source[j];
      if (quote) {
        if (c === '\\') j++;
        else if (c === quote) quote = '';
      } else if (c === '"' || c === "'" || c === '`') quote = c;
      else if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '>' && depth <= 0) break;
    }
    out += source.slice(i, start);
    i = j + 1;
  }
  return out + source.slice(i);
};

/** `[[service|OrderService]]` (also `[[service\\|…]]`, as written inside tables). */
export const RESOURCE_LINK = /\[\[([a-z-]+)\s*\\?\|([^[\]]+)\]\]/gi;

const stripMdx = (source: string) =>
  stripComponentTags(source.replace(/^(import|export)\s[^\n]*$/gm, '')).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

// One capture after the pipe (spaces trimmed in code), so nothing matches the same text two ways, and it stops at the
// next bracket, so each attempt ends where the next one starts: linear on any input
const rewriteLinks = (source: string, resolve: ResolveLink) =>
  source.replace(RESOURCE_LINK, (link, type: string, id: string) => {
    if (!id.trim()) return link;
    const target = resolve(type.toLowerCase(), id.trim());
    if (!target) return `\`${id.trim()}\``;
    return target.anchor ? `[${target.name}](#${target.anchor})` : target.name;
  });

const marked = new Marked({
  gfm: true,
  async: false,
  renderer: {
    // Resource docs sit under the section's own h2, so their headings start at h3.
    heading({ tokens, depth }) {
      const level = Math.min(depth + 2, 6);
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
    html({ text }) {
      return escapeHtml(text);
    },
    code({ text, lang }) {
      const label = (lang || '').split(/\s+/)[0];
      // Rendered in the browser by mermaid, as the catalog does. The source shows until then (or offline).
      if (label === 'mermaid') {
        return `<div class="mermaid" data-content="${escapeHtml(text)}"><pre class="md-code"><code>${escapeHtml(text)}</code></pre></div>\n`;
      }
      return `<pre class="md-code"${label ? ` data-lang="${escapeHtml(label)}"` : ''}><code>${highlight(text)}</code></pre>\n`;
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safe = /^(https?:|mailto:|#|\/|\.)/i.test(href) ? href : '#';
      const external = /^https?:/i.test(safe);
      return `<a href="${escapeHtml(safe)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
    },
    image({ href, text }) {
      // Images in a catalog are usually site-relative and will not resolve from a standalone file.
      return /^https?:/i.test(href) ? `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}" loading="lazy">` : '';
    },
    table(token) {
      const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join('');
      const body = token.rows
        .map((row) => `<tr>${row.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
        .join('');
      return `<div class="md-table"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
    },
  },
});

/** Converts a resource's MDX body to HTML for the reference. Returns '' when nothing readable is left. */
export const renderMarkdown = (source: string, resolve: ResolveLink): string => {
  if (!source.trim()) return '';
  // Leave fenced code untouched while stripping MDX from the prose around it.
  let out = '';
  let last = 0;
  for (const m of source.matchAll(FENCE)) {
    out += rewriteLinks(stripMdx(source.slice(last, m.index)), resolve) + m[0];
    last = (m.index || 0) + m[0].length;
  }
  out += rewriteLinks(stripMdx(source.slice(last)), resolve);
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  if (!out) return '';
  return dropEmptyHeadings((marked.parse(out) as string).trim());
};

/** Removes headings left with nothing under them, e.g. "Architecture diagram" once <NodeGraph /> is gone. */
const dropEmptyHeadings = (html: string) => {
  const parts = html.split(/(?=<h[3-6]>)/);
  const level = (part: string) => Number(part.match(/^<h([3-6])>/)?.[1] || 0);
  const kept: string[] = [];
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const lvl = level(part);
    const body = part.replace(/^<h[3-6]>[\s\S]*?<\/h[3-6]>/, '').trim();
    const nextLevel = kept.length ? level(kept[0]) : 0;
    if (lvl && !body && (!nextLevel || nextLevel <= lvl)) continue;
    kept.unshift(part);
  }
  return kept.join('').trim();
};
