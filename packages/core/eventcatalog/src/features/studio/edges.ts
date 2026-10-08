import type { Connection, Edge, EdgeMarker } from '@xyflow/react';

/** Connections on a canvas, labelled with EventCatalog's wording (e.g. "publishes event", "subscribed by") */

/** Node types that are messages, and their catalog collection */
export const MESSAGE_COLLECTIONS: Record<string, string> = {
  event: 'events',
  command: 'commands',
  query: 'queries',
};

export const EDGE_COLOR = '#6b7280';
export const EDGE_MARKER: EdgeMarker = { type: 'arrowclosed', color: EDGE_COLOR, width: 18, height: 18 };

const PRODUCERS = ['service', 'agent', 'actor', 'externalSystem', 'view'];
const PRODUCER_LABELS: Record<string, string> = { commands: 'invokes', events: 'publishes \nevent', queries: 'requests' };
const MESSAGE_LABELS: Record<string, string> = { commands: 'accepts', events: 'subscribed by', queries: 'accepts' };

const getCollection = (sourceType?: string, targetType?: string) =>
  MESSAGE_COLLECTIONS[sourceType ?? ''] ?? MESSAGE_COLLECTIONS[targetType ?? ''];

export const getEdgeLabel = (sourceType = '', targetType = ''): string => {
  const sourceCollection = MESSAGE_COLLECTIONS[sourceType];
  const targetCollection = MESSAGE_COLLECTIONS[targetType];

  if (PRODUCERS.includes(sourceType) && targetCollection) return PRODUCER_LABELS[targetCollection];
  // One message leading to another (e.g. an event that causes a command)
  if (sourceCollection && targetCollection) return 'triggers';
  if (sourceCollection && targetType === 'channel') return 'sent to';
  if (sourceCollection) return MESSAGE_LABELS[sourceCollection];
  if (sourceType === 'channel') return 'routes to';
  if (targetType === 'channel') return 'publishes to';
  if (targetType === 'data') return 'writes to';
  if (sourceType === 'data') return 'read by';
  if (sourceType === 'actor') return 'uses';
  if (targetType === 'view') return 'serves';
  if (targetType === 'externalSystem') return 'calls';
  if (targetType === 'actor') return 'notifies';
  return '';
};

/** Message edges get the animated envelope edge from the visualiser, everything else a labelled smooth step edge */
export const createEdge = (connection: Connection, sourceType?: string, targetType?: string): Edge => {
  const collection = getCollection(sourceType, targetType);
  return {
    id: `edge-${crypto.randomUUID().slice(0, 8)}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? null,
    targetHandle: connection.targetHandle ?? null,
    type: collection ? 'animated' : 'smoothstep',
    label: getEdgeLabel(sourceType, targetType),
    markerEnd: EDGE_MARKER,
    data: collection ? { message: { collection } } : {},
  };
};
