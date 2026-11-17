import type { ChildRef, NavigationData, NavNode } from '../../stores/sidebar-store/state';
import { parseSearchNodeKey } from './search-utils';

/** A line in a search result's preview, e.g. "Produced by: Order Service" */
export type SearchPreviewFact = { label: string; value: string; href?: string };
/** A button in the preview: Open, the schema or API, the diagram */
export type SearchPreviewAction = { label: string; href: string; primary?: boolean };

/** What the search modal shows beside its results for the one highlighted */
export type SearchPreview = {
  type: string;
  title: string;
  summary?: string;
  facts: SearchPreviewFact[];
  actions: SearchPreviewAction[];
};

type Nodes = NavigationData['nodes'];
type Link = { title: string; href?: string };

const MESSAGE_TYPES = ['event', 'command', 'query'];
const MAX_NAMES = 2;

/** A key as the nodes store it: an unversioned key points at the latest version's */
const resolveKey = (nodes: Nodes, key: string) => {
  let resolved = key;
  for (let hops = 0; hops < 3 && typeof nodes[resolved] === 'string'; hops++) resolved = nodes[resolved] as string;
  return resolved;
};

const getNode = (nodes: Nodes, key: string): NavNode | undefined => {
  const node = nodes[resolveKey(nodes, key)];
  return typeof node === 'object' ? node : undefined;
};

const groupsOf = (node: NavNode) =>
  (node.pages ?? []).filter((page): page is NavNode => typeof page === 'object' && page.type === 'group');

const findGroup = (node: NavNode, ...titles: string[]) => groupsOf(node).find((group) => titles.includes(group.title));

/** A resource's own page: the Overview item the sidebar lists under it */
const overviewHref = (node: NavNode) => {
  if (node.href) return node.href;
  for (const group of groupsOf(node)) {
    const overview = (group.pages ?? []).find(
      (page): page is NavNode => typeof page === 'object' && page.type === 'item' && page.title === 'Overview'
    );
    if (overview?.href) return overview.href;
  }
  return undefined;
};

/** What a group lists, as links: other resources (by key) and items, nested groups included */
const linksIn = (nodes: Nodes, pages: ChildRef[] | undefined): Link[] =>
  (pages ?? []).flatMap((page): Link[] => {
    if (typeof page === 'string') {
      const node = getNode(nodes, page);
      return node ? [{ title: node.title, href: overviewHref(node) }] : [];
    }
    if (page.type === 'group') return linksIn(nodes, page.pages);
    return page.visible === false ? [] : [{ title: page.title, href: page.href }];
  });

const groupLinks = (nodes: Nodes, node: NavNode, ...titles: string[]) => linksIn(nodes, findGroup(node, ...titles)?.pages);

/** The resources a group lists by key (e.g. a message's producers), as keys */
const groupKeys = (nodes: Nodes, node: NavNode, ...titles: string[]): string[] => {
  const keys: string[] = [];
  const walk = (pages: ChildRef[] | undefined) => {
    for (const page of pages ?? []) {
      if (typeof page === 'string') keys.push(resolveKey(nodes, page));
      else if (page.type === 'group') walk(page.pages);
    }
  };
  walk(findGroup(node, ...titles)?.pages);
  return keys;
};

/** For each resource, the domains and systems that list it: built once per sidebar data */
const parentsCache = new WeakMap<Nodes, Map<string, string[]>>();
const parentsOf = (nodes: Nodes, key: string) => {
  let parents = parentsCache.get(nodes);
  if (!parents) {
    const index = new Map<string, string[]>();
    const walk = (owner: string, pages: ChildRef[] | undefined) => {
      for (const page of pages ?? []) {
        if (typeof page === 'string') {
          const child = resolveKey(nodes, page);
          if (child !== owner) index.set(child, [...(index.get(child) ?? []), owner]);
        } else if (page.type === 'group') walk(owner, page.pages);
      }
    };
    for (const [owner, node] of Object.entries(nodes)) {
      const type = owner.slice(0, owner.indexOf(':'));
      if (typeof node === 'object' && (type === 'domain' || type === 'system')) walk(owner, node.pages);
    }
    parentsCache.set(nodes, index);
    parents = index;
  }
  return parents.get(key) ?? [];
};

const typeOf = (key: string) => key.slice(0, key.indexOf(':'));

/** The domain a resource is in: listed by it, or by a system in it */
const domainOf = (nodes: Nodes, key: string, seen = new Set<string>()): string | undefined => {
  if (seen.has(key)) return undefined;
  seen.add(key);
  const parents = parentsOf(nodes, key);
  const domain = parents.find((parent) => typeOf(parent) === 'domain');
  if (domain) return domain;
  for (const system of parents.filter((parent) => typeOf(parent) === 'system')) {
    const found = domainOf(nodes, system, seen);
    if (found) return found;
  }
  return undefined;
};

const systemOf = (nodes: Nodes, key: string) => parentsOf(nodes, key).find((parent) => typeOf(parent) === 'system');

const linkTo = (nodes: Nodes, key: string | undefined): Link | undefined => {
  const node = key ? getNode(nodes, key) : undefined;
  return node ? { title: node.title, href: overviewHref(node) } : undefined;
};

