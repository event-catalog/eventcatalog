import { getCollection } from 'astro:content';
import { getEntities, type Entity } from '@utils/collections/entities';
import { createVersionedMap, satisfies } from '@utils/collections/util';
import { generateIdForNode } from './utils/utils';
import { createLaneIndex, isLatest, toLane, type Lane, type StepLanes } from './flow-lanes';
import {
  ENTITY_TARGET_HANDLE_ID,
  createEntityReferenceEdges,
  getReferencedEntityId,
  getReferencePropertyNames,
} from './domain-entity-map';
import { layoutEntityNodes } from './entity-layout';

/** The domain lane of an entity more than one domain has: grouped by domain, it gets a box of its own */
export const SHARED_DOMAIN_LANE: Lane = { id: '__shared', name: 'Shared across domains' };

/**
 * Whether a domain, system or service lists this version of the entity (the latest, which the map shows):
 * a pointer without a version, or to `latest`, or one whose version or range it satisfies. A resource that
 * pins an older version doesn't own the latest one (as `getEntities` matches them)
 */
const listsEntity = (resource: { data: { entities?: { id: string; version?: string }[] } }, entity: Entity) =>
  (resource.data.entities || []).some((pointer) => {
    if (pointer.id !== entity.data.id) return false;
    if (!pointer.version || pointer.version === 'latest') return true;
    return satisfies(entity.data.version, pointer.version);
  });
const uniqueLanes = (lanes: (Lane | undefined)[]) => [
  ...new Map(lanes.filter((lane): lane is Lane => !!lane).map((lane) => [lane.id, lane])).values(),
];

/**
 * Every entity in the catalog (latest versions) and the references between them, across domains.
 *
 * Entities can be listed by domains, systems and services, so each node says which domain, system and
 * team it belongs to (`data.lanes`), for the visualiser to group them by:
 * - domain: the domain that lists it, or the domain of the system or service that does. An entity more
 *   than one domain has is in the "Shared across domains" lane.
 * - system: the system that lists it, or the system of the service that does
 * - team: the entity's owner, or else the owner of what lists it
 *
 * Entities nothing lists have no lanes (`{}`): they stay out of every group rather than taking a
 * neighbour's.
 */
export const getNodesAndEdges = async () => {
  const [entities, allEntities, domains, systems, services, teams, users] = await Promise.all([
    getEntities({ getAllVersions: false }),
    getCollection('entities'),
    getCollection('domains'),
    getCollection('systems'),
    getCollection('services'),
    getCollection('teams'),
    getCollection('users'),
  ]);
  const entityMap = createVersionedMap(allEntities as Entity[]);
  const laneIndex = createLaneIndex({ domains, systems, teams, users });
  const latestDomains = domains.filter(isLatest);
  const latestSystems = systems.filter(isLatest);
  const latestServices = services.filter(isLatest);

  const lanesForEntity = (entity: Entity): StepLanes => {
    const owningDomains = latestDomains.filter((domain) => listsEntity(domain, entity));
    const owningSystems = latestSystems.filter((system) => listsEntity(system, entity));
    const owningServices = latestServices.filter((service) => listsEntity(service, entity));

    const ownerLanes = [
      ...owningSystems.map((system) => laneIndex.lanesForSystem(system as any)),
      ...owningServices.map((service) => laneIndex.lanesFor(service as any)),
    ];
    // A domain listing the entity itself wins over the domains of its systems and services
    const domainLanes = owningDomains.length
      ? uniqueLanes(owningDomains.map(toLane))
      : uniqueLanes(ownerLanes.map((lanes) => lanes?.domain));
    const domain = domainLanes.length > 1 ? SHARED_DOMAIN_LANE : domainLanes[0];
    const system = uniqueLanes(ownerLanes.map((lanes) => lanes?.system))[0];
    const team =
      laneIndex.lanesFor(entity as any)?.team ??
      [...owningDomains, ...owningSystems, ...owningServices]
        .map((owner) => laneIndex.lanesFor(owner as any)?.team)
        .find(Boolean);

    return {
      ...(domain && { domain }),
      ...(system && { system }),
      ...(team && { team }),
    };
  };

  const nodes = entities.map((entity) => {
    const lanes = lanesForEntity(entity);
    const domain = lanes.domain && lanes.domain.id !== SHARED_DOMAIN_LANE.id ? lanes.domain : undefined;
    return {
      id: generateIdForNode(entity),
      type: 'entities',
      position: { x: 0, y: 0 },
      data: {
        label: entity.data.name,
        entity,
        ...(domain && { domainName: domain.name, domainId: domain.id }),
        entityTargetHandle: ENTITY_TARGET_HANDLE_ID,
        referencePropertyNames: getReferencePropertyNames(entity, entityMap),
        lanes,
      },
    };
  });

  const entitiesWithReferences = entities.filter((entity) =>
    entity.data.properties?.some((property: any) => getReferencedEntityId(property, entityMap))
  );
  const edges = createEntityReferenceEdges(entitiesWithReferences, entities, entityMap);

  return { nodes: await layoutEntityNodes(nodes, edges), edges };
};
