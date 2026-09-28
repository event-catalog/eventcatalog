/**
 * Links in the architecture diagram view. Links to a resource's Diagram page (e.g. "Focus node")
 * open that diagram in the view; other links open EventCatalog in the MCP host.
 */
import {
  isArchitectureDiagramCollection,
  type ArchitectureDiagramCollection,
} from '@utils/node-graphs/architecture-diagram-types';

// /visualiser/{collection}/{id}/{version}, after any base path
const DIAGRAM_PATH = /\/visualiser\/([^/]+)\/([^/]+)\/([^/]+)\/?$/;

export type DiagramLink = { collection: ArchitectureDiagramCollection; id: string; version: string };

/** The diagram a link opens, if it is a link to a Diagram page in this EventCatalog */
export function parseDiagramLink(href: string, catalogUrl: string): DiagramLink | undefined {
  let url: URL;
  try {
    url = new URL(href, catalogUrl);
  } catch {
    return undefined;
  }
  if (url.origin !== new URL(catalogUrl).origin) return undefined;

  const match = url.pathname.match(DIAGRAM_PATH);
  if (!match || !isArchitectureDiagramCollection(match[1])) return undefined;

  const [, collection, id, version] = match.map((part) => decodeURIComponent(part));
  return { collection: collection as ArchitectureDiagramCollection, id, version };
}

// Links in a node's right-click menu that open the "Ask a question" modal for the node
const ASK_LINK_PREFIX = '#ec-mcp-ask=';

export const askLink = (nodeId: string) => `${ASK_LINK_PREFIX}${encodeURIComponent(nodeId)}`;

/** The id of the node to ask about, if the link opens the "Ask a question" modal */
export const parseAskLink = (href: string) =>
  href.startsWith(ASK_LINK_PREFIX) ? decodeURIComponent(href.slice(ASK_LINK_PREFIX.length)) : undefined;

type ContextMenuItem = { label: string; href: string; separator?: boolean; [key: string]: unknown };
type GraphNode = { id: string; data?: Record<string, any> };

/** Nodes with "Ask a question" first in their right-click menu, before the menu they already have */
export function withAskMenuItem<T extends GraphNode>(nodes: T[]): Array<T & { data: { contextMenu: ContextMenuItem[] } }> {
  return nodes.map((node) => {
    const menu: ContextMenuItem[] = node.data?.contextMenu ?? [];
    return {
      ...node,
      data: {
        ...node.data,
        contextMenu: [
          { label: 'Ask a question', href: askLink(node.id) },
          ...menu.map((item, index) => (index === 0 ? { ...item, separator: true } : item)),
        ],
      },
    };
  });
}
