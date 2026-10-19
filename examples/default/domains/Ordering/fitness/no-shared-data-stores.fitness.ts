// Domain rule: Ordering's services may only read from and write to data stores that belong to Ordering.
// Reaching into another domain's database couples the domains together; use its events or APIs instead.
//
// This file lives in domains/Ordering/fitness/, so `resource` is the Ordering domain.
import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getDataStoreIdsInDomain, getServiceIdsInDomain } from '../../../fitness/helpers/catalog';

export default defineFitnessFunction({
  id: 'ordering-no-shared-data-stores',
  name: 'Services only use their own domain’s data stores',

  async run({ resource, catalog }) {
    if (resource?.type !== 'domain') throw new Error('Expected to run alongside a domain');

    const serviceIds = await getServiceIdsInDomain(catalog, resource.id);
    const ownDataStores = await getDataStoreIdsInDomain(catalog, resource.id);

    const violations = [];
    for (const serviceId of serviceIds) {
      const service = await catalog.getService(serviceId);
      if (!service) continue;

      const used = [
        ...(service.writesTo ?? []).map((pointer) => ({ ...pointer, access: 'writes to' })),
        ...(service.readsFrom ?? []).map((pointer) => ({ ...pointer, access: 'reads from' })),
      ];

      for (const dataStore of used.filter((pointer) => !ownDataStores.has(pointer.id))) {
        violations.push({
          message: `${service.name} ${dataStore.access} ${dataStore.id}, which is outside the ${resource.name} domain`,
          resources: [
            { type: 'service', id: service.id, version: service.version },
            { type: 'dataStore', id: dataStore.id },
          ],
          suggestion: `Get the data from the domain that owns ${dataStore.id} through its events or API.`,
        });
      }
    }

    return violations;
  },
});
