#!/usr/bin/env node
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// Runs `eventcatalog fitness check` against an example catalog, e.g. `pnpm run fitness:catalog -- --format json`
async function main() {
  const __dirname = import.meta.dirname;

  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const catalog = args[0] && !args[0].startsWith('-') ? args.shift() : 'default';

  const projectDIR = join(__dirname, `../../../examples/${catalog}`);

  execSync('pnpm --filter @eventcatalog/fitness run build', { stdio: 'inherit' });
  execSync('pnpm run build:bin', { stdio: 'inherit' });

  execSync(`cross-env PROJECT_DIR=${projectDIR} npx . fitness check ${args.join(' ')}`, { stdio: 'inherit' });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // The check's own exit code (1 when a fitness function fails) is passed on
    process.exit(err.status ?? 1);
  });
