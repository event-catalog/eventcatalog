import type { CollectionKey } from 'astro:content';
import { expect, describe, it, vi } from 'vitest';
import { getNodesAndEdges, rehomeServicesInOtherSystems } from '@utils/node-graphs/system-levels-node-graph';
import { getNodesAndEdges as getSystemNodesAndEdges } from '@utils/node-graphs/systems-node-graph';

const entry = (collection: string, id: string, data: Record<string, any> = {}) => ({
  id: `${collection}/${id}`,
  collection,
  data: { id, name: id, version: '1.0.0', ...data },
});

// System A sends DoThing. Several services receive it, owned in different ways:
// - b-api (latest 2.0.0) and extra-b belong to system B, which A relates to
// - dual-api belongs to system B and system D; A relates to D first, then B
// - alpha-api belongs to system M and system P, reached only through system Z
// - c-api belongs to system C, which is not on A's diagram
// - orphan-api belongs to no system
// - shared-api (^1.0.0 -> 1.2.0) belongs to A and to B
const aApi = entry('services', 'a-api', { sends: [{ id: 'DoThing', version: '1.0.0' }] });
const bApi1 = entry('services', 'b-api', { version: '1.0.0', receives: [{ id: 'DoThing', version: '1.0.0' }] });
const bApi2 = entry('services', 'b-api', { version: '2.0.0', receives: [{ id: 'DoThing', version: '1.0.0' }] });
const extraB = entry('services', 'extra-b', { receives: [{ id: 'DoThing', version: '1.0.0' }] });
const cApi = entry('services', 'c-api', { receives: [{ id: 'DoThing', version: '1.0.0' }] });
const orphanApi = entry('services', 'orphan-api', { receives: [{ id: 'DoThing', version: '1.0.0' }] });
const shared10 = entry('services', 'shared-api', { version: '1.0.0', receives: [{ id: 'DoThing', version: '1.0.0' }] });
const shared12 = entry('services', 'shared-api', { version: '1.2.0', receives: [{ id: 'DoThing', version: '1.0.0' }] });
const dualApi = entry('services', 'dual-api', { version: '1.5.0', receives: [{ id: 'DoThing', version: '1.0.0' }] });
const alphaApi = entry('services', 'alpha-api', { receives: [{ id: 'DoThing', version: '1.0.0' }] });

const systemA = entry('systems', 'system-a', {
  name: 'System A',
  services: [
    { id: 'a-api', version: '1.0.0' },
    { id: 'shared-api', version: '^1.0.0' },
  ],
  relationships: [
    { id: 'system-d', version: '^1.0.0', label: 'talks to' },
    { id: 'system-b', version: 'latest', label: 'uses' },
    { id: 'system-z', label: 'reaches' },
  ],
});
const systemB = entry('systems', 'system-b', {
  name: 'System B',
  services: [
    { id: 'b-api', version: 'latest' },
    { id: 'extra-b', version: '1.0.0' },
    { id: 'shared-api', version: '1.2.0' },
    { id: 'dual-api', version: 'latest' },
  ],
  relationships: [{ id: 'system-m', label: 'mentions' }],
});
const systemC = entry('systems', 'system-c', {
  name: 'System C',
  services: [{ id: 'c-api', version: '1.0.0' }],
});
const systemD = entry('systems', 'system-d', {
  name: 'System D',
  services: [{ id: 'dual-api', version: '^1.0.0' }],
});
const systemM = entry('systems', 'system-m', {
  name: 'System M',
  services: [{ id: 'alpha-api', version: '1.0.0' }],
});
const systemP = entry('systems', 'system-p', {
  name: 'System P',
  services: [{ id: 'alpha-api', version: 'latest' }],
});
const systemZ = entry('systems', 'system-z', {
  name: 'System Z',
  relationships: [
    { id: 'system-m', label: 'to m' },
    { id: 'system-p', label: 'to p' },
  ],
});
// Same service as system A, and no relationships, so nothing else is pulled onto its diagram
const systemAPlain = entry('systems', 'system-a-plain', {
  name: 'System A Plain',
  services: [{ id: 'a-api', version: '1.0.0' }],
});

const systems = [systemA, systemB, systemC, systemD, systemM, systemP, systemZ, systemAPlain];
const services = [aApi, bApi1, bApi2, extraB, cApi, orphanApi, shared10, shared12, dualApi, alphaApi];
const commands = [entry('commands', 'DoThing', { name: 'DoThing' })];

vi.mock('astro:content', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('astro:content')>()),
    getCollection: (key: CollectionKey) => {
      switch (key) {
        case 'systems':
          return Promise.resolve(systems);
        case 'services':
          return Promise.resolve(services);
        case 'commands':
          return Promise.resolve(commands);
        default:
          return Promise.resolve([]);
      }
    },
  };
});

