import { getEventCatalogConfigFile } from './eventcatalog-config-file-utils';
import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';

// Create a fake file for this dependency in the project directory ()

export default async (catalogDir, core) => {
  const catalogConfig = await getEventCatalogConfigFile(catalogDir);

  const dependencies = catalogConfig?.dependencies ?? null;

  if (!dependencies) {
    // No dependencies found in catalog config just skip
    return;
  }

  // empty the dependencies directory if it exists
  const dependenciesDir = path.join(catalogDir, 'dependencies');

  if (fs.existsSync(dependenciesDir)) {
    fs.rmSync(dependenciesDir, { recursive: true, force: true });
  }

  // Create a "dependencies" directory in the catalogDir
  fs.mkdirSync(dependenciesDir, { recursive: true });

  const resourceTypes = Object.keys(dependencies);
  for (const resourceType of resourceTypes) {
    for (const dependency of dependencies[resourceType]) {
      const frontmatter = {
        id: dependency.id,
        name: dependency.id,
        version: dependency.version || '1.0.0',
      };

      const markdown = matter.stringify(
        {
          content: [
            ':::warning',
            'You are running EventCatalog with dependencies enabled.',
            'This resource is mocked and is a dependency. This means that the resource is managed and owned by another catalog.',
            ':::',
          ].join('\n\n'),
        },
        frontmatter
      );

      const resourceFile = path.join(dependenciesDir, resourceType, dependency.id, `index.md`);
      // ensure the directory exists
      fs.mkdirSync(path.dirname(resourceFile), { recursive: true });
      fs.writeFileSync(resourceFile, markdown);
    }
  }

  return;
};
