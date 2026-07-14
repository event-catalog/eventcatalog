import type { CollectionEntry } from 'astro:content';
import type { CollectionMessageTypes } from '@types';
import { getItemsFromCollectionByIdAndSemverOrLatest, versionMatches } from './util';

type Message = CollectionEntry<CollectionMessageTypes>;
export type MessageReceiver = CollectionEntry<'services'> | CollectionEntry<'domains'> | CollectionEntry<'agents'>;

interface TriggerPointer {
  id: string;
  version?: string;
  condition?: string;
}

interface ReceivePointer {
  id: string;
  version?: string;
  triggers?: TriggerPointer[];
}

export interface MessageTrigger {
  receiver: MessageReceiver;
  message: Message;
  condition?: string;
}

const messageMatchesPointer = (message: Message, pointer: { id: string; version?: string }) => {
  if (pointer.id !== message.data.id) return false;

  if (!pointer.version || pointer.version === 'latest') {
    return !message.data.latestVersion || message.data.version === message.data.latestVersion;
  }

  return versionMatches(message.data.version, pointer.version);
};

/**
 * Returns the messages triggered when a resource receives the given message.
 *
 * Receivers must be raw collection entries because hydration replaces receive
 * pointers with messages and therefore removes trigger metadata.
 */
export const getTriggersOfMessage = (
  receivers: MessageReceiver[],
  message: Message,
  allMessages: Message[]
): MessageTrigger[] => {
  const triggers: MessageTrigger[] = [];

  for (const receiver of receivers) {
    const receives = (receiver.data.receives as ReceivePointer[]) ?? [];

    for (const receive of receives) {
      if (!receive.triggers?.length || !messageMatchesPointer(message, receive)) continue;

      for (const trigger of receive.triggers) {
        const target = getItemsFromCollectionByIdAndSemverOrLatest(allMessages, trigger.id, trigger.version)[0];
        if (!target) continue;

        triggers.push({ receiver, message: target, condition: trigger.condition });
      }
    }
  }

  return triggers;
};

/**
 * Returns the messages whose handling can trigger the given message.
 *
 * Receivers must be raw collection entries because hydration replaces receive
 * pointers with messages and therefore removes trigger metadata.
 */
export const getTriggeredByOfMessage = (
  receivers: MessageReceiver[],
  message: Message,
  allMessages: Message[]
): MessageTrigger[] => {
  const triggeredBy: MessageTrigger[] = [];

  for (const receiver of receivers) {
    const receives = (receiver.data.receives as ReceivePointer[]) ?? [];

    for (const receive of receives) {
      for (const trigger of receive.triggers ?? []) {
        if (!messageMatchesPointer(message, trigger)) continue;

        const source = getItemsFromCollectionByIdAndSemverOrLatest(allMessages, receive.id, receive.version)[0];
        if (!source) continue;

        triggeredBy.push({ receiver, message: source, condition: trigger.condition });
      }
    }
  }

  return triggeredBy;
};

const getMessageKey = (message: Message) => `${message.collection}:${message.data.id}:${message.data.version}`;

/**
 * Returns only messages that participate in at least one resolved trigger path.
 * Both the source and target are included so empty trigger pages are never generated.
 */
export const getMessagesWithTriggerPaths = (receivers: MessageReceiver[], allMessages: Message[]): Message[] => {
  const messageKeysWithPaths = new Set<string>();

  for (const source of allMessages) {
    const triggers = getTriggersOfMessage(receivers, source, allMessages);
    if (triggers.length === 0) continue;

    messageKeysWithPaths.add(getMessageKey(source));
    for (const trigger of triggers) {
      messageKeysWithPaths.add(getMessageKey(trigger.message));
    }
  }

  return allMessages.filter((message) => messageKeysWithPaths.has(getMessageKey(message)));
};
