// Global rule: message ids must be kebab-case (order-created, not OrderCreated), so they match our topic and schema names.
// Shows a fitness function importing a helper from another file.
import { defineFitnessFunction } from '@eventcatalog/fitness';
import { isKebabCase, toKebabCase } from '../helpers/naming';

export default defineFitnessFunction({
  id: 'message-ids-are-kebab-case',
  name: 'Message ids are kebab-case',

  async run({ catalog }) {
    const messages = [
      ...((await catalog.getEvents({ latestOnly: true })) ?? []).map((message) => ({ type: 'event', message })),
      ...((await catalog.getCommands({ latestOnly: true })) ?? []).map((message) => ({ type: 'command', message })),
      ...((await catalog.getQueries({ latestOnly: true })) ?? []).map((message) => ({ type: 'query', message })),
    ];

    return messages
      .filter(({ message }) => !isKebabCase(message.id))
      .map(({ type, message }) => ({
        message: `The ${type} id '${message.id}' is not kebab-case`,
        resources: [{ type, id: message.id, version: message.version }],
        suggestion: `Rename it to '${toKebabCase(message.id)}'.`,
      }));
  },
});
