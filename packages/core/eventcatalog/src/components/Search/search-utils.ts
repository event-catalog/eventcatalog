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
  adr: 'adrs',
  agent: 'agents',
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
  system: 'systems',
};

/**
 * Splits a search node key ("type:id:version", or "type:id" for unversioned resources) into its parts.
 * Ids can contain ":" themselves (e.g. "persistent://tenant/ns:topic" or "urn:a:b"), so the type is
 * everything before the first ":" and the version everything after the last one.
 */
export const parseSearchNodeKey = (key: string) => {
  const typeEnd = key.indexOf(':');
  if (typeEnd === -1) return null;

  const type = key.slice(0, typeEnd);
  const rest = key.slice(typeEnd + 1);
  const versionStart = rest.lastIndexOf(':');
  if (versionStart === -1) return { type, id: rest, version: undefined };

  return { type, id: rest.slice(0, versionStart), version: rest.slice(versionStart + 1) };
};

/**
 * Where a search result opens: the resource's own page link when the index has one (teams and users have no version,
 * so it's their only way in), else its docs page built from the key.
 */
export const getUrlForSearchItem = (node: { href?: string }, key: string) => {
  const parts = parseSearchNodeKey(key);
  if (!parts) return null;

  const { type, id, version } = parts;

  if (type === 'list') return null;

  if (node.href) return node.href;

  if (!version) return null;

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
  const fullQuery = query.trim().toLowerCase();
  const titleText = title.toLowerCase();
  const idText = (id || '').toLowerCase();
  const identityText = `${idText} ${url}`.toLowerCase();
  const contentText = (content || '').toLowerCase();

  if (fullQuery && (titleText === fullQuery || idText === fullQuery)) return 5;
  if (fullQuery && endsWithSegment(titleText, fullQuery)) return 4;
  if (terms.some((term) => titleText.includes(term))) return 3;
  if (terms.some((term) => identityText.includes(term))) return 2;
  if (terms.some((term) => contentText.includes(term))) return 1;
  return 0;
};

/**
 * Whether the text ends with the query as its last path segment, after a "/", ":" or ".".
 * Channel and message names are often addresses, so "outgoing-sms" is the topic
 * "persistent://tenant/ns/outgoing-sms" more than it is "urn:topic:outgoing-sms:publish".
 */
const endsWithSegment = (text: string, query: string) =>
  text.length > query.length && text.endsWith(query) && /[/:.]/.test(text[text.length - query.length - 1]);

const isWordBoundary = (char: string | undefined) => char === undefined || !/[a-z0-9]/i.test(char);

/** Whether the query appears in the text as whole words ("order" in "Process Order", not in "Reorder") */
const containsWholeWords = (text: string, query: string) => {
  for (let index = text.indexOf(query); index !== -1; index = text.indexOf(query, index + 1)) {
    if (isWordBoundary(text[index - 1]) && isWordBoundary(text[index + query.length])) return true;
  }
  return false;
};

/** Ranks at or above this matched the resource's name (or exactly its id) */
const NAME_MATCH_RANK = 3;

/**
 * Text as search compares it: lower case, with camelCase and separators turned into spaces, so "OrderCreated",
 * "order-created" and "Order Created" all read "order created"
 */
export const normalizeSearchText = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

type SearchFields = {
  name: string;
  id: string;
  summary: string;
  normName: string;
  normId: string;
  normAll: string;
  compactName: string;
  compactId: string;
};

// Each item's text, prepared once rather than on every keystroke
const fieldCache = new WeakMap<object, SearchFields>();
const getSearchFields = (item: Pick<SearchItem, 'name' | 'key' | 'rawNode'> & { type?: string }): SearchFields => {
  const cached = fieldCache.get(item);
  if (cached) return cached;
  const id = (item.key ? parseSearchNodeKey(item.key)?.id : undefined) ?? '';
  const summary = item.rawNode.summary ?? '';
  const normName = normalizeSearchText(item.name);
  const normId = normalizeSearchText(id);
  const fields: SearchFields = {
    name: item.name.toLowerCase(),
    id: id.toLowerCase(),
    summary: summary.toLowerCase(),
    normName,
    normId,
    normAll: normalizeSearchText(`${item.name} ${id} ${summary} ${item.type ?? item.rawNode.badge ?? ''}`),
    compactName: normName.replace(/ /g, ''),
    compactId: normId.replace(/ /g, ''),
  };
  fieldCache.set(item, fields);
  return fields;
};

/** Whether the word starts a word in the (normalised) text: "ord" in "place order", not "rder" */
const startsAWord = (text: string, word: string) => text.startsWith(word) || text.includes(` ${word}`);

/**
 * How well a resource matches a resource search query, as the whole query first: an exact name or id (7, also
 * ignoring case, spaces and separators, so "OrderCreated" is "Order Created"), a name whose last path segment is the
 * query (6), a name starting with it (5), containing it as whole words (4) or anywhere (3), then the id (2), then the
 * summary (1). Failing that, word by word, in any order: every word starting a word in the name (3.5), every word in
 * the name (2.5), in the name or id (2), some in the name with the rest in its id, summary or type (1.5), or all of
 * them somewhere in those (1). 0 is no match.
 */
export const getResourceResultRank = (item: Pick<SearchItem, 'name' | 'key' | 'rawNode'> & { type?: string }, query: string) => {
  const lowerQuery = query.trim().toLowerCase();
  if (!lowerQuery) return 0;
  const { name, id, summary, normName, normId, normAll, compactName, compactId } = getSearchFields(item);
  const normQuery = normalizeSearchText(query);
  const compactQuery = normQuery.replace(/ /g, '');

  // The query as one phrase
  if (name === lowerQuery || id === lowerQuery || (compactQuery && (compactName === compactQuery || compactId === compactQuery)))
    return 7;
  if (endsWithSegment(name, lowerQuery)) return 6;
  if (name.startsWith(lowerQuery) || (normQuery && normName.startsWith(normQuery))) return 5;
  if (containsWholeWords(name, lowerQuery) || (normQuery && containsWholeWords(normName, normQuery))) return 4;
  if (name.includes(lowerQuery)) return 3;
  if (id.includes(lowerQuery) || (normQuery && normId.includes(normQuery))) return 2;
  if (summary.includes(lowerQuery)) return 1;

  // Word by word, in any order
  const words = [...new Set(normQuery.split(' ').filter(Boolean))];
  if (words.length < 2) return 0;
  if (!words.every((word) => normAll.includes(word))) return 0;
  if (words.every((word) => startsAWord(normName, word))) return 3.5;
  if (words.every((word) => normName.includes(word))) return 2.5;
  if (words.every((word) => normName.includes(word) || normId.includes(word))) return 2;
  if (words.some((word) => normName.includes(word))) return 1.5;
  return 1;
};

/**
 * Resources that match a resource search query, best matches first. Within a name match rank,
 * shorter names come first (the query is more of the name); otherwise index order.
 */
export const rankResourceSearchItems = <T extends Pick<SearchItem, 'name' | 'key' | 'rawNode'> & { type?: string }>(
  items: T[],
  query: string
) =>
  items
    .map((item, index) => ({ item, index, rank: getResourceResultRank(item, query) }))
    .filter(({ rank }) => rank > 0)
    .sort(
      (a, b) => b.rank - a.rank || (a.rank >= NAME_MATCH_RANK ? a.item.name.length - b.item.name.length : 0) || a.index - b.index
    )
    .map(({ item }) => item);

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
    System: 0,
    'Decision record': 0,
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
  addFilter('System', 'Systems');
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
  addFilter('Decision record', 'Decision Records');
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
