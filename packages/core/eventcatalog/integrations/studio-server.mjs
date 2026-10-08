import { getStudioRuntime } from '../src/features/studio/server/runtime.ts';
import { isDatabaseTooNew } from '../src/features/storage/migrations.ts';
import config from '../src/utils/eventcatalog-config/source.ts';
import { isCanvasEnabled } from '../src/utils/feature.ts';

// Collaborative canvases: the collaboration WebSocket (Yjs over Hocuspocus), on the dev server's port.
// The runtime is shared with server code (e.g. MCP tools) through globalThis.
export default function studioServer() {
  return {
    name: 'eventcatalog-studio-server',
    hooks: {
      'astro:server:setup': async ({ server, logger }) => {
        if (!isCanvasEnabled() || !server.httpServer) return;
        const runtime = getStudioRuntime();
        const projectDirectory = process.env.PROJECT_DIR || process.cwd();
        // Canvases are loaded from storage before anyone can open one
        try {
          await runtime.useStorage(config.storage, projectDirectory);
        } catch (error) {
          // Not kept in memory instead (changes would quietly stop being saved): Studio's pages say why
          if (isDatabaseTooNew(error)) return logger.error(`Studio isn't available: ${error.message}`);
          logger.error(`Could not use the Studio storage configured, keeping canvases in memory: ${error.message}`);
          await runtime.useStorage({ type: 'memory' }, projectDirectory);
        }
        runtime.attach(server.httpServer);
        const { type, location } = runtime.storage;
        const kept = type === 'memory' ? 'kept in memory until the server restarts' : `stored in ${location}`;
        logger.info(`Collaboration server ready at /_eventcatalog/studio (canvases ${kept})`);
      },
    },
  };
}
