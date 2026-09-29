import type { CollectionEntry } from 'astro:content';

export type Lane = { id: string; name: string };

/**
 * The lanes a flow step's resource belongs to, for grouping a flow into
 * swimlanes by domain, system or owning team. Only set for resources that
 * belong somewhere themselves (services, agents, data stores, data products,
 * systems);
 * the visualiser puts other steps (messages, custom steps, sub-flows) in the
 * lane of the step that leads to them. `external` steps (actors and external
 * systems) get a lane of their own.
 */
export type StepLanes = {
  domain?: Lane;
  system?: Lane;
  team?: Lane;
  external?: boolean;
};

type LaneCollections = {
  domains: CollectionEntry<'domains'>[];
  systems: CollectionEntry<'systems'>[];
  teams: CollectionEntry<'teams'>[];
  users: CollectionEntry<'users'>[];
};

/** A resource a step points at (a service, agent, data store, data product or system) */
type Resource = { data: { id: string; name?: string; owners?: (string | { id: string })[] } };

// Lanes use the latest version of each domain and system (as the collection
// utils do when they don't ask for every version)
const isLatest = (entry: { filePath?: string }) => !entry.filePath?.includes('versioned');
const toLane = (entry: Resource): Lane => ({ id: entry.data.id, name: entry.data.name || entry.data.id });
const pointerIds = (pointers?: { id: string }[]) => (pointers || []).map((pointer) => pointer.id);

/**
 * Indexes which domain, system and team each resource belongs to (by id).
 * A resource listed by a domain directly belongs to that domain, otherwise to
 * the domain of the system it's in. Built once per flow from the collections,
 * rather than asking `getDomainsForService`, `getOwner` and so on for each step,
 * so it follows their rules: latest versions only, and hidden teams and users
 * are left out.
 */
export const createLaneIndex = ({ domains, systems, teams, users }: LaneCollections) => {
  const systemOf = new Map<string, Lane>();
  const domainOf = new Map<string, Lane>();

  const latestSystems = systems.filter(isLatest);
  for (const system of latestSystems) {
    for (const id of [...pointerIds(system.data.services), ...pointerIds(system.data.containers)]) {
      if (!systemOf.has(id)) systemOf.set(id, toLane(system));
    }
  }

  const latestDomains = domains.filter(isLatest);
  // Resources a domain lists directly win over ones it gets through its systems
  for (const domain of latestDomains) {
    const direct = [
      ...pointerIds(domain.data.services),
      ...pointerIds(domain.data.agents),
      ...pointerIds(domain.data['data-products']),
      ...pointerIds(domain.data.systems),
    ];
    for (const id of direct) {
      if (!domainOf.has(id)) domainOf.set(id, toLane(domain));
    }
  }
  for (const system of latestSystems) {
    const domain = domainOf.get(system.data.id);
    if (!domain) continue;
    for (const id of [...pointerIds(system.data.services), ...pointerIds(system.data.containers)]) {
      if (!domainOf.has(id)) domainOf.set(id, domain);
    }
  }

  const owners = new Map<string, { lane: Lane; isTeam: boolean }>();
  const hiddenOwners = new Set<string>();
  for (const [entries, isTeam] of [
    [users, false],
    [teams, true],
  ] as const) {
    for (const owner of entries) {
      if (owner.data.hidden) hiddenOwners.add(owner.data.id);
      else owners.set(owner.data.id, { lane: toLane(owner), isTeam });
    }
  }

  // A team owner wins over a user owner
  const teamOf = (resource: Resource): Lane | undefined => {
    const resolved = (resource.data.owners || [])
      .map((owner) => (typeof owner === 'string' ? owner : owner.id))
      .filter((id) => !hiddenOwners.has(id))
      .map((id) => owners.get(id) ?? { lane: { id, name: id }, isTeam: false })
      .sort((a, b) => Number(b.isTeam) - Number(a.isTeam));
    return resolved[0]?.lane;
  };

  const lanesFor = (resource: Resource): StepLanes | undefined => {
    const id = resource.data.id;
    const team = teamOf(resource);
    const lanes: StepLanes = {
      ...(domainOf.has(id) && { domain: domainOf.get(id) }),
      ...(systemOf.has(id) && { system: systemOf.get(id) }),
      ...(team && { team }),
    };
    return Object.keys(lanes).length > 0 ? lanes : undefined;
  };

  /** A system is in its own system lane (and the domain that lists it) */
  const lanesForSystem = (system: Resource): StepLanes => ({
    ...lanesFor(system),
    system: toLane(system),
  });

  return { lanesFor, lanesForSystem };
};

export type LaneIndex = ReturnType<typeof createLaneIndex>;
