import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { formatPatch, structuredPatch } from 'diff';
import { html, parse } from 'diff2html';
import { getItemsFromCollectionByIdAndSemverOrLatest } from './util';
import type { CollectionEntry } from 'astro:content';
import type { CollectionTypes } from '@types';

const FILE_EXTENSIONS_TO_INCLUDE = ['.json', '.avsc', '.avro', '.yaml', '.yml', '.proto', '.pb', '.pbjson', '.pb.go'];

/**
 * Generates a diff string in a unified diff format for two versions of a file.
 * @param fileName - The name of the file being compared
 * @param oldStr - The content of the old version of the file
 * @param newStr - The content of the new version of the file
 * @returns A string representing the diff in unified format
 */
function generateDiffString(fileName: string, oldStr: string, newStr: string): string {
  const jsonPatch = structuredPatch(fileName, fileName, oldStr, newStr);
  return jsonPatch.hunks.length == 0 ? '' : formatPatch(jsonPatch);
}

/**
 * Retrieves the list of files for diffing in a collection.
 * @param collection - The collection entry to get files from
 * @returns An array of objects containing file names and their directory paths
 */
export async function getFilesForDiffInCollection(
  collection: CollectionEntry<CollectionTypes>
): Promise<Array<{ file: string; dir: string }>> {
  // @ts-ignore
  const pathToFolder = collection.filePath;
  if (!pathToFolder) return [];

  const dir = dirname(pathToFolder);
  const allFilesInDirectory = await readdir(dir);

  return allFilesInDirectory
    .filter((file) => FILE_EXTENSIONS_TO_INCLUDE.some((ext) => file.endsWith(ext)))
    .map((file) => ({ file, dir }));
}

/**
 * Generates diffs for files between two versions of a collection.
 * @param collections - Array of all collection entries
 * @param id - The ID of the collection to compare
 * @param versionA - The first version to compare
 * @param versionB - The second version to compare
 * @returns An array of diff strings for matching files between versions
 */
async function getFilesDiffsBetweenVersions(
  id: string,
  collections: CollectionEntry<CollectionTypes>[],
  versionA: string,
  versionB: string
): Promise<string[]> {
  const [collectionA, collectionB] = await Promise.all([
    getItemsFromCollectionByIdAndSemverOrLatest(collections, id, versionA),
    getItemsFromCollectionByIdAndSemverOrLatest(collections, id, versionB),
  ]);

  if (collectionA.length === 0 || collectionB.length === 0) return [];

  const [filesForCollectionA, filesForCollectionB] = await Promise.all([
    getFilesForDiffInCollection(collectionA[0]),
    getFilesForDiffInCollection(collectionB[0]),
  ]);

  if (filesForCollectionA.length === 0 || filesForCollectionB.length === 0) return [];

  const matchingFiles = filesForCollectionA.filter((fileA) => filesForCollectionB.some((fileB) => fileB.file === fileA.file));

  const filesToDiff = matchingFiles.map((file) => ({
    file: file.file,
    dirA: filesForCollectionA.find((f) => f.file === file.file)?.dir,
    dirB: filesForCollectionB.find((f) => f.file === file.file)?.dir,
  }));

  const diffs = await Promise.all(
    filesToDiff.map(async (file) => {
      const [contentA, contentB] = await Promise.all([
        file.dirA ? readFile(join(file.dirA, file.file), 'utf-8') : '',
        file.dirB ? readFile(join(file.dirB, file.file), 'utf-8') : '',
      ]);
      return generateDiffString(file.file, contentB, contentA);
    })
  );

  return diffs.filter((diff) => diff !== '');
}

/**
 * Generates HTML diffs for files in a collection between the current and previous version.
 * @param id - The ID of the collection
 * @param version - The current version of the collection
 * @param allCollectionItems - Array of all collection items
 * @param versions - Array of all available versions
 * @returns An array of HTML strings representing the diffs, or null if no previous version exists
 */
export async function getDiffsForCurrentAndPreviousVersion(
  currentVersion: string,
  previousVersion: string,
  collectionId: string,
  allCollectionItems: CollectionEntry<CollectionTypes>[]
): Promise<string[] | null> {
  const diffs = await getFilesDiffsBetweenVersions(collectionId, allCollectionItems, currentVersion, previousVersion);

  if (diffs.length === 0) return [];

  return diffs.map((diff) => html(parse(diff), { drawFileList: false, matching: 'lines', outputFormat: 'side-by-side' }));
}
