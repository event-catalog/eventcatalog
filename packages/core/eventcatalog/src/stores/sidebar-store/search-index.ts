import type { NavigationData, NavNode } from './builders/shared';

const MESSAGE_NODE_PREFIXES = ['event:', 'command:', 'query:'];

export const getSearchIndexNodeEntries = (nodes: NavigationData['nodes']): [string, NavNode | string][] => {
  const currentMessageTargets = new Set(
    Object.entries(nodes).flatMap(([key, node]) => {
      const isMessageAlias = MESSAGE_NODE_PREFIXES.some((prefix) => key.startsWith(prefix));
      return typeof node === 'string' && isMessageAlias && node.startsWith(`${key}:`) ? [node] : [];
    })
  );

  return Object.entries(nodes).filter(([key]) => {
    const isMessageNode = MESSAGE_NODE_PREFIXES.some((prefix) => key.startsWith(prefix));
    return !isMessageNode || currentMessageTargets.has(key);
  });
};
