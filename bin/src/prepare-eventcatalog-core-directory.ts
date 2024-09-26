import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { getPkgManager } from './get-pkg-manager';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// The project itself
const eventCatalogDir = path.join(currentDir, '../../astro');

const copyCore = (core: string) => {
  // make sure the core folder exists
  if (!fs.existsSync(core)) {
    fs.mkdirSync(core);
  }

  // Copy required eventcatlog files into users directory
  fs.cpSync(eventCatalogDir, core, { recursive: true });
};

export enum ExitCode {
  Success = 0,
  Aborted = 134,
}

export async function prepareCore(projectDir: string, coreDir: string): Promise<ExitCode> {
  if (!fs.existsSync(coreDir)) {
    console.log('Copying core folder...');
    copyCore(coreDir);
  }

  const hasNodeModules = fs.existsSync(path.join(coreDir, 'node_modules'));
  if (!hasNodeModules) {
    // Install dependencies only if it's a fresh project
    const res = await prompts({
      type: 'confirm',
      name: 'install',
      message: 'No dependencies are installed. Do you want to install them now?',
      initial: true,
    });

    if (!res.install) {
      console.log('Installation skipped. Remember to install the dependencies before using the project.');
      return ExitCode.Aborted;
    }

    const pkgMan = getPkgManager();
    execSync(`${pkgMan} install`, { cwd: coreDir, stdio: 'inherit' });
  }

  return ExitCode.Success;
}
