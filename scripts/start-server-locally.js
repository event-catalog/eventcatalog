#!/usr/bin/env node
import { join } from 'node:path';
import { execSync } from 'node:child_process';

async function main() {
  const __dirname = import.meta.dirname;

  const args = process.argv.slice(2);
  const catalog = args[0] || 'default';

  const catalogDir = join(__dirname, '../eventcatalog/');
  const projectDIR = join(__dirname, `../examples/${catalog}`);

  // execSync('pnpm run build:bin', { stdio: 'inherit' });

  execSync('pnpm run verify-build:catalog', { stdio: 'inherit' });

  execSync(`cross-env NODE_ENV=development PROJECT_DIR=${projectDIR} CATALOG_DIR=${catalogDir} npx . start`, {
    stdio: 'inherit',
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
