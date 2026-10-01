import { describe, expect, it } from 'vitest';
import { matchesLensEdgeLabel } from '../catalog-graph-lens';

describe('catalog graph lens relationship filters', () => {
  it('keeps exact relationship labels', () => {
    expect(matchesLensEdgeLabel({ edgeLabels: ['publishes'] }, 'publishes')).toBe(true);
  });

  it('keeps dynamic shared-channel relationships by prefix', () => {
    expect(matchesLensEdgeLabel({ edgeLabelPrefixes: ['via '] }, 'via sales.order.order-create')).toBe(true);
  });

  it('rejects relationships that do not match an exact label or prefix', () => {
    expect(matchesLensEdgeLabel({ edgeLabels: ['publishes'], edgeLabelPrefixes: ['via '] }, 'contains')).toBe(false);
  });

  it('keeps all relationships when no edge filter is configured', () => {
    expect(matchesLensEdgeLabel({}, 'contains')).toBe(true);
  });
});
