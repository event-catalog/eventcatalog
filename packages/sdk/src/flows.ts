import type { Flow } from './types';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { findFileById, invalidateFileCache } from './internal/utils';
import {
  addFileToResource,
  getResource,
  getResources,
  getVersionedDirectory,
  rmResourceById,
  versionResource,
  writeResource,
} from './internal/resources';

export { FlowBuilder } from './flow-builder';
export type * from './flow-builder';

/**
 * Returns a flow from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the flow
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getFlow } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the flow
 * const flow = await getFlow('PaymentFlow');
 *
 * // Gets a version of the flow
 * const flow = await getFlow('PaymentFlow', '0.0.1');
 *
 * ```
 */
export const getFlow =
  (directory: string) =>
  async (id: string, version?: string): Promise<Flow> =>
    getResource(directory, id, version, { type: 'flow' }) as Promise<Flow>;

/**
 * Returns all flows from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the flows.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getFlows } = utils('/path/to/eventcatalog');
 *
 * // Gets all flows (and versions) from the catalog
 * const flows = await getFlows();
 *
 * // Gets all flows (only latest version) from the catalog
 * const flows = await getFlows({ latestOnly: true });
 *
 * ```
 */
export const getFlows =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Flow[]> =>
    getResources(directory, { type: 'flows', latestOnly: options?.latestOnly }) as Promise<Flow[]>;

/**
 * Write a flow to EventCatalog.
 *
 * You can optionally override the path of the flow.
 *
 * @example
 * ```ts
 * import utils, { FlowBuilder } from '@eventcatalog/utils';
 *
 * const { writeFlow } = utils('/path/to/eventcatalog');
 *
 * // Build a flow using the fluent builder API
 * const flow = FlowBuilder.create({
 *   id: 'PaymentFlow',
 *   name: 'Payment Flow',
 *   version: '0.0.1',
 *   summary: 'Business flow for processing payments',
 *   markdown: '# Payment Flow',
 * })
 *   .addMessageStep({
 *     id: 'PlaceOrder',
 *     title: 'Place order',
 *     message: { id: 'PlaceOrder', version: '0.0.1' },
 *     nextSteps: [{ id: 'PaymentProcessed', label: 'Payment processed' }],
 *   })
 *   .addMessageStep({
 *     id: 'PaymentProcessed',
 *     title: 'Payment processed',
 *     message: { id: 'PaymentProcessed', version: '0.0.1' },
 *   })
 *   .build();
 *
 * // Flow would be written to flows/PaymentFlow
 * await writeFlow(flow);
 *
 * // You can also write a raw Flow object
 * await writeFlow({
 *   id: 'RewardFlow',
 *   name: 'Reward Flow',
 *   version: '0.0.1',
 *   markdown: '# Reward Flow',
 *   steps: [],
 * });
 *
 * // Write a flow to the catalog but override the path
 * // Flow would be written to flows/Payments/RewardFlow
 * await writeFlow({
 *   id: 'RewardFlow',
 *   name: 'Reward Flow',
 *   version: '0.0.1',
 *   markdown: '# Reward Flow',
 *   steps: [],
 * }, { path: '/Payments/RewardFlow' });
 *
 * // Write a flow to the catalog and override the existing content
 * await writeFlow({
 *   id: 'RewardFlow',
 *   name: 'Reward Flow',
 *   version: '0.0.1',
 *   markdown: '# Reward Flow',
 *   steps: [],
 * }, { override: true });
 * ```
 */
export const writeFlow =
  (directory: string) =>
  async (
    flow: Flow,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) =>
    writeResource(directory, { ...flow }, { ...options, type: 'flow' });

/**
 * Write a versioned flow to EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeVersionedFlow } = utils('/path/to/eventcatalog');
 *
 * // Flow would be written to flows/PaymentFlow/versioned/0.0.1
 * await writeVersionedFlow({
 *   id: 'PaymentFlow',
 *   name: 'Payment Flow',
 *   version: '0.0.1',
 *   markdown: '# Payment Flow',
 *   steps: [],
 * });
 * ```
 */
export const writeVersionedFlow = (directory: string) => async (flow: Flow) => {
  const path = getVersionedDirectory(flow.id, flow.version);

  return await writeFlow(directory)({ ...flow }, { path });
};

