import { buildUrl } from '@utils/url-builder';

export interface SearchNode {
  key: string;
  title: string;
  badge?: string;
  summary?: string;
  href?: string;
  icon?: string;
  leftIcon?: string;
  matchedExcerpt?: string;
}

export interface SearchItem {
  id: string;
  name: string;
  url: string;
  type: string;
  key?: string;
  rawNode: {
    title?: string;
    badge?: string;
    summary?: string;
    icon?: string;
    leftIcon?: string;
    matchedExcerpt?: string;
  };
  isFavorite?: boolean;
}

export interface SearchFilter {
  id: string;
  name: string;
  count: number;
}

interface PagefindResult {
  id: string;
  score?: number;
  data: () => Promise<{
    url: string;
    excerpt?: string;
    content?: string;
    meta?: Record<string, any>;
  }>;
}

const docsPathByType: Record<string, string> = {
  channel: 'channels',
  command: 'commands',
  container: 'containers',
  'data-product': 'data-products',
  domain: 'domains',
  entity: 'entities',
  event: 'events',
  flow: 'flows',
  query: 'queries',
  service: 'services',
};

export const getUrlForSearchItem = (node: { href?: string }, key: string) => {
  const parts = key.split(':');
  if (parts.length < 2) return null;

  const type = parts[0];
  const id = parts[1];
  const version = parts[2];

  if (type === 'list') return null;

  if (!version) return null;

  if (node.href) return node.href;

  const docsPath = docsPathByType[type];
  if (!docsPath) return null;

  return buildUrl(`/docs/${docsPath}/${id}/${version}`);
};

export const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSearchTerms = (query: string) => [...new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean))];

const getMarkedTerms = (value: string) => {
  return [...value.matchAll(/<mark>(.*?)<\/mark>/gi)].map((match) => stripHtml(match[1]).toLowerCase());
};

export const highlightQuery = (value: string, query: string) => {
  const terms = getSearchTerms(query).sort((a, b) => b.length - a.length);

  if (terms.length === 0) {
    return escapeHtml(value);
  }

  const termLookup = new Set(terms);
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');

  return value
    .split(pattern)
    .map((part) => (termLookup.has(part.toLowerCase()) ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join('');
};

export const normalizeResultUrl = (url: string) => {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('/')) {
    return url;
  }

  return `/${url}`;
};

export const hasMeaningfulIndexedMatch = ({
  query,
  title,
  content,
  excerpt,
}: {
  query: string;
  title: string;
  content?: string;
  excerpt: string;
}) => {
  const terms = getSearchTerms(query);
  if (terms.length === 0) {
    return false;
  }

  const searchableText = `${title} ${content || ''}`.toLowerCase();
  if (terms.some((term) => searchableText.includes(term))) {
    return true;
  }

  const minimumMarkedLength = Math.min(3, Math.max(...terms.map((term) => term.length)));
  return getMarkedTerms(excerpt).some((term) => term.length >= minimumMarkedLength);
};

export const getIndexedResultRank = ({
  query,
  title,
  id,
  url,
  content,
}: {
  query: string;
  title: string;
  id?: string;
  url: string;
  content?: string;
}) => {
  const terms = getSearchTerms(query);
  const titleText = title.toLowerCase();
  const identityText = `${id || ''} ${url}`.toLowerCase();
  const contentText = (content || '').toLowerCase();

  if (terms.some((term) => titleText.includes(term))) return 3;
  if (terms.some((term) => identityText.includes(term))) return 2;
  if (terms.some((term) => contentText.includes(term))) return 1;
  return 0;
};

export const applyActiveFilter = <T extends { type: string }>(items: T[], activeFilter: string) => {
  if (activeFilter === 'all') {
    return items;
  }

  if (activeFilter === 'Message') {
    return items.filter((item) => ['Event', 'Command', 'Query'].includes(item.type));
  }

  if (activeFilter === 'Team') {
    return items.filter((item) => ['Team', 'User'].includes(item.type));
  }

  return items.filter((item) => item.type === activeFilter);
};

export const getSearchFilters = ({ items, query }: { items: Array<{ type: string }>; query: string }): SearchFilter[] => {
  if (!items.length && query !== '') {
    return [{ id: 'all', name: 'All (0)', count: 0 }];
  }

  const counts: Record<string, number> = {
    all: items.length,
    Agent: 0,
    Domain: 0,
    Service: 0,
    Message: 0,
    Team: 0,
    Container: 0,
    Entity: 0,
    Design: 0,
    Channel: 0,
    Flow: 0,
    'Data Product': 0,
    'Custom Doc': 0,
    'Resource Doc': 0,
    Changelog: 0,
  };

  items.forEach((item) => {
    if (counts[item.type] !== undefined) {
      counts[item.type]++;
    }

    if (['Event', 'Command', 'Query'].includes(item.type)) {
      counts.Message++;
    }

    if (['Team', 'User'].includes(item.type)) {
      counts.Team++;
    }
  });

  const filters: SearchFilter[] = [{ id: 'all', name: `All (${counts.all})`, count: counts.all }];
  const addFilter = (id: string, name: string) => {
    if (counts[id] > 0) {
      filters.push({ id, name: `${name} (${counts[id]})`, count: counts[id] });
    }
  };

  addFilter('Domain', 'Domains');
  addFilter('Agent', 'Agents');
  addFilter('Service', 'Services');
  addFilter('Message', 'Messages');
  addFilter('Container', 'Data Stores');
  addFilter('Entity', 'Entities');
  addFilter('Channel', 'Channels');
  addFilter('Flow', 'Flows');
  addFilter('Data Product', 'Data Products');
  addFilter('Custom Doc', 'Custom Docs');
  addFilter('Resource Doc', 'Resource Docs');
  addFilter('Changelog', 'Changelogs');
  addFilter('Design', 'Designs');
  addFilter('Team', 'Teams & Users');

  return filters;
};

export const mapPagefindResultsToSearchItems = async ({
  results,
  query,
  limit,
}: {
  results: PagefindResult[];
  query: string;
  limit: number;
}): Promise<SearchItem[]> => {
  const mappedResults = await Promise.all(
    results.slice(0, limit).map(async (result, resultIndex) => {
      const data = await result.data();
      const meta = data.meta || {};
      const type = meta.type || 'Page';
      const title = meta.title || data.url || 'Untitled';
      const summary = meta.summary || stripHtml(data.excerpt || '');
      const url = normalizeResultUrl(data.url);

      if (
        !hasMeaningfulIndexedMatch({
          query,
          title,
          content: data.content,
          excerpt: data.excerpt || '',
        })
      ) {
        return null;
      }

      return {
        item: {
          id: result.id,
          name: title,
          url,
          type,
          rawNode: {
            title,
            badge: type,
            summary,
            matchedExcerpt: data.excerpt || summary,
          },
        } satisfies SearchItem,
        resultIndex,
        rank: getIndexedResultRank({
          query,
          title,
          id: meta.id,
          url,
          content: data.content,
        }),
        score: typeof result.score === 'number' ? result.score : 0,
      };
    })
  );

  return mappedResults
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .sort((a, b) => b.rank - a.rank || b.score - a.score || a.resultIndex - b.resultIndex)
    .map((result) => result.item);
};
