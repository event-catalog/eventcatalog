import { detect } from 'package-manager-detector';

export const getPackageExecutor = async (): Promise<string> => {
  if (process.env.EVENTCATALOG_PACKAGE_EXECUTOR) {
    return process.env.EVENTCATALOG_PACKAGE_EXECUTOR;
  }

  const pm = await detect();
  const executors: Record<string, string> = {
    npm: 'npx',
    yarn: 'yarn dlx',
    pnpm: 'pnpm dlx',
    bun: 'bunx',
  };

  return executors[pm?.name || 'npm'] || 'npx';
};
