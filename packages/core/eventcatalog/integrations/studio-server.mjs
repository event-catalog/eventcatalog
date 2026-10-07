import { getStudioRuntime } from '../src/features/studio/server/runtime.ts';
import { isCanvasEnabled } from '../src/utils/feature.ts';

// Collaborative canvases: the collaboration WebSocket (Yjs over Hocuspocus), on the dev server's port.
// The runtime is shared with server code (e.g. MCP tools) through globalThis.
export default function studioServer() {
  return {
    name: 'eventcatalog-studio-server',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        if (!isCanvasEnabled() || !server.httpServer) return;
        getStudioRuntime().attach(server.httpServer);
        logger.info('Collaboration server ready at /_eventcatalog/studio');
      },
    },
  };
}
