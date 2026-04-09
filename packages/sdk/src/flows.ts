import type { Flow } from './types';
import { getResource, getResources } from './internal/resources';

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
