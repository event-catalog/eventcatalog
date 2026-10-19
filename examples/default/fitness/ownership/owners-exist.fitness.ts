// Global rule: every owner a resource lists must be a team or user in the catalog.
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'owners-exist',
  name: 'Owners are known teams or users',
  description: 'An owner that is not in the catalog cannot be contacted, so the resource is effectively unowned.',

  async run({ catalog }) {
    const teams = (await catalog.getTeams()) ?? [];
    const users = (await catalog.getUsers()) ?? [];
    const knownOwners = new Set([...teams, ...users].map((owner) => owner.id));

    const resourcesByType = {
      domain: (await catalog.getDomains({ latestOnly: true })) ?? [],
      service: (await catalog.getServices({ latestOnly: true })) ?? [],
      event: (await catalog.getEvents({ latestOnly: true })) ?? [],
      command: (await catalog.getCommands({ latestOnly: true })) ?? [],
      query: (await catalog.getQueries({ latestOnly: true })) ?? [],
    };

    const violations = [];
    for (const [type, resources] of Object.entries(resourcesByType)) {
      for (const resource of resources) {
        for (const owner of resource.owners ?? []) {
          // Owners can be written as an id, or as an object with an id
          const ownerId = typeof owner === 'string' ? owner : (owner as { id: string }).id;
          if (knownOwners.has(ownerId)) continue;

          violations.push({
            message: `${resource.name} is owned by '${ownerId}', which is not a team or user in the catalog`,
            resources: [{ type, id: resource.id, version: resource.version }],
            suggestion: `Add '${ownerId}' to teams/ or users/, or fix the owner's id.`,
          });
        }
      }
    }

    return violations;
  },
});
