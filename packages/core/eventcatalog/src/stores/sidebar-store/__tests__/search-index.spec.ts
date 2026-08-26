import { describe, expect, it } from 'vitest';
import { getSearchIndexNodeEntries } from '../search-index';
import type { NavigationData } from '../state';

describe('getSearchIndexNodeEntries', () => {
  it('keeps only current message targets while preserving other versioned resources', () => {
    const nodes: NavigationData['nodes'] = {
      'event:PaymentProcessed': 'event:PaymentProcessed:3.1.0',
      'event:PaymentProcessed:2.18.0': { type: 'item', title: 'Payment Processed' },
      'event:PaymentProcessed:3.1.0': { type: 'item', title: 'Payment Processed' },
      'service:PaymentService:1.0.0': { type: 'item', title: 'Payment Service' },
    };

    expect(getSearchIndexNodeEntries(nodes).map(([key]) => key)).toEqual([
      'event:PaymentProcessed:3.1.0',
      'service:PaymentService:1.0.0',
    ]);
  });
});
