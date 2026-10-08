import { describe, it, expect } from 'vitest';
import { EDGE_MARKER, createEdge, getEdgeLabel } from '../edges';

describe('getEdgeLabel', () => {
  it.each([
    ['service', 'event', 'publishes \nevent'],
    ['service', 'command', 'invokes'],
    ['agent', 'query', 'requests'],
    ['actor', 'command', 'invokes'],
    ['event', 'channel', 'sent to'],
    ['event', 'command', 'triggers'],
    ['command', 'event', 'triggers'],
    ['event', 'event', 'triggers'],
    ['event', 'service', 'subscribed by'],
    ['command', 'service', 'accepts'],
    ['query', 'service', 'accepts'],
    ['channel', 'service', 'routes to'],
    ['service', 'channel', 'publishes to'],
    ['service', 'data', 'writes to'],
    ['data', 'service', 'read by'],
    ['actor', 'service', 'uses'],
    ['service', 'view', 'serves'],
    ['service', 'externalSystem', 'calls'],
    ['service', 'actor', 'notifies'],
    ['service', 'service', ''],
  ])('%s → %s is labelled "%s"', (source, target, label) => {
    expect(getEdgeLabel(source, target)).toBe(label);
  });

  it('has no label without types', () => {
    expect(getEdgeLabel()).toBe('');
  });
});

describe('createEdge', () => {
  const connection = { source: 'a', target: 'b', sourceHandle: null, targetHandle: null };

  it('makes message edges animated, with the message collection', () => {
    const edge = createEdge(connection, 'service', 'event');
    expect(edge).toMatchObject({
      source: 'a',
      target: 'b',
      sourceHandle: null,
      targetHandle: null,
      type: 'animated',
      label: 'publishes \nevent',
      markerEnd: EDGE_MARKER,
      data: { message: { collection: 'events' } },
    });
    expect(edge.id).toMatch(/^edge-[0-9a-f]{8}$/);
  });

  it('takes the collection from the source when it is the message', () => {
    expect(createEdge(connection, 'command', 'service')).toMatchObject({
      type: 'animated',
      label: 'accepts',
      data: { message: { collection: 'commands' } },
    });
  });

  it('makes other edges smooth step edges without message data', () => {
    expect(createEdge(connection, 'service', 'data')).toMatchObject({
      type: 'smoothstep',
      label: 'writes to',
      data: {},
    });
  });

  it('keeps the handles it was given', () => {
    const edge = createEdge({ ...connection, sourceHandle: 'right', targetHandle: 'left' }, 'service', 'service');
    expect(edge).toMatchObject({ sourceHandle: 'right', targetHandle: 'left' });
  });

  it('gives every edge a new id', () => {
    expect(createEdge(connection).id).not.toBe(createEdge(connection).id);
  });
});
