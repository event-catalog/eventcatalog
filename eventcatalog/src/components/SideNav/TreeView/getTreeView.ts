import fs from 'fs';
import path from 'path';
import os from 'node:os';
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
const RESOURCE_TYPES = ['domains', 'entities', 'services', 'events', 'commands', 'queries', 'flows', 'channels', 'containers'];
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

function buildTreeOfDir(directory: string, parentNode: TreeNode, options: { ignore?: CollectionKey[] }) {
  let node: TreeNode | null = null;

  const resourceType = getResourceType(directory);

  const markdownFiles = globSync(path.join(directory, '/*.mdx'), { windowsPathsNoEscape: os.platform() === 'win32' });
  const isResourceIgnored = options?.ignore && resourceType && options.ignore.includes(resourceType);

  if (markdownFiles.length > 0 && !isResourceIgnored) {
    const resourceFilePath = markdownFiles.find((md) => md.endsWith('index.mdx'));
    if (resourceFilePath) {
      const resourceDef = gm.read(resourceFilePath);
      node = {
        id: resourceDef.data.id,
        name: resourceDef.data.name,
        type: resourceType,
        version: resourceDef.data.version,
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
    buildTreeOfDir(path.join(directory, dir), node || parentNode, options);
  }
}

function forEachTreeNodeOf(node: TreeNode, ...callbacks: Array<(node: TreeNode) => void>) {
  const next = node.children;

  callbacks.forEach((cb) => cb(node));

  // Go to next level
  next.forEach((n) => {
    forEachTreeNodeOf(n, ...callbacks);
  });
}

function addHrefToNode(basePathname: 'docs' | 'visualiser') {
  return (node: TreeNode) => {
    node.href = encodeURI(
      buildUrl(
        `/${basePathname}/${node.type}/${node.id}${node.type === 'teams' || node.type === 'users' ? '' : `/${node.version}`}`
      )
    );
  };
}

function orderChildrenByName(parentNode: TreeNode) {
  parentNode.children.sort((a, b) => a.name.localeCompare(b.name));
}

function groupChildrenByType(parentNode: TreeNode) {
  if (parentNode.children.length === 0) return; // Only group if there are children

  const acc: Record<string, TreeNode[]> = {};

  // Flows and messages are collapsed by default

  parentNode.children.forEach((n) => {
    if (n.type === null) return; // TODO: Just ignore or remove the type null???
    if (!(n.type in acc)) acc[n.type] = [];
    acc[n.type].push(n);
  });

  // Collapse everything except domains
  const AUTO_EXPANDED_TYPES = ['domains'];

  parentNode.children = Object.entries(acc)
    // Order label nodes by RESOURCE_TYPES
    .sort(([aType], [bType]) => RESOURCE_TYPES.indexOf(aType) - RESOURCE_TYPES.indexOf(bType))
    // Construct the label nodes
    .map(([type, nodes]) => {
      return {
        id: `${parentNode.id}/${type}`,
        name: type === 'containers' ? 'Data' : type,
        type: type as CollectionKey,
        version: '0',
        children: nodes,
        isExpanded: AUTO_EXPANDED_TYPES.includes(type),
        isLabel: true,
      };
    });
}

const treeViewCache = new Map<string, TreeNode>();

export function getTreeView({ projectDir, currentPath }: { projectDir: string; currentPath: string }): TreeNode {
  const basePathname = currentPath.split('/').find((p) => p === 'docs' || p === 'visualiser') || 'docs';

  const cacheKey = `${projectDir}:${basePathname}`;
  if (treeViewCache.has(cacheKey)) return treeViewCache.get(cacheKey)!;

  const rootNode: TreeNode = {
    id: '/',
    name: 'root',
    type: null,
    version: '0',
    children: [],
  };

  buildTreeOfDir(projectDir, rootNode, {
    ignore: basePathname === 'visualiser' ? ['teams', 'users', 'channels'] : undefined,
  });

  // prettier-ignore
  forEachTreeNodeOf(
    rootNode,
    addHrefToNode(basePathname),
    orderChildrenByName,
    groupChildrenByType,
  );

  if (basePathname === 'visualiser') {
    rootNode.children.unshift({
      id: '/bounded-context-map',
      name: 'bounded context map',
      type: 'bounded-context-map' as any,
      version: '0',
      isLabel: true,
      children: [
        {
          id: '/domain-map',
          name: 'Domain map',
          href: buildUrl('/visualiser/context-map'),
          type: 'bounded-context-map' as any,
          version: '',
          children: [],
        },
      ],
    } as TreeNode);
  }

  // Store in cache before returning
  treeViewCache.set(cacheKey, rootNode);

  return rootNode;
}
