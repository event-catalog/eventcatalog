// Global rule: every event (latest version) must have at least one owner.
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'events-have-owners',
  name: 'Every event has an owner',
  description: 'Someone has to be accountable for every event we publish, so consumers know who to talk to about changes.',
  severity: 'error',

  async run({ catalog }) {
    const events = (await catalog.getEvents({ latestOnly: true })) ?? [];

    return events
      .filter((event) => !event.owners || event.owners.length === 0)
      .map((event) => ({
        message: `${event.name} has no owners`,
        resources: [{ type: 'event', id: event.id, version: event.version }],
        suggestion: 'Add the team or user responsible for the event to its `owners`.',
      }));
  },
});
