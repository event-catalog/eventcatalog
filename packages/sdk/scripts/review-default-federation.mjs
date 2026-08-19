import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createSdk, { hydrate, resolve } from '../dist/index.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../..');
const catalogDirectory = path.join(repositoryRoot, 'examples/default');
const outDir = path.join(repositoryRoot, 'federated-catalog');
const source = 'eventcatalog/examples/default';
const commit = 'working-tree';

const fetch = async (request) => {
  if (request.source !== source || request.commit !== commit) {
    throw new Error(`Unexpected fetch source: ${request.source}@${request.commit}`);
  }

  const requestedPath = path.resolve(catalogDirectory, request.path);
  const catalogPrefix = `${catalogDirectory}${path.sep}`;
  if (!requestedPath.startsWith(catalogPrefix)) {
    throw new Error(`Fetch path escapes examples/default: ${request.path}`);
  }

  return fs.readFile(requestedPath);
};

const index = await createSdk(catalogDirectory).buildIndex({ source, commit });
const graph = resolve([index]);
const hydrateResult = await hydrate(graph, {
  outDir,
  localSource: 'eventcatalog/federation-review',
  fetch,
});

await Promise.all([
  fs.writeFile(path.join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`),
  fs.writeFile(path.join(outDir, 'resolved-graph.json'), `${JSON.stringify(graph, null, 2)}\n`),
  fs.writeFile(path.join(outDir, 'hydrate-result.json'), `${JSON.stringify(hydrateResult, null, 2)}\n`),
]);

console.log(
  JSON.stringify(
    {
      catalogDirectory,
      outDir,
      resources: index.resources.length,
      entities: graph.entities.length,
      edges: graph.edges.length,
      conflicts: graph.conflicts.length,
      externals: graph.externals.length,
      hydrate: hydrateResult,
    },
    null,
    2
  )
);
