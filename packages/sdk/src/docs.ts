/**
 * ## EventCatalog SDK
 *
 * The EventCatalog SDK provides methods to interact with domains, services, and messages.
 *
 * ## Installation
 *
 * ```sh
 * npm install @eventcatalog/sdk
 * ```
 *
 * ## Usage
 *
 * ```ts
 * import utils from '@eventcatalog/sdk';
 *
 * const { getEvent } = utils(PATH_TO_CATALOG);
 *
 * // Get an event by the id
 * const event = getEvent('event-name');
 *
 * // Get an event by the id and it's version
 * const event = getEvent('event-name', '0.3.4');
 * ```
 *
 * @module docs
 */
export * from './domains';
export * from './services';
export * from './events';
export * from './commands';
export * from './queries';
export * from './channels';
export * from './custom-docs';
export * from './teams';
export * from './users';
export * from './eventcatalog';
export * from './messages';
export * from './entities';
export * from './data-stores';
export * from './data-products';
export * from './diagrams';
