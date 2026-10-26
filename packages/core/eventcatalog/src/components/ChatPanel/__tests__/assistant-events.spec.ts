import { describe, expect, it } from 'vitest';
import { canvasRefIn, nodesInFocusLink } from '../assistant-events';

describe('nodesInFocusLink', () => {
  it('reads the nodes a walkthrough step takes the person to', () => {
    expect(nodesInFocusLink('#canvas-focus=a1b2,c3d4')).toEqual(['a1b2', 'c3d4']);
    expect(nodesInFocusLink('#canvas-focus= a1b2 , ')).toEqual(['a1b2']);
    expect(nodesInFocusLink('#canvas-focus=with%20space')).toEqual(['with space']);
  });

  it('is nothing for other links', () => {
    expect(nodesInFocusLink('/docs/services/OrdersService/1.0.0')).toBeUndefined();
    expect(nodesInFocusLink('https://example.com#canvas-focus=a')).toBeUndefined();
    expect(nodesInFocusLink(undefined)).toBeUndefined();
  });
});

describe('canvasRefIn', () => {
  it('reads what a reference to something on the canvas is, and which node', () => {
    expect(canvasRefIn('#canvas-ref=service:a1b2')).toEqual({ type: 'service', nodeId: 'a1b2' });
    expect(canvasRefIn('#canvas-ref=:a1b2')).toEqual({ type: '', nodeId: 'a1b2' });
    expect(canvasRefIn('#canvas-ref=a1b2')).toEqual({ type: '', nodeId: 'a1b2' });
    expect(canvasRefIn('#canvas-ref=Event:x%20y')).toEqual({ type: 'event', nodeId: 'x y' });
  });

  it('is nothing for other links, or a reference without a node', () => {
    expect(canvasRefIn('#canvas-focus=a')).toBeUndefined();
    expect(canvasRefIn('#canvas-ref=service:')).toBeUndefined();
    expect(canvasRefIn('/docs/services/A/1.0.0')).toBeUndefined();
  });
});
