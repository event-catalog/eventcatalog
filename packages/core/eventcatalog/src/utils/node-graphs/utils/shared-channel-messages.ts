export type DistinctMessagePair = {
  producerMessageId: string;
  consumerMessageId: string;
};

/**
 * Projects a shared channel hub into distinct producer/consumer message pairs.
 *
 * This does not infer message identity or a one-to-one mapping. Every producer
 * message routes into the channel and every consumer message whose id is not
 * also present on the producer side routes out of it. Views that do not render
 * channel nodes can therefore represent the same topology as `via <channel>`
 * message-to-message edges. Same-id producer/consumer messages keep the
 * historical same-message path and are not duplicated here.
 */
export const getDistinctMessagePairs = (
  producerMessageIds: Iterable<string>,
  consumerMessageIds: Iterable<string>
): DistinctMessagePair[] => {
  const producers = [...new Set(producerMessageIds)];
  const producerSet = new Set(producers);
  const distinctConsumers = [...new Set(consumerMessageIds)].filter((consumerMessageId) => !producerSet.has(consumerMessageId));

  return producers.flatMap((producerMessageId) =>
    distinctConsumers.map((consumerMessageId) => ({ producerMessageId, consumerMessageId }))
  );
};

export const shouldRouteConsumerMessageAfterChannel = (
  producerMessageIds: Iterable<string>,
  consumerMessageId: string
): boolean => {
  const producers = new Set(producerMessageIds);
  return producers.size > 0 && !producers.has(consumerMessageId);
};
