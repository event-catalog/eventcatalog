// Fitness functions check your architecture against your own rules. Run them with `npm run fitness`.
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'events-have-producers',
  name: 'Every event has a producer',
  description: 'Events nobody sends are usually left over from a refactor, or are missing their producer in the catalog.',
  severity: 'warning',

  async run({ catalog }) {
    // `catalog` has the read methods of the EventCatalog SDK: https://www.eventcatalog.dev/docs/development/sdk
    // Read what everything sends once, rather than asking the catalog about each event
    const producers = [
      ...((await catalog.getServices({ latestOnly: true })) ?? []),
      ...((await catalog.getAgents({ latestOnly: true })) ?? []),
      ...((await catalog.getDomains({ latestOnly: true })) ?? []),
    ];
    const sent = new Set(producers.flatMap((producer) => (producer.sends ?? []).map((message) => message.id)));

    const events = (await catalog.getEvents({ latestOnly: true })) ?? [];

    return events
      .filter((event) => !sent.has(event.id))
      .map((event) => ({
        message: `No service sends the event ${event.name}`,
        resources: [{ type: 'event', id: event.id, version: event.version }],
        suggestion: 'Add the event to the `sends` of the service that publishes it, or remove it if it is no longer used.',
      }));
  },
});
