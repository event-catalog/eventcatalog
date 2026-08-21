/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/src/federation/LICENSE
 */

import type { Index } from '@eventcatalog/sdk';
import type { FederationSourceConfig } from '../eventcatalog.config';

export type ResolvedFederationSource = {
  bytes: Buffer;
  index: Index;
  commit: string;
  generated: boolean;
};

export type FederationSourceProvider = {
  resolve(source: FederationSourceConfig): Promise<ResolvedFederationSource>;
  fetchContent(request: { source: FederationSourceConfig; commit: string; path: string }): Promise<Buffer>;
};
