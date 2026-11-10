import { describe, expect, it } from 'vitest';
import type { Edge, Node } from '@xyflow/react';
import { NO_DOMAIN, getCrossDomainEdges, getDomainSummaries, getShownGraph } from '../../node-graphs/catalog-entity-map-view';

const SHARED = '__shared';

const entity = (id: string, domain?: string): Node => ({
  id,
  type: 'entities',
  position: { x: 0, y: 0 },
  data: { lanes: domain ? { domain: { id: domain, name: domain } } : {} },
});
const reference = (source: string, target: string): Edge => ({ id: `${source}->${target}`, source, target });

const nodes = [
  entity('order', 'ordering'),
  entity('order-line', 'ordering'),
  entity('payment', 'payments'),
  entity('currency', SHARED),
  entity('orphan'),
];
const edges = [
  reference('order-line', 'order'),
  reference('payment', 'order'),
  reference('payment', 'currency'),
  reference('orphan', 'order'),
];

describe('catalog entity map view', () => {
  describe('getCrossDomainEdges', () => {
    it('keeps references between entities in different domains', () => {
      const ids = getCrossDomainEdges(nodes, edges, SHARED).map((edge) => edge.id);

      expect(ids).toContain('payment->order');
      expect(ids).not.toContain('order-line->order');
    });

    it('counts a reference to a shared entity as across domains', () => {
      expect(getCrossDomainEdges(nodes, edges, SHARED).map((edge) => edge.id)).toContain('payment->currency');
    });

    it('does not count a reference from an entity with no domain as across domains', () => {
      expect(getCrossDomainEdges(nodes, edges, SHARED).map((edge) => edge.id)).not.toContain('orphan->order');
    });
  });

  describe('getDomainSummaries', () => {
    it('counts entities and references across domains for each domain, with shared and no domain last', () => {
      const summaries = getDomainSummaries(nodes, getCrossDomainEdges(nodes, edges, SHARED), SHARED);

      expect(summaries.map(({ lane, count, crossDomain }) => [lane.id, count, crossDomain])).toEqual([
        ['ordering', 2, 1],
        ['payments', 1, 2],
        [SHARED, 1, 1],
        [NO_DOMAIN.id, 1, 0],
      ]);
    });
  });

  describe('getShownGraph', () => {
    const crossDomainEdges = getCrossDomainEdges(nodes, edges, SHARED);

    it('shows everything when nothing is filtered out', () => {
      const shown = getShownGraph({ nodes, edges, crossDomainEdges, hidden: new Set(), crossDomainOnly: false });

      expect(shown.isEverything).toBe(true);
      expect(shown.nodes).toHaveLength(nodes.length);
    });

    it('leaves out the entities of hidden domains and their references', () => {
      const shown = getShownGraph({ nodes, edges, crossDomainEdges, hidden: new Set(['payments']), crossDomainOnly: false });

      expect(shown.isEverything).toBe(false);
      expect(shown.nodes.map((node) => node.id)).not.toContain('payment');
      expect(shown.edges.map((edge) => edge.id)).toEqual(['order-line->order', 'orphan->order']);
    });

    it('shows only entities at an end of a reference across domains, and only those references, when asked', () => {
      const shown = getShownGraph({ nodes, edges, crossDomainEdges, hidden: new Set(), crossDomainOnly: true });

      expect(shown.nodes.map((node) => node.id).sort()).toEqual(['currency', 'order', 'payment']);
      expect(shown.edges.map((edge) => edge.id).sort()).toEqual(['payment->currency', 'payment->order']);
    });
  });
});
