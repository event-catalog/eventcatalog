/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import MiniSearch from 'minisearch';

export type MarkdownChunk = {
  heading: string | null;
  content: string;
};

export type DocForIndexing = {
  id: string;
  title: string;
  summary?: string;
  body?: string;
};

export type DocsSearchHit = {
  docId: string;
  title: string;
  heading: string | null;
  snippet: string;
  score: number;
};

export type DocsSearchIndex = {
  search: (query: string, options?: { limit?: number }) => DocsSearchHit[];
};

const DEFAULT_SEARCH_LIMIT = 10;
const SNIPPET_RADIUS = 100;

/**
 * Splits markdown into section chunks at ATX headings (any level).
 * Content before the first heading becomes a chunk with a null heading.
 * Headings inside fenced code blocks are ignored.
 */
export const chunkMarkdownByHeadings = (markdown: string): MarkdownChunk[] => {
  const chunks: MarkdownChunk[] = [];
  let heading: string | null = null;
  let buffer: string[] = [];
  let insideCodeFence = false;

  const flush = () => {
    const content = buffer.join('\n').trim();
    if (heading !== null || content) {
      chunks.push({ heading, content });
    }
    buffer = [];
  };

  for (const line of markdown.split('\n')) {
    if (/^(```|~~~)/.test(line.trim())) {
      insideCodeFence = !insideCodeFence;
    }

    const headingMatch = insideCodeFence ? null : line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      flush();
      heading = headingMatch[1].trim();
    } else {
      buffer.push(line);
    }
  }

  flush();
  return chunks;
};

/**
 * Returns a short excerpt of the content centred on the first query term found.
 * Falls back to the start of the content when no term matches.
 */
export const extractSnippet = (content: string, query: string, radius: number = SNIPPET_RADIUS): string => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  const lowercased = normalized.toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  let matchIndex = -1;
  for (const term of terms) {
    matchIndex = lowercased.indexOf(term);
    if (matchIndex !== -1) break;
  }

  if (matchIndex === -1) {
    return normalized.length <= radius * 2 ? normalized : `${normalized.slice(0, radius * 2)}…`;
  }

  const start = Math.max(0, matchIndex - radius);
  const end = Math.min(normalized.length, matchIndex + radius);
  return `${start > 0 ? '…' : ''}${normalized.slice(start, end)}${end < normalized.length ? '…' : ''}`;
};

/**
 * Builds an in-memory BM25 search index over custom documentation.
 * Each document is indexed as one entry per markdown section, so search hits
 * point at the specific section of a document rather than the whole document.
 */
export const buildDocsSearchIndex = (docs: DocForIndexing[]): DocsSearchIndex => {
  const miniSearch = new MiniSearch({
    fields: ['title', 'summary', 'heading', 'content'],
    storeFields: ['docId', 'title', 'heading', 'content'],
    searchOptions: {
      boost: { title: 3, heading: 2, summary: 2 },
      prefix: true,
    },
  });

  const sections = docs.flatMap((doc) => {
    const chunks = chunkMarkdownByHeadings(doc.body ?? '');
    // Documents with an empty body should still be searchable by title/summary
    const indexableChunks = chunks.length > 0 ? chunks : [{ heading: null, content: '' }];

    return indexableChunks.map((chunk, index) => ({
      id: `${doc.id}#${index}`,
      docId: doc.id,
      title: doc.title,
      summary: doc.summary,
      heading: chunk.heading,
      content: chunk.content,
    }));
  });

  miniSearch.addAll(sections);

  return {
    search: (query, options = {}) => {
      const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;

      return miniSearch
        .search(query)
        .slice(0, limit)
        .map((result) => ({
          docId: result.docId,
          title: result.title,
          heading: result.heading ?? null,
          snippet: extractSnippet(result.content ?? '', query),
          score: result.score,
        }));
    },
  };
};