/** A fact naming one or more resources: the first few, then how many more */
const namesFact = (label: string, links: Link[]): SearchPreviewFact | undefined => {
  if (links.length === 0) return undefined;
  const names = links.slice(0, MAX_NAMES).map((link) => link.title);
  const more = links.length - names.length;
  return {
    label,
    value: more > 0 ? `${names.join(', ')} +${more} more` : names.join(', '),
    ...(links.length === 1 && links[0].href ? { href: links[0].href } : {}),
  };
};

const countFact = (label: string, count: number, noun: string): SearchPreviewFact | undefined =>
  count > 0 ? { label, value: `${count} ${noun}${count === 1 ? '' : 's'}` } : undefined;

const factsFor = (nodes: Nodes, key: string, node: NavNode): (SearchPreviewFact | undefined)[] => {
  const type = typeOf(key);
  const owners = namesFact('Owner', groupLinks(nodes, node, 'Owners'));

  if (MESSAGE_TYPES.includes(type)) {
    const producers = groupKeys(nodes, node, 'Producers');
    const consumers = groupKeys(nodes, node, 'Consumers');
    // An event belongs with the service that publishes it, a command or query with the one that receives it, so its
    // domain is that service's. A domain that only lists it (another domain's event it receives, a command it sends)
    // doesn't own it, so that's only the fallback when no home service has a domain
    const homes = type === 'event' ? [...producers, ...consumers] : [...consumers, ...producers];
    const domain = homes.map((home) => domainOf(nodes, home)).find(Boolean) ?? domainOf(nodes, key);
    const isEvent = type === 'event';
    return [
      namesFact(
        'Domain',
        [linkTo(nodes, domain)].filter((link): link is Link => !!link)
      ),
      namesFact(
        isEvent ? 'Produced by' : 'Sent by',
        producers.map((k) => linkTo(nodes, k)).filter((l): l is Link => !!l)
      ),
      namesFact(
        isEvent ? 'Consumed by' : 'Handled by',
        consumers.map((k) => linkTo(nodes, k)).filter((l): l is Link => !!l)
      ),
      owners,
    ];
  }

  if (type === 'service' || type === 'agent' || type === 'container') {
    const system = systemOf(nodes, key);
    return [
      namesFact(
        'Domain',
        [linkTo(nodes, domainOf(nodes, key))].filter((link): link is Link => !!link)
      ),
      namesFact(
        'System',
        [linkTo(nodes, system)].filter((link): link is Link => !!link)
      ),
      countFact('Sends', groupKeys(nodes, node, 'Outbound Messages').length, 'message'),
      countFact('Receives', groupKeys(nodes, node, 'Inbound Messages').length, 'message'),
      owners,
    ];
  }

  if (type === 'domain') {
    return [namesFact('Systems', groupLinks(nodes, node, 'Systems')), owners];
  }

  if (type === 'system') {
    return [
      namesFact(
        'Domain',
        [linkTo(nodes, domainOf(nodes, key))].filter((link): link is Link => !!link)
      ),
      owners,
    ];
  }

  if (type === 'flow') {
    return [
      countFact('Services', groupKeys(nodes, node, 'Services').length, 'service'),
      countFact('Messages', groupKeys(nodes, node, 'Messages').length, 'message'),
    ];
  }

  if (type === 'entity') {
    return [namesFact('Domain', groupLinks(nodes, node, 'Domains')), owners];
  }

  if (type === 'team') {
    return [countFact('Members', groupLinks(nodes, node, 'Members').length, 'member')];
  }

  return [owners];
};

const actionsFor = (key: string, node: NavNode, url: string): SearchPreviewAction[] => {
  const type = typeOf(key);
  const actions: SearchPreviewAction[] = [{ label: 'Open', href: url, primary: true }];
  const contract = (findGroup(node, 'API & Contracts')?.pages ?? []).find(
    (page): page is NavNode => typeof page === 'object' && page.type === 'item' && !!page.href
  );
  if (contract?.href) actions.push({ label: MESSAGE_TYPES.includes(type) ? 'View schema' : 'View API', href: contract.href });
  const diagram = (findGroup(node, 'Architecture')?.pages ?? []).find(
    (page): page is NavNode => typeof page === 'object' && page.type === 'item' && page.title === 'Diagram' && !!page.href
  );
  if (diagram?.href) actions.push({ label: 'Diagram', href: diagram.href });
  return actions;
};

/**
 * A preview of a search result, from the sidebar data every page already loads: what it is, how it's connected (its
 * domain, producers, consumers, owner…) and where to go next. A result with no node there (e.g. a custom docs page from
 * indexed search) is previewed from the result itself.
 */
export const getSearchPreview = (
  nodes: Nodes | undefined,
  result: { key?: string; url: string; name: string; type: string; summary?: string }
): SearchPreview => {
  const node = nodes && result.key ? getNode(nodes, result.key) : undefined;
  if (!nodes || !result.key || !node || !parseSearchNodeKey(result.key)) {
    return {
      type: result.type,
      title: result.name,
      summary: result.summary,
      facts: [],
      actions: [{ label: 'Open', href: result.url, primary: true }],
    };
  }
  const key = resolveKey(nodes, result.key);
  return {
    type: node.badge ?? result.type,
    title: node.title,
    summary: node.summary?.trim() || result.summary,
    facts: factsFor(nodes, key, node).filter((fact): fact is SearchPreviewFact => !!fact),
    actions: actionsFor(key, node, result.url),
  };
};
