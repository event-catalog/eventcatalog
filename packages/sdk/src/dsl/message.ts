import type { Event, Command, Query } from '../types';
import { serializeBaseFields, type MessageType } from './utils';

export function messageToDSL(resource: Event | Command | Query, type: MessageType): string {
  const body = serializeBaseFields(resource);

  if (!body) {
    return `${type} ${resource.id}`;
  }

  return `${type} ${resource.id} {\n${body}\n}`;
}
