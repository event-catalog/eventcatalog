import fs from 'node:fs/promises';
import { join } from 'node:path';
import { findFileById } from './internal/utils';
import type { Diagram } from './types';
import {
  getResource,
  getResources,
  rmResourceById,
  versionResource,
  writeResource,
  addFileToResource,
} from './internal/resources';

/**
 * Returns a diagram from EventCatalog.
 *
 * You can optionally specify a version to get a specific version of the diagram
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getDiagram } = utils('/path/to/eventcatalog');
 *
 * // Gets the latest version of the diagram
 * const diagram = await getDiagram('ArchitectureDiagram');
 *
 * // Gets a version of the diagram
 * const diagram = await getDiagram('ArchitectureDiagram', '0.0.1');
 *
 * ```
 */
export const getDiagram =
  (directory: string) =>
  async (id: string, version?: string): Promise<Diagram> =>
    getResource(directory, id, version, { type: 'diagram' }) as Promise<Diagram>;

/**
 * Returns all diagrams from EventCatalog.
 *
 * You can optionally specify if you want to get the latest version of the diagrams.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { getDiagrams } = utils('/path/to/eventcatalog');
 *
 * // Gets all diagrams (and versions) from the catalog
 * const diagrams = await getDiagrams();
 *
 * // Gets all diagrams (only latest version) from the catalog
 * const diagrams = await getDiagrams({ latestOnly: true });
 *
 * ```
 */
export const getDiagrams =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Diagram[]> =>
    getResources(directory, { type: 'diagrams', latestOnly: options?.latestOnly }) as Promise<Diagram[]>;

/**
 * Write a diagram to EventCatalog.
 *
 * You can optionally override the path of the diagram.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { writeDiagram } = utils('/path/to/eventcatalog');
 *
 * // Write a diagram to the catalog
 * // Diagram would be written to diagrams/ArchitectureDiagram
 * await writeDiagram({
 *   id: 'ArchitectureDiagram',
 *   name: 'Architecture Diagram',
 *   version: '0.0.1',
 *   summary: 'Architecture diagram',
 *   markdown: '# Architecture Diagram',
 * });
 *
 * // Write a diagram to the catalog but override the path
 * // Diagram would be written to diagrams/System/ArchitectureDiagram
 * await writeDiagram({
 *    id: 'ArchitectureDiagram',
 *    name: 'Architecture Diagram',
 *    version: '0.0.1',
 *    summary: 'Architecture diagram',
 *    markdown: '# Architecture Diagram',
 * }, { path: "/System/ArchitectureDiagram"});
 *
 * // Write a diagram to the catalog and override the existing content (if there is any)
 * await writeDiagram({
 *    id: 'ArchitectureDiagram',
 *    name: 'Architecture Diagram',
 *    version: '0.0.1',
 *    summary: 'Architecture diagram',
 *    markdown: '# Architecture Diagram',
 * }, { override: true });
 *
 * // Write a diagram to the catalog and version the previous version
 * // only works if the new version is greater than the previous version
 * await writeDiagram({
 *    id: 'ArchitectureDiagram',
 *    name: 'Architecture Diagram',
 *    version: '0.0.1',
 *    summary: 'Architecture diagram',
 *    markdown: '# Architecture Diagram',
 * }, { versionExistingContent: true });
 *
 * ```
 */
export const writeDiagram =
  (directory: string) =>
  async (
    diagram: Diagram,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) =>
    writeResource(directory, { ...diagram }, { ...options, type: 'diagram' });

/**
 * Delete a diagram at its given path.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDiagram } = utils('/path/to/eventcatalog');
 *
 * // removes a diagram at the given path (diagrams dir is appended to the given path)
 * // Removes the diagram at diagrams/ArchitectureDiagram
 * await rmDiagram('/ArchitectureDiagram');
 * ```
 */
export const rmDiagram = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
};

/**
 * Delete a diagram by its id.
 *
 * Optionally specify a version to delete a specific version of the diagram.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { rmDiagramById } = utils('/path/to/eventcatalog');
 *
 * // deletes the latest ArchitectureDiagram diagram
 * await rmDiagramById('ArchitectureDiagram');
 *
 * // deletes a specific version of the ArchitectureDiagram diagram
 * await rmDiagramById('ArchitectureDiagram', '0.0.1');
 * ```
 */
export const rmDiagramById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'diagram', persistFiles });
};

/**
 * Version a diagram by its id.
 *
 * Takes the latest diagram and moves it to a versioned directory.
 * All files with this diagram are also versioned (e.g /diagrams/ArchitectureDiagram/diagram.png)
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { versionDiagram } = utils('/path/to/eventcatalog');
 *
 * // moves the latest ArchitectureDiagram diagram to a versioned directory
 * // the version within that diagram is used as the version number.
 * await versionDiagram('ArchitectureDiagram');
 *
 * ```
 */
export const versionDiagram = (directory: string) => async (id: string) => versionResource(directory, id);

/**
 * Check to see if the catalog has a version for the given diagram.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { diagramHasVersion } = utils('/path/to/eventcatalog');
 *
 * // returns true if version is found for the given diagram and version (supports semver)
 * await diagramHasVersion('ArchitectureDiagram', '0.0.1');
 * await diagramHasVersion('ArchitectureDiagram', 'latest');
 * await diagramHasVersion('ArchitectureDiagram', '0.0.x');
 *
 * ```
 */
export const diagramHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

/**
 * Adds a file to the given diagram.
 *
 * @example
 * ```ts
 * import utils from '@eventcatalog/utils';
 *
 * const { addFileToDiagram } = utils('/path/to/eventcatalog');
 *
 * // adds a file to the diagram
 * await addFileToDiagram('ArchitectureDiagram', { content: '...', fileName: 'diagram.png' });
 *
 * // adds a file to a specific version of the diagram
 * await addFileToDiagram('ArchitectureDiagram', { content: '...', fileName: 'diagram.png' }, '0.0.1');
 *
 * ```
 */
export const addFileToDiagram =
  (directory: string) =>
  async (id: string, file: { content: string; fileName: string }, version?: string): Promise<void> =>
    addFileToResource(directory, id, file, version, { type: 'diagram' });
