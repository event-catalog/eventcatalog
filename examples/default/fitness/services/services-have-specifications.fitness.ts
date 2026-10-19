// Global rule (warning): internal services should publish an OpenAPI, AsyncAPI or GraphQL specification.
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'services-have-specifications',
  name: 'Services publish a specification',
  severity: 'warning',

  async run({ catalog }) {
    const services = (await catalog.getServices({ latestOnly: true })) ?? [];

    return services
      .filter((service) => !service.externalSystem)
      .filter((service) => {
        const specifications = service.specifications;
        if (!specifications) return true;
        return Array.isArray(specifications) ? specifications.length === 0 : Object.keys(specifications).length === 0;
      })
      .map((service) => ({
        message: `${service.name} (${service.id}) has no specification`,
        resources: [{ type: 'service', id: service.id, version: service.version }],
        suggestion: 'Add an OpenAPI or AsyncAPI file to the service and list it in `specifications`.',
      }));
  },
});
