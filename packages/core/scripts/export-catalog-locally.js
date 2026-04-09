#!/usr/bin/env node
import { join } from 'node:path';
import { execSync } from 'node:child_process';

async function main() {
  const __dirname = import.meta.dirname;

  const args = process.argv.slice(2);
  const catalog = args[0] || 'default';

  const projectDIR = join(__dirname, `../../../examples/${catalog}`);

  execSync('pnpm run build:bin', { stdio: 'inherit' });

  execSync(`cross-env PROJECT_DIR=${projectDIR} npx . export`, {
    stdio: 'inherit',
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
