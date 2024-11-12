import { defaultExclude, defineProject } from 'vitest/config';
import tsConfigPaths from 'vite-tsconfig-paths';

export default defineProject({
  plugins: [tsConfigPaths()],
  test: {
    name: 'core',
    globals: true,
    include: ['test/**/*.{test,spec}.?(c|m)[jt]s'],
  },
});
