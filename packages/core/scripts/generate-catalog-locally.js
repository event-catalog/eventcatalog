#!/usr/bin/env node
import { getRuntimePaths } from '../eventcatalog/integrations/runtime-paths.mjs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

async function main() {
  const __dirname = import.meta.dirname;

  const args = process.argv.slice(2);
  const catalog = args[0] || 'default';

  const projectDIR = join(__dirname, `../../../examples/${catalog}`);
  const { runtimeDirectory: catalogDir } = getRuntimePaths(projectDIR);

  execSync('pnpm run build:bin', { stdio: 'inherit' });

  execSync(`cross-env NODE_ENV=development PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npx . generate`, {
    stdio: 'inherit',
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
