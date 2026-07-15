import type { Event } from '../types';

const event: Event = {
  id: 'OrderPlaced',
  name: 'Order Placed',
  version: '1.0.0',
  markdown: '',
  'x-operational-tier': 1,
  'x-scrum-masters': ['David', 'Andrew'],
  'x-on-call': {
    schedule: 'orders-primary',
  },
};

const extensionValue: unknown = event['x-operational-tier'];

const eventWithInvalidProperty: Event = {
  id: 'OrderPlaced',
  name: 'Order Placed',
  version: '1.0.0',
  markdown: '',
  // @ts-expect-error Custom properties must use the x-* namespace.
  operationalTier: 1,
};

void extensionValue;
void eventWithInvalidProperty;
