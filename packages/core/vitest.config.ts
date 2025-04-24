import { defaultExclude, defineProject } from 'vitest/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineProject({
  plugins: [tsConfigPaths()],
  test: {
    globals: true,
    exclude: [...defaultExclude, 'e2e/**', 'eventcatalog/**'],
  },
});