/**
 * Write a flow to a domain in EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeFlowToDomain } = utils('/path/to/eventcatalog');
 *
 * // Flow would be written to domains/Orders/flows/PaymentFlow
 * await writeFlowToDomain({
 *   id: 'PaymentFlow',
 *   name: 'Payment Flow',
 *   version: '0.0.1',
 *   markdown: '# Payment Flow',
 *   steps: [],
 * }, { id: 'Orders' });
 * ```
 */
export const writeFlowToDomain =
  (directory: string) =>
  async (
    flow: Flow,
    domain: { id: string; version?: string },
    options: { path?: string; format?: 'md' | 'mdx'; override?: boolean } = { path: '', format: 'mdx', override: false }
  ) => {
    let pathForFlow =
      domain.version && domain.version !== 'latest' ? `/${domain.id}/versioned/${domain.version}/flows` : `/${domain.id}/flows`;
    pathForFlow = join(pathForFlow, flow.id);

    await writeResource(directory, { ...flow }, { ...options, path: pathForFlow, type: 'flow' });
  };

/**
 * Write a flow to a service in EventCatalog.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeFlowToService } = utils('/path/to/eventcatalog');
 *
 * // Flow would be written to services/PaymentService/flows/PaymentFlow
 * await writeFlowToService({
 *   id: 'PaymentFlow',
 *   name: 'Payment Flow',
 *   version: '0.0.1',
 *   markdown: '# Payment Flow',
 *   steps: [],
 * }, { id: 'PaymentService' });
 * ```
 */
export const writeFlowToService =
  (directory: string) =>
  async (
    flow: Flow,
    service: { id: string; version?: string },
    options: { path?: string; format?: 'md' | 'mdx'; override?: boolean } = { path: '', format: 'mdx', override: false }
  ) => {
    let pathForFlow =
      service.version && service.version !== 'latest'
        ? `/${service.id}/versioned/${service.version}/flows`
        : `/${service.id}/flows`;
    pathForFlow = join(pathForFlow, flow.id);

    await writeResource(directory, { ...flow }, { ...options, path: pathForFlow, type: 'flow' });
  };

/**
 * Delete a flow at its given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmFlow } = utils('/path/to/eventcatalog');
 *
 * // Removes the flow at flows/PaymentFlow
 * await rmFlow('/PaymentFlow');
 * ```
 */
export const rmFlow = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
  invalidateFileCache();
};

/**
 * Delete a flow by its id.
 *
 * Optionally specify a version to delete a specific version of the flow.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmFlowById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest PaymentFlow flow
 * await rmFlowById('PaymentFlow');
 *
 * // deletes a specific version of the PaymentFlow flow
 * await rmFlowById('PaymentFlow', '0.0.1');
 * ```
 */
export const rmFlowById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'flow', persistFiles });
};

/**
 * Version a flow by its id.
 *
 * Takes the latest flow and moves it to a versioned directory.
 * All files with this flow are also versioned.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionFlow } = utils('/path/to/eventcatalog');
 *
 * // moves the latest PaymentFlow flow to a versioned directory
 * await versionFlow('PaymentFlow');
 * ```
 */
export const versionFlow = (directory: string) => async (id: string) => versionResource(directory, id);

/**
 * Check to see if the catalog has a version for the given flow.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { flowHasVersion } = utils('/path/to/eventcatalog');
 *
 * await flowHasVersion('PaymentFlow', '0.0.1');
 * await flowHasVersion('PaymentFlow', 'latest');
 * await flowHasVersion('PaymentFlow', '0.0.x');
 * ```
 */
export const flowHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

/**
 * Adds a file to the given flow.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { addFileToFlow } = utils('/path/to/eventcatalog');
 *
 * // adds a file to the latest PaymentFlow flow
 * await addFileToFlow('PaymentFlow', { content: 'Hello world', fileName: 'notes.md' });
 *
 * // adds a file to a specific version of the PaymentFlow flow
 * await addFileToFlow('PaymentFlow', { content: 'Hello world', fileName: 'notes.md' }, '0.0.1');
 * ```
 */
export const addFileToFlow =
  (directory: string) =>
  async (id: string, file: { content: string; fileName: string }, version?: string): Promise<void> =>
    addFileToResource(directory, id, file, version, { type: 'flow' });
