import { getCollection, getEntry } from 'astro:content';
import { generateIdForNode } from './utils/utils';
import ELK from 'elkjs/lib/elk.bundled.js';
import { MarkerType } from '@xyflow/react';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';
import { getVersionFromCollection } from '@utils/collections/versions';
import { getEntities, type Entity } from '@utils/entities';
import { getDomains, type Domain } from '@utils/collections/domains';
import { getServices, type Service } from '@utils/collections/services';

const elk = new ELK();

interface Props {
  id: string;
  version: string;
  entities?: string[]; // Optional: array of entity IDs/names to include
  type?: 'domains' | 'services';
}

export const getNodesAndEdges = async ({ id, version, entities, type = 'domains' }: Props) => {
  let nodes = [] as any,
    edges = [] as any;

  const allDomains = await getDomains();
  const allEntities = await getEntities();
  const allServices = await getServices();

  let resource = null;

  if (type === 'domains') {
    resource = getVersionFromCollection(allDomains, id, version)[0] as Domain;
  } else if (type === 'services') {
    resource = getVersionFromCollection(allServices, id, version)[0] as Service;
  }

  let resourceEntities = (resource?.data?.entities ?? []) as any;

  // If entities filter is provided, filter domainEntities to only those specified
  if (entities && Array.isArray(entities) && entities.length > 0) {
    resourceEntities = resourceEntities.filter(
      (entity: Entity) => entities.includes(entity.data.id) || entities.includes(entity.data.name)
    );
  }

  const entitiesWithReferences = resourceEntities.filter((entity: Entity) =>
    entity.data.properties?.some((property: any) => property.references)
  );
  // Creates all the entity nodes for the domain
  for (const entity of resourceEntities) {
    const nodeId = generateIdForNode(entity);
    nodes.push({
      id: nodeId,
      type: 'entities',
      position: { x: 0, y: 0 },
      data: { label: entity.data.name, entity, domainName: resource?.data.name, domainId: resource?.data.id },
    });
  }

  // Create entities that are referenced but not owned by this domain
  const listOfReferencedEntities = entitiesWithReferences
    .map((entity: Entity) => entity.data.properties?.map((property: any) => property.references))
    .flat()
    .filter((ref: any) => ref !== undefined);

  const externalToDomain = Array.from(new Set<string>(listOfReferencedEntities as string[])) // Remove duplicates
    .filter((entityId: any) => !resourceEntities.some((domainEntity: any) => domainEntity.id === entityId));

  // Helper function to find which domain an entity belongs to
  const findEntityDomain = (entityId: string) => {
    return allDomains.find((domain) => domain.data.entities?.some((domainEntity: any) => domainEntity.data.id === entityId));
  };

  const addedExternalEntities = [];
  for (const entityId of externalToDomain) {
    const externalEntity = getItemsFromCollectionByIdAndSemverOrLatest(allEntities, entityId as string, 'latest')[0] as Entity;

    if (externalEntity) {
      const nodeId = generateIdForNode(externalEntity);

      // Find which domain this entity belongs to
      const entityDomain = findEntityDomain(entityId as string);

      const domainName = entityDomain?.data.name || 'Unknown Domain';
      const domainId = entityDomain?.data.id || 'unknown';

      // Check if we haven't already added this entity
      if (!nodes.some((node: any) => node.id === nodeId)) {
        nodes.push({
          id: nodeId,
          type: 'entities',
          position: { x: 0, y: 0 },
          data: {
            label: externalEntity.data.name,
            entity: externalEntity,
            externalToDomain: true,
            domainName: domainName,
            domainId: domainId,
          },
        });
        addedExternalEntities.push(externalEntity);
      }
    } else {
      console.warn(`Entity "${entityId}" not found in catalog`);
    }
  }

  // Add external entities to the references list so edges will be created
  entitiesWithReferences.push(...addedExternalEntities);

  // Create complete list of entities for edge creation and layout
  const allEntitiesInGraph = [...resourceEntities, ...addedExternalEntities];

  // Go through any entities that are related to other entities
  for (const entity of entitiesWithReferences) {
    // Get a list of properties that reference other entities
    const allReferencesForEntity = entity.data.properties?.filter((property: any) => property.references) ?? [];

    for (const referenceProperty of allReferencesForEntity) {
      // Find the referenced entity by matching the references field with entity IDs
      // Look in both domain entities and external entities
      const referencedEntity = allEntitiesInGraph.find((targetEntity) => targetEntity.data.id === referenceProperty.references);

      if (referencedEntity) {
        const sourceNodeId = generateIdForNode(entity);
        const targetNodeId = generateIdForNode(referencedEntity);

        // Use the property name as the source handle
        const sourceHandle = `${referenceProperty.name}-source`;

        // Use referencesIdentifier if provided, otherwise use identifier or first property
        let targetHandle = '';
        if (referenceProperty.referencesIdentifier) {
          targetHandle = `${referenceProperty.referencesIdentifier}-target`;
        } else if (referencedEntity.data.identifier) {
          targetHandle = `${referencedEntity.data.identifier}-target`;
        } else if (referencedEntity.data.properties && referencedEntity.data.properties.length > 0) {
          // Default to the first property if no identifier is specified
          targetHandle = `${referencedEntity.data.properties[0].name}-target`;
        } else {
          // Skip this edge if we can't determine the target handle
          console.warn(
            `Could not determine target handle for reference from ${entity.data.name}.${referenceProperty.name} to ${referencedEntity.data.name}`
          );
          continue;
        }

        const edgeId = `${sourceNodeId}-${referenceProperty.name}-to-${targetNodeId}-${targetHandle.replace('-target', '')}`;

        edges.push({
          id: edgeId,
          source: sourceNodeId,
          sourceHandle: sourceHandle,
          target: targetNodeId,
          targetHandle: targetHandle,
          type: 'animated',
          animated: true,
          label: referenceProperty.relationType || 'references',
          style: {
            strokeWidth: 2,
            stroke: '#000', // gray color for relationship lines
            strokeDasharray: '5,5', // dashed line
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#000',
          },
        });
      } else {
        console.warn(
          `Referenced entity "${referenceProperty.references}" not found for ${entity.data.name}.${referenceProperty.name}`
        );
      }
    }
  }

  // No virtual edges - only show actual relationships between entities

  // Separate entities with and without relationships (including external entities)
  const entitiesWithRelationships = allEntitiesInGraph.filter((entity) => {
    // Has outgoing references
    const hasOutgoingRefs = entity.data.properties?.some((property: any) => property.references);
    // Has incoming references (is referenced by others)
    const hasIncomingRefs = entitiesWithReferences.some((e: any) =>
      e.data.properties?.some((prop: any) => prop.references === entity.data.id)
    );
    return hasOutgoingRefs || hasIncomingRefs;
  });

  // Prepare ELK graph structure
  const elkNodes = nodes.map((node: any) => ({
    id: node.id,
    width: 280,
    height: 200,
  }));

  const elkEdges = edges.map((edge: any) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'force',
      'elk.force.repulsivePower': '2.0',
      'elk.force.iterations': '500',
      'elk.spacing.nodeNode': '150',
      'elk.spacing.edgeNode': '75',
      'elk.spacing.edgeEdge': '30',
      'elk.padding': '[top=50,left=50,bottom=50,right=50]',
      'elk.separateConnectedComponents': 'true',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  // Run ELK layout
  const layoutedGraph = await elk.layout(elkGraph);

  // Apply positions to nodes
  const positionedNodes = nodes.map((node: any) => {
    const elkNode = layoutedGraph.children?.find((n: any) => n.id === node.id);
    return {
      ...node,
      position: {
        x: elkNode?.x || 0,
        y: elkNode?.y || 0,
      },
    };
  });

  return { nodes: positionedNodes, edges };
};
