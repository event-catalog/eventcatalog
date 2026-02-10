import { dirname, join } from 'node:path';
import type { Message, Service } from './types';
import matter from 'gray-matter';
import { getResource, getResourcePath, isLatestVersion } from './internal/resources';
import { getFiles } from './internal/utils';
import { getServices } from './services';
import { satisfies, validRange } from 'semver';

/**
 * Returns a message from EventCatalog by a given schema path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getMessageBySchemaPath } = utils('/path/to/eventcatalog');
 *
 * // Get the message by the schema path
 * const message = await getMessageBySchemaPath('/path/to/eventcatalog/messages/InventoryAdjusted/schema.json');
 * const message = await getMessageBySchemaPath('/path/to/eventcatalog/messages/InventoryAdjusted/schema.avro');
 * ```
 */
export const getMessageBySchemaPath =
  (directory: string) =>
  async (path: string, options?: { attachSchema?: boolean }): Promise<Message> => {
    const pathToMessage = dirname(path);
    try {
      const files = await getFiles(`${directory}/${pathToMessage}/index.{md,mdx}`);

      if (!files || files.length === 0) {
        throw new Error(`No message definition file (index.md or index.mdx) found in directory: ${pathToMessage}`);
      }
      const messageFile = files[0];

      const { data } = matter.read(messageFile);
      const { id, version } = data;

      if (!id || !version) {
        throw new Error(`Message definition file at ${messageFile} is missing 'id' or 'version' in its frontmatter.`);
      }

      const message = await getResource(directory, id, version, { type: 'message', ...options });

      if (!message) {
        throw new Error(`Message resource with id '${id}' and version '${version}' not found, as referenced in ${messageFile}.`);
      }
      return message as Message;
    } catch (error) {
      // console.error(`Failed to get message for schema path ${path}. Error processing directory ${pathToMessage}:`, error);
      if (error instanceof Error) {
        // Prepend more context to the existing error message
        error.message = `Failed to retrieve message from ${pathToMessage}: ${error.message}`;
        throw error;
      }
      throw new Error(`Failed to retrieve message from ${pathToMessage} due to an unknown error.`);
    }
  };

/**
 * Returns the producers and consumers (services) for a given message.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getProducersAndConsumersForMessage } = utils('/path/to/eventcatalog');
 *
 * // Returns the producers and consumers (services) for a given message
 * const { producers, consumers } = await getProducersAndConsumersForMessage('InventoryAdjusted', '0.0.1');
 */
export const getProducersAndConsumersForMessage =
  (directory: string) =>
  async (
    id: string,
    version?: string,
    options?: { latestOnly?: boolean }
  ): Promise<{ producers: Service[]; consumers: Service[] }> => {
    const services = await getServices(directory)({ latestOnly: options?.latestOnly ?? true });
    const message = (await getResource(directory, id, version, { type: 'message' })) as Message;
    const isMessageLatestVersion = await isLatestVersion(directory, id, version);

    if (!message) {
      throw new Error(`Message resource with id '${id}' and version '${version}' not found.`);
    }

    const producers: Service[] = [];
    const consumers: Service[] = [];

    for (const service of services) {
      const servicePublishesMessage = service.sends?.some((_message) => {
        if (_message.version) {
          const isServiceUsingSemverRange = validRange(_message.version);
          if (isServiceUsingSemverRange) {
            return _message.id === message.id && satisfies(message.version, _message.version);
          } else {
            return _message.id === message.id && message.version === _message.version;
          }
        }
        if (isMessageLatestVersion && _message.id === message.id) {
          return true;
        }
        return false;
      });
      const serviceSubscribesToMessage = service.receives?.some((_message) => {
        if (_message.version) {
          const isServiceUsingSemverRange = validRange(_message.version);
          if (isServiceUsingSemverRange) {
            return _message.id === message.id && satisfies(message.version, _message.version);
          } else {
            return _message.id === message.id && message.version === _message.version;
          }
        }
        if (isMessageLatestVersion && _message.id === message.id) {
          return true;
        }
        return false;
      });

      if (servicePublishesMessage) {
        producers.push(service);
      }
      if (serviceSubscribesToMessage) {
        consumers.push(service);
      }
    }

    return { producers, consumers };
  };

/**
 * Returns the consumers of a given schema path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getConsumersOfSchema } = utils('/path/to/eventcatalog');
 *
 * // Returns the consumers of a given schema path
 * const consumers = await getConsumersOfSchema('events/InventoryAdjusted/schema.json');
 */
export const getConsumersOfSchema = (directory: string) => async (path: string) => {
  try {
    const message = await getMessageBySchemaPath(directory)(path);
    const { consumers } = await getProducersAndConsumersForMessage(directory)(message.id, message.version);
    return consumers;
  } catch (error) {
    return [];
  }
};

/**
 * Returns the producers of a given schema path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getProducersOfSchema } = utils('/path/to/eventcatalog');
 *
 * // Returns the producers of a given schema path
 * const producers = await getProducersOfSchema('events/InventoryAdjusted/schema.json');
 */
export const getProducersOfSchema = (directory: string) => async (path: string) => {
  try {
    const message = await getMessageBySchemaPath(directory)(path);
    const { producers } = await getProducersAndConsumersForMessage(directory)(message.id, message.version);
    return producers;
  } catch (error) {
    return [];
  }
};
