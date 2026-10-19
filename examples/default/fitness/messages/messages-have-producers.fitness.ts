// Global rule (warning): every event and command should be sent by at least one service, agent or domain.
// Messages nobody produces are usually leftovers from a refactor, or a producer that hasn't been documented yet.
import { defineFitnessFunction } from '@eventcatalog/fitness';

export default defineFitnessFunction({
  id: 'messages-have-producers',
  name: 'Every message has a producer',
  severity: 'warning',

  async run({ catalog }) {
    // Read the producers and consumers once, rather than asking the catalog about each message
    const participants = [
      ...((await catalog.getServices({ latestOnly: true })) ?? []),
      ...((await catalog.getAgents({ latestOnly: true })) ?? []),
      ...((await catalog.getDomains({ latestOnly: true })) ?? []),
    ];
    const sent = new Set(participants.flatMap((participant) => (participant.sends ?? []).map((message) => message.id)));
    const receiversOf = (messageId: string) =>
      participants.filter((participant) => participant.receives?.some((message) => message.id === messageId)).map(({ id }) => id);

    const events = (await catalog.getEvents({ latestOnly: true })) ?? [];
    const commands = (await catalog.getCommands({ latestOnly: true })) ?? [];

    const violations = [];
    for (const [type, messages] of [
      ['event', events],
      ['command', commands],
    ] as const) {
      for (const message of messages) {
        if (sent.has(message.id)) continue;

        const consumers = receiversOf(message.id);
        violations.push({
          message: `No one sends the ${type} ${message.name}`,
          resources: [{ type, id: message.id, version: message.version }],
          details: consumers.length > 0 ? `It is received by ${consumers.join(', ')}.` : 'It is not received by anything either.',
          suggestion: `Add the ${type} to the \`sends\` of the service that produces it, or remove it if it is no longer used.`,
        });
      }
    }

    return violations;
  },
});