const groupId = (id: string) => `system-group-${id}-1.0.0`;
const node = (nodes: any[], id: string) => nodes.find((item) => item.id === id);
const between = (edges: any[], source: string, target: string) =>
  edges.filter((edge) => edge.source === source && edge.target === target);

describe('System diagram ownership', () => {
  it('draws another system once when its services exchange messages with this one', async () => {
    const { nodes, edges, hiddenMessages } = await getNodesAndEdges({ id: 'system-a', version: '1.0.0' });
    const group = groupId('system-a');

    expect(node(nodes, 'a-api-1.0.0')?.parentId).toBe(group);
    // ^1.0.0 resolves to 1.2.0, and membership wins even though system B lists it too
    expect(node(nodes, 'shared-api-1.2.0')?.parentId).toBe(group);
    expect(node(nodes, 'shared-api-1.0.0')).toBeUndefined();

    // latest on system B is 2.0.0, so that service is the system box, not a second copy inside A
    expect(node(nodes, 'b-api-2.0.0')).toBeUndefined();
    expect(node(nodes, 'b-api-1.0.0')).toBeUndefined();
    expect(node(nodes, 'extra-b-1.0.0')).toBeUndefined();
    expect(nodes.filter((item) => item.id === 'system-b-1.0.0')).toHaveLength(1);
    expect(node(nodes, 'system-b-1.0.0')?.parentId).toBeUndefined();

    // The message stays in the group and reaches system B once, though two of its services receive it
    expect(node(nodes, 'DoThing-1.0.0')?.parentId).toBe(group);
    expect(between(edges, 'DoThing-1.0.0', 'system-b-1.0.0')).toHaveLength(1);
    expect(between(edges, group, 'system-b-1.0.0')[0]).toMatchObject({ label: 'uses' });

    // Level 2 bridges the service to the system, and keeps the relationship beside it
    expect(node(hiddenMessages.nodes, 'DoThing-1.0.0')).toBeUndefined();
    expect(node(hiddenMessages.nodes, 'b-api-2.0.0')).toBeUndefined();
    expect(between(hiddenMessages.edges, 'a-api-1.0.0', 'system-b-1.0.0').length).toBeGreaterThan(0);
    expect(between(hiddenMessages.edges, group, 'system-b-1.0.0')).toHaveLength(1);
  });

  it('sends a service listed by two other systems to the first related system, or the lowest id', async () => {
    const { nodes, edges } = await getNodesAndEdges({ id: 'system-a', version: '1.0.0' });

    // system D is the first relationship that owns dual-api; the ^1.0.0 pointer resolves to 1.0.0
    expect(node(nodes, 'dual-api-1.5.0')).toBeUndefined();
    expect(between(edges, 'DoThing-1.0.0', 'system-d-1.0.0')).toHaveLength(1);
    expect(between(edges, 'DoThing-1.0.0', 'system-b-1.0.0')).toHaveLength(1);

    // system M and system P are only reached through system Z, so the lower id wins
    expect(node(nodes, 'alpha-api-1.0.0')).toBeUndefined();
    expect(between(edges, 'DoThing-1.0.0', 'system-m-1.0.0')).toHaveLength(1);
    expect(between(edges, 'DoThing-1.0.0', 'system-p-1.0.0')).toHaveLength(0);
  });

  it('draws services from an unrelated system, and services in no system, outside the group', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'system-a', version: '1.0.0' });
    const group = groupId('system-a');

    expect(node(nodes, 'c-api-1.0.0')).toMatchObject({ type: 'services' });
    expect(node(nodes, 'c-api-1.0.0')?.parentId).toBeUndefined();
    expect(node(nodes, 'system-c-1.0.0')).toBeUndefined();

    expect(node(nodes, 'orphan-api-1.0.0')?.parentId).toBeUndefined();
    expect(node(nodes, 'c-api-1.0.0')?.parentId).not.toBe(group);
  });

  it('keeps a shared service in the group of the system being viewed', async () => {
    const { nodes } = await getNodesAndEdges({ id: 'system-b', version: '1.0.0' });
    const group = groupId('system-b');

    expect(node(nodes, 'b-api-2.0.0')?.parentId).toBe(group);
    expect(node(nodes, 'shared-api-1.2.0')?.parentId).toBe(group);
    expect(node(nodes, 'dual-api-1.5.0')?.parentId).toBe(group);
    // a-api belongs to system A, which is on this diagram because A relates to B
    expect(node(nodes, 'a-api-1.0.0')).toBeUndefined();
    expect(node(nodes, 'system-a-1.0.0')?.parentId).toBeUndefined();
    expect(nodes.filter((item) => item.id === 'system-a-1.0.0')).toHaveLength(1);
  });

  it('leaves a service outside the group when its system is not already on the diagram', async () => {
    const { nodes, edges } = await getNodesAndEdges({ id: 'system-a-plain', version: '1.0.0' });
    const group = groupId('system-a-plain');

    expect(node(nodes, 'a-api-1.0.0')?.parentId).toBe(group);
    expect(node(nodes, 'b-api-2.0.0')?.parentId).toBeUndefined();
    expect(node(nodes, 'c-api-1.0.0')?.parentId).toBeUndefined();
    expect(node(nodes, 'orphan-api-1.0.0')?.parentId).toBeUndefined();
    expect(node(nodes, 'system-b-1.0.0')).toBeUndefined();
    expect(node(nodes, 'system-c-1.0.0')).toBeUndefined();
    expect(between(edges, 'DoThing-1.0.0', 'b-api-2.0.0')).toHaveLength(1);
  });

  it('does not parent other systems services in the standalone system diagram, and still does when a domain asks for the whole graph', async () => {
    const confined = await getSystemNodesAndEdges({
      id: 'system-a',
      version: '1.0.0',
      wrapInSystemGroup: true,
      confineToMembers: true,
      layout: false,
    });
    const group = groupId('system-a');

    expect(node(confined.nodes, 'a-api-1.0.0')?.parentId).toBe(group);
    expect(node(confined.nodes, 'DoThing-1.0.0')?.parentId).toBe(group);
    expect(node(confined.nodes, 'b-api-2.0.0')?.parentId).toBeUndefined();
    expect(node(confined.nodes, 'orphan-api-1.0.0')?.parentId).toBeUndefined();

    const wrapped = await getSystemNodesAndEdges({
      id: 'system-a',
      version: '1.0.0',
      wrapInSystemGroup: true,
      layout: false,
    });
    expect(node(wrapped.nodes, 'b-api-2.0.0')?.parentId).toBe(group);
  });

  it('drops an edge that lands on the same pair as a relationship, and keeps one that does not', () => {
    const group = groupId('system-a');
    const localB = entry('systems', 'system-b', {
      services: [
        { id: 'b-api', version: '1.0.0' },
        { id: 'extra-b', version: '1.0.0' },
      ],
    });
    const localD = entry('systems', 'system-d', { services: [{ id: 'd-api', version: '1.0.0' }] });
    const { nodes, edges } = rehomeServicesInOtherSystems({
      nodes: [
        { id: group, type: 'system-group' },
        { id: 'a-api-1.0.0', type: 'services', parentId: group, extent: 'parent' },
        { id: 'b-api-1.0.0', type: 'services', parentId: group, extent: 'parent' },
        { id: 'extra-b-1.0.0', type: 'services', parentId: group, extent: 'parent' },
        { id: 'd-api-1.0.0', type: 'services', parentId: group, extent: 'parent' },
        { id: 'DoThing-1.0.0', type: 'commands', parentId: group, extent: 'parent' },
      ],
      edges: [
        { id: 'a-to-b', source: 'a-api-1.0.0', target: 'b-api-1.0.0', label: 'invokes' },
        { id: 'b-to-d', source: 'b-api-1.0.0', target: 'd-api-1.0.0', label: 'invokes' },
        { id: 'msg-1', source: 'DoThing-1.0.0', target: 'b-api-1.0.0', label: 'accepts' },
        { id: 'msg-2', source: 'DoThing-1.0.0', target: 'extra-b-1.0.0', label: 'accepts' },
      ],
      groupId: group,
      focusedSystem: entry('systems', 'system-a', { services: [{ id: 'a-api', version: '1.0.0' }] }),
      allSystems: [entry('systems', 'system-a', { services: [{ id: 'a-api', version: '1.0.0' }] }), localB, localD],
      allServices: [aApi, entry('services', 'b-api'), entry('services', 'extra-b'), entry('services', 'd-api')],
      contextSystemIds: new Set(['system-b-1.0.0', 'system-d-1.0.0']),
      relationshipPairs: new Set([
        `${group}->system-b-1.0.0`,
        `system-b-1.0.0->${group}`,
        'system-b-1.0.0->system-d-1.0.0',
        'system-d-1.0.0->system-b-1.0.0',
      ]),
    });

    expect(nodes.map((item) => item.id).sort()).toEqual(['DoThing-1.0.0', 'a-api-1.0.0', group].sort());
    // The group already has a relationship to system B, but this edge starts at the service
    expect(edges.find((edge) => edge.id === 'a-to-b')).toMatchObject({ source: 'a-api-1.0.0', target: 'system-b-1.0.0' });
    // system B already relates to system D, so the redirected edge is not drawn again
    expect(edges.find((edge) => edge.id === 'b-to-d')).toBeUndefined();
    // Two consumers in system B become one edge
    expect(between(edges, 'DoThing-1.0.0', 'system-b-1.0.0')).toHaveLength(1);
  });
});
