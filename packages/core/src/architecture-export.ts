import fs from 'node:fs';
import path from 'node:path';
import { writeHtml } from '@eventcatalog/exporters';

/** The part of eventcatalog.config.js that controls the architecture reference. */
export interface ArchitectureExportConfig {
  exports?: {
    html?: {
      enabled?: boolean;
    };
  };
}

/**
 * Auth is on only when it is configured, the auth file exists and the catalog runs as a server, the same rule the
 * catalog uses at runtime. New catalogs ship a commented-out eventcatalog.auth.js, so the file alone means nothing.
 */
export const isCatalogAuthEnabled = ({
  config,
  projectDir,
  isServer,
}: {
  config: { auth?: { enabled?: boolean } } | null | undefined;
  projectDir: string;
  isServer: boolean;
}) => Boolean(config?.auth?.enabled) && isServer && fs.existsSync(path.join(projectDir, 'eventcatalog.auth.js'));

export type ArchitectureExportDecision = { enabled: true } | { enabled: false; reason: 'disabled' | 'auth' };

/**
 * The architecture reference is written on every build unless the catalog turns it off. Catalogs with auth only
 * get it when they opt in: build output is served as static files, outside the auth middleware.
 */
export const resolveArchitectureExport = (
  config: ArchitectureExportConfig | null | undefined,
  { authEnabled }: { authEnabled: boolean }
): ArchitectureExportDecision => {
  const enabled = config?.exports?.html?.enabled;
  if (enabled === false) return { enabled: false, reason: 'disabled' };
  if (authEnabled && enabled !== true) return { enabled: false, reason: 'auth' };
  return { enabled: true };
};

/** Server builds serve static files from the client folder; static builds from the output folder itself. */
export const getArchitectureExportPath = ({ outDir, isServer }: { outDir: string; isServer: boolean }) =>
  path.join(outDir, isServer ? 'client' : '', 'architecture.html');

export const writeArchitectureExport = ({
  projectDir,
  outDir,
  isServer,
}: {
  projectDir: string;
  outDir: string;
  isServer: boolean;
}) =>
  writeHtml({
    dir: projectDir,
    outputPath: getArchitectureExportPath({ outDir, isServer }),
    regenerateCommand: 'npx eventcatalog build',
  });
