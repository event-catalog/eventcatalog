import fs from 'fs';
import path from 'path';
import gm from 'gray-matter';
import { globSync } from 'glob';
import type { CollectionKey } from 'astro:content';
import { buildUrl } from '@utils/url-builder';

export type TreeNode = {
  id: string;
  name: string;
  version: string;
  href?: string;
  type: CollectionKey | null;
  children: TreeNode[];
};

/**
 * Resource types that should be in the sidenav
 */
const RESOURCE_TYPES = ['domains', 'services', 'events', 'commands', 'queries', 'flows', 'teams', 'users', 'channels'];
// const RESOURCE_TYPES = ['domains', 'services', 'events', 'commands', 'queries', 'flows', 'channels'];

/**
 * Check if the path has a RESOURCE_TYPE on path
 */
function canBeResource(dirPath: string) {
  const parts = dirPath.split(path.sep);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (RESOURCE_TYPES.includes(parts[i])) return true;
  }
  return false;
}

function isNotVersioned(dirPath: string) {
  const parts = dirPath.split(path.sep);
  return parts.every((p) => p !== 'versioned');
}

function getResourceType(filePath: string): CollectionKey | null {
  const parts = filePath.split(path.sep);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (RESOURCE_TYPES.includes(parts[i])) return parts[i] as CollectionKey;
  }
  return null;
}

function traverse(
  directory: string,
  parentNode: TreeNode,
  options: { ignore?: CollectionKey[]; basePathname: 'docs' | 'visualiser' }
) {
  let node: TreeNode | null = null;

  const resourceType = getResourceType(directory);

  const markdownFiles = globSync(path.join(directory, '/*.md'));
  const isResourceIgnored = options?.ignore && resourceType && options.ignore.includes(resourceType);

  if (markdownFiles.length > 0 && !isResourceIgnored) {
    const resourceFilePath = markdownFiles.find((md) => md.endsWith('index.md'));

    if (resourceType === 'teams' || resourceType === 'users') {
      // Teams and Users aren't nested. Just append to the parentNode.
      markdownFiles.forEach((md) => {
        const resourceDef = gm.read(md);
        parentNode.children.push({
          id: resourceDef.data.id,
          name: resourceDef.data.name,
          type: resourceType,
          version: resourceDef.data.version,
          children: [],
          href: encodeURI(buildUrl(`/${options.basePathname}/${resourceType}/${resourceDef.data.id}`)),
        });
      });
    } else if (resourceFilePath) {
      const resourceDef = gm.read(resourceFilePath);
      node = {
        id: resourceDef.data.id,
        name: resourceDef.data.name,
        type: resourceType,
        version: resourceDef.data.version,
        href: encodeURI(buildUrl(`/${options.basePathname}/${resourceType}/${resourceDef.data.id}/${resourceDef.data.version}`)),
        children: [],
      };
      parentNode.children.push(node);
    }
  }

  const directories = fs.readdirSync(directory).filter((name) => {
    const dirPath = path.join(directory, name);
    return fs.statSync(dirPath).isDirectory() && isNotVersioned(dirPath) && canBeResource(dirPath);
  });
  for (const dir of directories) {
    traverse(path.join(directory, dir), node || parentNode, options);
  }
}

function groupByType(parentNode: TreeNode) {
  const next = parentNode.children;
  const siblingTypes = new Set(parentNode.children.map((n) => n.type));
  const shouldGroup = parentNode.type === 'services' || siblingTypes.size > 1;

  if (shouldGroup) {
    const acc: Record<string, TreeNode[]> = {};
    parentNode.children.forEach((n) => {
      if (n.type === null) return; // TODO: Just ignore or remove the type null???
      if (!(n.type in acc)) acc[n.type] = [];
      acc[n.type].push(n);
    });
    parentNode.children = Object.entries(acc).map(([type, nodes]) => ({
      id: `${parentNode.id}/${type}`,
      name: type,
      type: type as CollectionKey,
      version: '0',
      children: nodes,
      isLabel: true,
    }));
  }

  // Go to next level
  next.forEach((n) => {
    if (n?.children.length === 0) return; // Leaf node
    groupByType(n);
  });
}

export function getTreeView({ projectDir, currentPath }: { projectDir: string; currentPath: string }): TreeNode {
  const basePathname = currentPath.split('/')[1] as 'docs' | 'visualiser';
  const rootNode: TreeNode = {
    id: '/',
    name: 'root',
    type: null,
    version: '0',
    children: [],
  };
  traverse(projectDir, rootNode, {
    basePathname,
    ignore: basePathname === 'visualiser' ? ['teams', 'users', 'channels'] : undefined,
  });
  groupByType(rootNode);

  // order the children by domains, services, events, commands, queries, flows, teams, users, channels
  rootNode.children.sort((a, b) => {
    return RESOURCE_TYPES.indexOf(a.type || '') - RESOURCE_TYPES.indexOf(b.type || '');
  });

  return rootNode;
}
