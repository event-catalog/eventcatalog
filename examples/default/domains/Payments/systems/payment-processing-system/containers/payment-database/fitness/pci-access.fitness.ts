// Data store rule: only services in the Payments domain may read from or write to the Payment Database (PCI scope).
//
// This file lives in the payment-database folder, so `resource` is the Payment Database (a container).
import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getServiceIdsInDomain } from '../../../../../../../fitness/helpers/catalog';

export default defineFitnessFunction({
  id: 'payment-database-pci-access',
  name: 'Only Payments services can access card data',
  description: 'Keeps the Payment Database inside the PCI boundary: the Payments domain.',

  async run({ resource, catalog }) {
    if (resource?.type !== 'container') throw new Error('Expected to run alongside a data store');

    const paymentsServices = await getServiceIdsInDomain(catalog, 'payments');
    const services = (await catalog.getServices({ latestOnly: true })) ?? [];

    return services
      .filter((service) =>
        [...(service.readsFrom ?? []), ...(service.writesTo ?? [])].some((pointer) => pointer.id === resource.id)
      )
      .filter((service) => !paymentsServices.has(service.id))
      .map((service) => ({
        message: `${service.name} accesses ${resource.name} but is not in the Payments domain`,
        resources: [
          { type: 'service', id: service.id, version: service.version },
          { type: 'container', id: resource.id, version: resource.version },
        ],
        suggestion: 'Call the Payment API instead of reading the database directly.',
      }));
  },
});
