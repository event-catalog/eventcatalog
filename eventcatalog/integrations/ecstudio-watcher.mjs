export default function ecstudioWatcher() {
  return {
    name: 'ecstudio-watcher',
    hooks: {
      'astro:server:setup': ({ server, refreshContent }) => {
        // Only set up dynamic watching in development mode
        if (server.config.mode !== 'development') {
          return;
        }

        // Get the project root directory - server.config.root is already a string path
        const rootDir = server.config.root;
        const isEcstudioFile = (path) => path.endsWith('.ecstudio') && !path.includes('public/generated') && !path.includes('public\\generated');
        
        // Set up chokidar to watch for new .ecstudio files
        server.watcher
          .on('add', async (path) => {
            if (isEcstudioFile(path)) {
              console.log(`New .ecstudio file detected: ${path}`);
              
              // Add the new file to the watcher and refresh content
              server.watcher.add(path);
              
              if (refreshContent) {
                try {
                  await refreshContent();
                  console.log('Content refreshed after adding new .ecstudio file');
                } catch (error) {
                  console.error('Error refreshing content:', error);
                }
              }
            }
          })
          .on('unlink', async (path) => {
            if (isEcstudioFile(path)) {
              console.log(`Removed .ecstudio file: ${path}`);
              
              if (refreshContent) {
                try {
                  await refreshContent();
                  console.log('Content refreshed after removing .ecstudio file');
                } catch (error) {
                  console.error('Error refreshing content:', error);
                }
              }
            }
          })
          .on('change', async (path) => {
            if (isEcstudioFile(path)) {
              console.log(`Changed .ecstudio file: ${path}`);
              await refreshContent();
            }
          });

        // Also add the root directory to watch for new files
        server.watcher.add(rootDir);
        
        console.log('Set up dynamic .ecstudio file watcher with content refresh');
      },
    },
  };
}