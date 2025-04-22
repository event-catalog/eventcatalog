#!/usr/bin/env node
import { join } from 'node:path';
import { execSync } from 'node:child_process';

async function main() {
  const __dirname = import.meta.dirname;

  const args = process.argv.slice(2);
  const catalog = args[0] || 'default';

  const catalogDir = join(__dirname, '../packages/core/eventcatalog/');
  const projectDIR = join(__dirname, `../examples/${catalog}`);

  execSync('pnpm --filter=@eventcatalog/core run build', { stdio: 'inherit' });

  execSync(
    `cross-env NODE_ENV=development PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir}\
    pnpm exec eventcatalog generate`,
    {
      stdio: 'inherit',
      // Execute the eventcatalog binary from the examples/default/ directory
      // NOTE: The eventcatalog binary is linked through pnpm workspaces.
      cwd: projectDIR,
    }
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
