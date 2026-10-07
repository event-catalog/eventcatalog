import type { CatalogRelation, CatalogResource } from '../catalog-resources';
import { indexCatalog } from '../canvas-actions';

/**
 * A small catalog: the Orders domain contains the Checkout system (which contains OrderService) and the Billing
 * service. OrderService publishes OrderPlaced (received by Billing and Shipping, outside the domain) and writes
 * to OrdersDb. Inventory is a system with nothing in it.
 */

const resource = (collection: string, id: string, name: string, node: CatalogResource['node']): CatalogResource => ({
  key: `${collection}:${id}`,
  collection,
  id,
  version: '1.0.0',
  name,
  summary: `${name} summary`,
  url: `/docs/${collection}/${id}/1.0.0`,
  node,
});

const basics = (id: string, name: string) => ({ id, version: '1.0.0', name, summary: `${name} summary` });

export const resources: CatalogResource[] = [
  resource('domains', 'Orders', 'Orders', {
    type: 'context-domain',
    data: { mode: 'full', domain: basics('Orders', 'Orders') },
  }),
  resource('systems', 'Checkout', 'Checkout', {
    type: 'system',
    data: { mode: 'full', system: basics('Checkout', 'Checkout') },
  }),
  resource('systems', 'Inventory', 'Inventory', {
    type: 'system',
    data: { mode: 'full', system: basics('Inventory', 'Inventory') },
  }),
  ...[
    ['OrderService', 'Order Service'],
    ['Billing', 'Billing Service'],
    ['Shipping', 'Shipping Service'],
  ].map(([id, name]) => resource('services', id, name, { type: 'service', data: { mode: 'full', service: basics(id, name) } })),
  resource('events', 'OrderPlaced', 'Order Placed', {
    type: 'event',
    data: { mode: 'full', message: basics('OrderPlaced', 'Order Placed') },
  }),
  resource('containers', 'OrdersDb', 'Orders DB', {
    type: 'data',
    data: { mode: 'full', data: { ...basics('OrdersDb', 'Orders DB'), container_type: 'database' } },
  }),
];

export const relations: CatalogRelation[] = [
  { source: 'domains:Orders', target: 'systems:Checkout', label: 'contains' },
  { source: 'domains:Orders', target: 'services:Billing', label: 'contains' },
  { source: 'systems:Checkout', target: 'services:OrderService', label: 'contains' },
  { source: 'services:OrderService', target: 'events:OrderPlaced' },
  { source: 'events:OrderPlaced', target: 'services:Billing' },
  { source: 'events:OrderPlaced', target: 'services:Shipping' },
  { source: 'services:OrderService', target: 'containers:OrdersDb' },
];

export const catalog = indexCatalog(resources, relations);

export const resourceByKey = (key: string) => {
  const found = catalog.resourcesByKey.get(key);
  if (!found) throw new Error(`No ${key} in the test catalog`);
  return found;
};
