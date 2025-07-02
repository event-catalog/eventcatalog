import { getCollection, getEntry } from 'astro:content';
import { createDagreGraph, calculatedNodes, generateIdForNode } from './utils/utils';
import dagre from 'dagre';
import { MarkerType } from '@xyflow/react';
import { getItemsFromCollectionByIdAndSemverOrLatest } from '@utils/collections/util';

type DagreGraph = any;

interface Props {
  id: string;
  version: string;
  defaultFlow?: DagreGraph;
}

export const getNodesAndEdges = async ({ id, version, defaultFlow = null }: Props) => {
  // Horizontal spread configuration for better distribution
  const flow =
    defaultFlow ??
    createDagreGraph({
      rankdir: 'LR', // Left to right for more horizontal spread
      ranksep: 350, // Horizontal spacing between ranks (increased)
      nodesep: 150, // Vertical spacing between nodes (increased)
      edgesep: 25, // Spacing between edges (increased)
      marginx: 50, // Margin around graph (increased)
      marginy: 50, // Margin around graph (increased)
      acyclicer: 'greedy', // Handle cycles better
      ranker: 'network-simplex', // Use network-simplex for better distribution
    });

  let nodes = [] as any,
    edges = [] as any;

  const allDomains = await getCollection('domains');
  const allEntities = await getCollection('entities');
  const domain = await getEntry('domains', `${id}-${version}`);
  const domainEntities = domain?.data.entities ?? [];

  // Get all the entities (Latest versions);
  const entities = allEntities.filter((entity) => !entity.id.includes('/versioned'));

  const entitiesForDomain = domainEntities
    .map((domainEntity) => getItemsFromCollectionByIdAndSemverOrLatest(entities, domainEntity.id, domainEntity.version))
    .flat();

  const entitiesWithReferences = entitiesForDomain.filter((entity) =>
    entity.data.properties?.some((property: any) => {
      return !!property.references;
    })
  );

  // Creates all the entity nodes for the domain
  for (const entity of entitiesForDomain) {
    const nodeId = generateIdForNode(entity);
    nodes.push({
      id: nodeId,
      type: 'entities',
      position: { x: 0, y: 0 },
      data: { label: entity.data.name, entity, domainName: domain?.data.name, domainId: domain?.data.id },
    });
  }

  // Create entities that are referenced but not owned by this domain
  const listOfReferencedEntities = entitiesWithReferences
    .map((entity) => entity.data.properties?.map((property: any) => property.references))
    .flat()
    .filter((ref) => ref !== undefined);

  const externalToDomain = [...new Set(listOfReferencedEntities)] // Remove duplicates
    .filter((entityId) => !domainEntities.some((domainEntity) => domainEntity.id === entityId));

  console.log('External entities to add:', externalToDomain);

  // Helper function to find which domain an entity belongs to
  const findEntityDomain = (entityId: string) => {
    return allDomains.find((domain) => domain.data.entities?.some((domainEntity: any) => domainEntity.id === entityId));
  };

  const addedExternalEntities = [];
  for (const entityId of externalToDomain) {
    const externalEntity = getItemsFromCollectionByIdAndSemverOrLatest(entities, entityId, 'latest')[0];

    if (externalEntity) {
      const nodeId = generateIdForNode(externalEntity);

      // Find which domain this entity belongs to
      const entityDomain = findEntityDomain(entityId);
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
      console.warn(`External entity "${entityId}" not found in catalog`);
    }
  }

  // Add external entities to the references list so edges will be created
  entitiesWithReferences.push(...addedExternalEntities);

  // Create complete list of entities for edge creation and layout
  const allEntitiesInGraph = [...entitiesForDomain, ...addedExternalEntities];

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
            stroke: '#6366f1', // indigo color for relationship lines
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#6366f1',
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
    const hasIncomingRefs = entitiesWithReferences.some((e) =>
      e.data.properties?.some((prop: any) => prop.references === entity.data.id)
    );
    return hasOutgoingRefs || hasIncomingRefs;
  });

  const entitiesWithoutRelationships = allEntitiesInGraph.filter((entity) => !entitiesWithRelationships.includes(entity));

  // Set node dimensions with better spacing consideration
  nodes.forEach((node: any) => {
    flow.setNode(node.id, { width: 280, height: 200 }); // Larger nodes to prevent overlap
  });

  edges.forEach((edge: any) => {
    flow.setEdge(edge.source, edge.target);
  });

  // Run dagre layout for connected entities
  dagre.layout(flow);

  // Get the positioned nodes from dagre
  let positionedNodes = calculatedNodes(flow, nodes);

  // Manually position isolated entities in a grid
  if (entitiesWithoutRelationships.length > 0) {
    // Find the rightmost position of connected entities to avoid overlap
    const connectedNodes = positionedNodes.filter((node) =>
      entitiesWithRelationships.some((entity) => generateIdForNode(entity) === node.id)
    );

    const maxX =
      connectedNodes.length > 0
        ? Math.max(...connectedNodes.map((node) => node.position.x)) + 500 // Increased padding
        : 0;

    // Create grid for isolated entities - prefer fewer rows for better horizontal spread
    const gridCols = Math.min(3, entitiesWithoutRelationships.length); // Max 3 columns
    const gridRows = Math.ceil(entitiesWithoutRelationships.length / gridCols);

    const nodeWidth = 280;
    const nodeHeight = 200;
    const spacingX = 400; // Increased horizontal spacing
    const spacingY = 350; // Significantly increased vertical spacing

    entitiesWithoutRelationships.forEach((entity, index) => {
      const row = Math.floor(index / gridCols);
      const col = index % gridCols;

      const nodeId = generateIdForNode(entity);
      const nodeIndex = positionedNodes.findIndex((node) => node.id === nodeId);

      if (nodeIndex !== -1) {
        const newX = maxX + col * spacingX;
        const newY = row * spacingY;

        positionedNodes[nodeIndex].position = {
          x: newX,
          y: newY,
        };
      }
    });
  }

  return { nodes: positionedNodes, edges };
};
