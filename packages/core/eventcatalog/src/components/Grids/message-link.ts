import type { CollectionMessageTypes } from '@types';

export const MESSAGE_COLLECTIONS: readonly CollectionMessageTypes[] = ['events', 'commands', 'queries'];

export function isMessageCollection(value: unknown): value is CollectionMessageTypes {
  return value === 'events' || value === 'commands' || value === 'queries';
}

export interface MessageLinkProps {
  collection?: CollectionMessageTypes;
  id?: string;
  name?: string;
  version: string;
  href?: string;
}

/**
 * Resolve a DomainGrid/SystemGrid receives/sends item into a docs link.
 *
 * Hydrated collection entries carry `collection` + `data.name`. Bare `{id, version}`
 * pointers do not — never guess `events` for those, or commands/queries get the wrong URL.
 */
export function getMessageLinkProps(message: any): MessageLinkProps {
  const data = message?.data ?? message;
  const collectionCandidate = message?.collection ?? data?.collection;
  const collection = isMessageCollection(collectionCandidate) ? collectionCandidate : undefined;
  const id = data?.id ?? message?.id;
  const name = data?.name || message?.name || id;
  const version = data?.version ?? message?.version ?? 'latest';

  return {
    collection,
    id,
    name,
    version,
    href: collection && id ? `/docs/${collection}/${id}/${version}` : undefined,
  };
}
