import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';
import { findInMap, getVersionedMap, uniqueResources } from './util';
import { getTriggeredByOfMessage, getTriggersOfMessage, messageMatchesPointer, type MessageReceiver } from './message-triggers';

type Message = CollectionEntry<CollectionMessageTypes>;
type Pointer = { id: string; version?: string };

/**
 * What a message connects to, beyond the producers and consumers getEvents/getCommands/getQueries
 * already attach: the channels it travels on (its own `channels`, and the `to`/`from` channels of
 * services, agents and domains that send or receive it), the flows with a step for it, and the
 * messages it triggers or is triggered by. Receivers must be raw collection entries, because
 * hydration drops the channel and trigger pointers on sends/receives.
 */
export const getMessageConnections = (
  message: Message,
  catalog: {
    receivers: MessageReceiver[];
    messages: Message[];
    channels: CollectionEntry<'channels'>[];
    flows: CollectionEntry<'flows'>[];
  }
) => {
  const channelMap = getVersionedMap(catalog.channels);
  const resolveChannels = (pointers: Pointer[] = []) =>
    pointers.map((pointer) => findInMap(channelMap, pointer.id, pointer.version)).filter((channel) => !!channel);

  const channels = [...resolveChannels((message.data as any).channels)];
  for (const receiver of catalog.receivers) {
    for (const send of ((receiver.data as any).sends || []) as Array<Pointer & { to?: Pointer[] }>) {
      if (messageMatchesPointer(message, send)) channels.push(...resolveChannels(send.to));
    }
    for (const receive of ((receiver.data as any).receives || []) as Array<Pointer & { from?: Pointer[] }>) {
      if (messageMatchesPointer(message, receive)) channels.push(...resolveChannels(receive.from));
    }
  }

  const flows = catalog.flows.filter((flow) =>
    ((flow.data.steps || []) as any[]).some((step) => {
      const stepMessage = Array.isArray(step.message) ? step.message[0] : undefined;
      return (
        stepMessage?.collection === message.collection &&
        stepMessage?.data.id === message.data.id &&
        stepMessage?.data.version === message.data.version
      );
    })
  );

  return {
    channels: uniqueResources(channels as CollectionEntry<'channels'>[]),
    flows: uniqueResources(flows),
    triggers: uniqueResources(
      getTriggersOfMessage(catalog.receivers, message, catalog.messages).map((trigger) => trigger.message)
    ),
    triggeredBy: uniqueResources(
      getTriggeredByOfMessage(catalog.receivers, message, catalog.messages).map((trigger) => trigger.message)
    ),
  };
};
