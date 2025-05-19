import type { CollectionTypes } from '@types';
import type { CollectionEntry } from 'astro:content';
import { dirname } from 'path';
import { join } from 'path';
import fs from 'fs';

export const addSchemaToMarkdown = (collection: CollectionEntry<CollectionTypes>, file: string) => {
  const resourceData = collection?.data;
  const fileToResource = collection.filePath ?? '';
  let schemas: string[] = [];

  if (!resourceData?.specifications && !resourceData?.schemaPath) {
    return file;
  }

  if (Array.isArray(resourceData?.specifications)) {
    schemas = resourceData?.specifications.map((specification: any) => specification.path);
  } else {
    schemas = [resourceData?.schemaPath ?? ''];
  }

  const filteredSchemas = schemas.filter((schema: any) => schema !== undefined);

  // attach the schema if it has it
  if (filteredSchemas.length > 0) {
    for (const pathToSchema of filteredSchemas) {
      const directory = dirname(fileToResource);
      const schemaPath = join(directory, pathToSchema);
      const schemaFile = fs.readFileSync(schemaPath, 'utf8');
      file = `${file}\n\n ## Raw Schema:${pathToSchema}\n\n${schemaFile}`;
    }
  }

  return file;
};
