import { getCollection } from 'astro:content';
import { isLastUpdatedEnabled } from '@utils/feature';
import { getLastUpdated, getResourceFileLastUpdated, type LastUpdatedEntry } from '@utils/last-updated';
import { PAGE_SEGMENT_BY_SPECIFICATION_TYPE, processSpecifications } from '@utils/collections/util';
import { buildUrl } from '@utils/url-builder';

/** The resources the dashboard shows, by collection */
export type DashboardCollection = 'domains' | 'services' | 'events' | 'commands' | 'queries' | 'flows';

type Owner = { id: string };

/** The fields the dashboard reads from a collection entry */
export type DashboardEntry = {
  filePath?: string;
  data: {
    id: string;
    name?: string;
    version: string;
    summary?: string;
    owners?: Owner[];
    schemaPath?: string;
    specifications?: LastUpdatedEntry['data']['specifications'];
  };
};

export type DashboardResource = {
  /** A resource itself, or one of its files listed on its own: a message's schema, or a specification */
  kind: 'resource' | 'schema' | 'specification';
  /** For a specification, its name, e.g. "OpenAPI" */
  label?: string;
  collection: DashboardCollection;
  id: string;
  version: string;
  name: string;
  summary?: string;
  href: string;
  owners: { id: string; name: string }[];
  updatedAt?: number;
};

export type DashboardData = {
  counts: Record<DashboardCollection | 'messages' | 'schemas' | 'teams' | 'users', number>;
  recentlyUpdated: DashboardResource[];
};

const MESSAGE_COLLECTIONS = ['events', 'commands', 'queries'] as const;

// The latest version of a resource (older versions live in a `versioned` folder)
const isCurrent = (entry: DashboardEntry) => !entry.filePath?.includes('versioned');

/**
 * Everything the homepage dashboard shows, from the catalog's collections: counts, and what changed recently.
 */
export const buildDashboard = ({
  collections,
  teams,
  users,
  getUpdatedAt,
}: {
  collections: Record<DashboardCollection, DashboardEntry[]>;
  teams: DashboardEntry[];
  users: DashboardEntry[];
  /**
   * When something last changed (unix ms), if known: with `file` (relative to the resource), that file; without it, the
   * resource itself, not counting its schema and specifications (they're listed on their own)
   */
  getUpdatedAt: (entry: DashboardEntry, file?: string) => number | undefined;
}): DashboardData => {
  const ownerNames = new Map<string, string>();
  for (const owner of [...teams, ...users]) ownerNames.set(owner.data.id, owner.data.name ?? owner.data.id);

  const toResource = (collection: DashboardCollection, entry: DashboardEntry): DashboardResource => ({
    kind: 'resource',
    collection,
    id: entry.data.id,
    version: entry.data.version,
    name: entry.data.name ?? entry.data.id,
    summary: entry.data.summary?.trim() || undefined,
    href: buildUrl(`/docs/${collection}/${entry.data.id}/${entry.data.version}`),
    owners: (entry.data.owners ?? []).map(({ id }) => ({ id, name: ownerNames.get(id) ?? id })),
    updatedAt: getUpdatedAt(entry),
  });

  const current = Object.fromEntries(
    Object.entries(collections).map(([collection, entries]) => [collection, entries.filter(isCurrent)])
  ) as Record<DashboardCollection, DashboardEntry[]>;
  const messages = MESSAGE_COLLECTIONS.flatMap((collection) => current[collection]);
  const all = (Object.keys(current) as DashboardCollection[]).flatMap((collection) =>
    current[collection].map((entry) => ({ entry, resource: toResource(collection, entry) }))
  );

  // A message's schema and a resource's specifications, each listed on its own
  const files = all.flatMap(({ entry, resource }): DashboardResource[] => {
    const schema: DashboardResource[] = entry.data.schemaPath
      ? [
          {
            ...resource,
            kind: 'schema',
            href: buildUrl(
              `/schemas/explorer?id=${encodeURIComponent(resource.id)}&version=${encodeURIComponent(resource.version)}&collection=${resource.collection}`
            ),
            updatedAt: getUpdatedAt(entry, entry.data.schemaPath),
          },
        ]
      : [];
    const specifications = processSpecifications(entry.data.specifications).map(
      (specification): DashboardResource => ({
        ...resource,
        kind: 'specification',
        label: specification.name,
        href: buildUrl(
          `/docs/${resource.collection}/${resource.id}/${resource.version}/${PAGE_SEGMENT_BY_SPECIFICATION_TYPE[specification.type]}/${specification.filenameWithoutExtension}`
        ),
        updatedAt: getUpdatedAt(entry, specification.path),
      })
    );
    return [...schema, ...specifications];
  });

  const recentlyUpdated = [...all.map(({ resource }) => resource), ...files]
    .filter((resource) => resource.updatedAt !== undefined)
    .sort((a, b) => b.updatedAt! - a.updatedAt!)
    .slice(0, 8);

  const withSchema = messages.filter((entry) => entry.data.schemaPath).length;

  return {
    counts: {
      domains: current.domains.length,
      services: current.services.length,
      events: current.events.length,
      commands: current.commands.length,
      queries: current.queries.length,
      flows: current.flows.length,
      messages: messages.length,
      schemas: withSchema,
      teams: teams.filter(isCurrent).length,
      users: users.filter(isCurrent).length,
    },
    recentlyUpdated,
  };
};

// When something last changed, from git. Only with lastUpdated on (the homepage shows what changed recently only then),
// so git isn't read otherwise
const getUpdatedAt = (entry: DashboardEntry, file?: string) => {
  if (!isLastUpdatedEnabled()) return undefined;
  const date = file ? getResourceFileLastUpdated(entry, file) : getLastUpdated(entry, { schemas: false });
  return date?.getTime();
};

/** The homepage dashboard for this catalog */
export const getDashboard = async (): Promise<DashboardData> => {
  const [domains, services, events, commands, queries, flows, teams, users] = await Promise.all([
    getCollection('domains'),
    getCollection('services'),
    getCollection('events'),
    getCollection('commands'),
    getCollection('queries'),
    getCollection('flows'),
    getCollection('teams'),
    getCollection('users'),
  ]);
  return buildDashboard({
    collections: { domains, services, events, commands, queries, flows } as unknown as Record<
      DashboardCollection,
      DashboardEntry[]
    >,
    teams: teams as unknown as DashboardEntry[],
    users: users as unknown as DashboardEntry[],
    getUpdatedAt,
  });
};
