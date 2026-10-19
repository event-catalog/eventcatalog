// System rule (warning): each of the Checkout System's services should depend on at most 3 other services.
// Checkout is on the critical path: every service it depends on is one more thing that can make checkout fail.
//
// This file lives in the checkout-system folder, so `resource` is the Checkout System.
import { defineFitnessFunction } from '@eventcatalog/fitness';
import { getServiceDependencies } from '../../../../../fitness/helpers/catalog';

const MAX_DEPENDENCIES = 3;

export default defineFitnessFunction({
  id: 'checkout-service-fan-out',
  name: `Services depend on at most ${MAX_DEPENDENCIES} others`,
  severity: 'warning',

  async run({ resource, catalog }) {
    if (resource?.type !== 'system') throw new Error('Expected to run alongside a system');

    const dependencies = await getServiceDependencies(catalog);

    return (resource.services ?? [])
      .map((service) => ({ id: service.id, dependsOn: [...(dependencies.get(service.id) ?? [])].sort() }))
      .filter(({ dependsOn }) => dependsOn.length > MAX_DEPENDENCIES)
      .map(({ id, dependsOn }) => ({
        message: `${id} depends on ${dependsOn.length} services`,
        resources: [{ type: 'service', id }, ...dependsOn.map((dependency) => ({ type: 'service', id: dependency }))],
        details: `It receives messages from ${dependsOn.join(', ')}.`,
        suggestion: 'Consider whether some of these could be combined, or moved off the checkout path.',
      }));
  },
});
