import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** A temporary catalog with the given files (path -> contents), removed by the returned cleanup. */
export const createCatalog = (files: Record<string, string>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ec-fitness-'));
  for (const [file, contents] of Object.entries(files)) {
    const filePath = path.join(dir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
};

export const resource = (frontmatter: Record<string, unknown>) =>
  [
    '---',
    ...Object.entries(frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    '---',
    '',
    `# ${frontmatter.name ?? frontmatter.id}`,
    '',
  ].join('\n');

/** A fitness function file whose `run` body is `body` */
export const fitnessFunction = (definition: { id: string; name?: string; severity?: string }, body: string) => `
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: ${JSON.stringify(definition.id)},
  name: ${JSON.stringify(definition.name ?? definition.id)},
  ${definition.severity ? `severity: ${JSON.stringify(definition.severity)},` : ''}
  async run({ resource, catalog }) {
    ${body}
  },
});
`;

/** A small catalog: an Orders domain with an OrderService that sends OrderCreated, and a Payments domain */
export const BASE_CATALOG = {
  'domains/Orders/index.mdx': resource({ id: 'Orders', name: 'Orders', version: '1.0.0', services: [{ id: 'OrderService' }] }),
  'domains/Orders/services/OrderService/index.mdx': resource({
    id: 'OrderService',
    name: 'Order Service',
    version: '1.0.0',
    sends: [{ id: 'OrderCreated' }],
    owners: ['orders-team'],
  }),
  'domains/Orders/services/OrderService/versioned/0.0.1/index.mdx': resource({
    id: 'OrderService',
    name: 'Order Service',
    version: '0.0.1',
  }),
  'domains/Orders/services/OrderService/events/OrderCreated/index.mdx': resource({
    id: 'OrderCreated',
    name: 'Order Created',
    version: '1.0.0',
  }),
  'domains/Payments/index.mdx': resource({ id: 'Payments', name: 'Payments', version: '1.0.0' }),
  'systems/Checkout/index.mdx': resource({ id: 'Checkout', name: 'Checkout', version: '1.0.0' }),
  'containers/PaymentDatabase/index.mdx': resource({
    id: 'PaymentDatabase',
    name: 'Payment Database',
    version: '1.0.0',
    container_type: 'database',
  }),
  'teams/orders-team.mdx': resource({ id: 'orders-team', name: 'Orders Team' }),
};
