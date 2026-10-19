// Fitness functions check your architecture against your own rules. Run them with `npm run fitness`.
// Each *.fitness.ts file in a fitness/ folder is one rule. Put rules in a resource's folder (e.g. domains/Orders/fitness/)
// to get that resource as `resource`.
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'messages-have-owners',
  name: 'Every message has an owner',
  description: 'Someone has to be accountable for every message, so consumers know who to talk to about changes.',
  // 'error' fails `npm run fitness` (and your CI), 'warning' reports without failing
  severity: 'error',

  async run({ catalog }) {
    const messages = [
      ...((await catalog.getEvents({ latestOnly: true })) ?? []).map((message) => ({ type: 'event', message })),
      ...((await catalog.getCommands({ latestOnly: true })) ?? []).map((message) => ({ type: 'command', message })),
      ...((await catalog.getQueries({ latestOnly: true })) ?? []).map((message) => ({ type: 'query', message })),
    ];

    // Return one violation for each problem found, or an empty array when the rule passes
    return messages
      .filter(({ message }) => !message.owners || message.owners.length === 0)
      .map(({ type, message }) => ({
        message: `The ${type} ${message.name} has no owners`,
        resources: [{ type, id: message.id, version: message.version }],
        suggestion: `Add the team or user responsible for the ${type} to its \`owners\`.`,
      }));
  },
});
