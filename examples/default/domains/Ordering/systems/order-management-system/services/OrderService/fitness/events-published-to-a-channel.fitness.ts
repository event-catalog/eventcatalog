// Service rule: every event the Order Service sends must say which channel it is published to.
// Without a channel, consumers can't tell where to subscribe.
//
// This file lives in the OrderService folder, so `resource` is the Order Service.
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'order-service-events-published-to-a-channel',
  name: 'Events are published to a channel',

  async run({ resource, catalog }) {
    if (resource?.type !== 'service') throw new Error('Expected to run alongside a service');

    const violations = [];
    for (const sent of resource.sends ?? []) {
      // Commands and queries can be sent point to point; only events need a channel
      const event = await catalog.getEvent(sent.id, sent.version);
      if (!event) continue;
      if (sent.to && sent.to.length > 0) continue;

      violations.push({
        message: `${resource.name} sends ${event.name} without a channel`,
        resources: [
          { type: 'service', id: resource.id, version: resource.version },
          { type: 'event', id: event.id, version: event.version },
        ],
        suggestion: 'Add the channel the event is published to, e.g. `to: [{ id: ordering.order-events }]`.',
      });
    }

    return violations;
  },
});
