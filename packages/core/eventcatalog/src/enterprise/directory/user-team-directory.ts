import type { Loader } from 'astro/loaders';
import pc from 'picocolors';
import { isEventCatalogScaleEnabled } from '../feature';
import { EventCatalogStore } from '../../stores/eventcatalog-store';
import { globWithSafeWatcher, type GlobOptions } from '../../utils/collections/glob-loader';

const colors = pc.createColors(true);

type UserTeamCollection = 'users' | 'teams';

type DirectoryEntry = {
  id: string;
  markdown?: string;
  readOnly?: boolean;
  source?: {
    provider?: string;
    url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type DirectorySource = {
  type: 'directory';
  name: string;
  loadUsers?: () => Promise<DirectoryEntry[]>;
  loadTeams?: () => Promise<DirectoryEntry[]>;
};

type DirectoryConflictStrategy = 'local-wins' | 'source-wins' | 'error';

type UserTeamDirectoryLoaderOptions = {
  collection: UserTeamCollection;
  local: GlobOptions;
  sources?: DirectorySource[];
  conflictStrategy?: DirectoryConflictStrategy;
  storePath?: string | false;
};

type DirectoryStoreResource = DirectoryEntry & {
  id: string;
  markdown: string;
  readOnly: true;
  source: NonNullable<DirectoryEntry['source']> & {
    provider: string;
  };
};

type DirectoryStoreResources = {
  users: DirectoryStoreResource[];
  teams: DirectoryStoreResource[];
};

export const userTeamDirectoryLoader = ({
  collection,
  local,
  sources = [],
  conflictStrategy = 'local-wins',
  storePath,
}: UserTeamDirectoryLoaderOptions): Loader => {
  const localLoader = globWithSafeWatcher(local);
  const directoryStore = createDirectoryStore({ base: local.base, storePath });

  return {
    name: `eventcatalog-${collection}-directory-loader`,
    load: async (context) => {
      await localLoader.load(context);

      if (sources.length === 0) {
        await directoryStore?.clearCollectionIfStoreExists(collection);
        return;
      }

      if (!isEventCatalogScaleEnabled()) {
        throw new Error('Directory sources require EventCatalog Scale.');
      }

      const loadEntries = collection === 'users' ? 'loadUsers' : 'loadTeams';
      const syncedDirectoryStoreResources = new Map<string, DirectoryStoreResource>();

      for (const source of sources) {
        logDirectoryInfo(`Loading ${collection} from directory source "${source.name}"`);
        const entries = await loadSourceEntries({ source, loadEntries });
        let syncedEntries = 0;
        let skippedEntries = 0;

        for (const entry of entries) {
          if (context.store.has(entry.id)) {
            if (conflictStrategy === 'local-wins') {
              skippedEntries += 1;
              continue;
            }
            if (conflictStrategy === 'error') {
              throw new Error(`Directory source "${source.name}" returned duplicate ${collection} id "${entry.id}".`);
            }
          }

          const { markdown, ...entryData } = entry;
          const data = {
            ...withDirectoryEntrySource(entryData, source),
            id: entry.id,
            readOnly: true,
          };
          const body = markdown ?? '';
          const rendered = body ? await context.renderMarkdown(body) : undefined;
          const parsedData = await context.parseData({
            id: entry.id,
            data,
          });
          syncedDirectoryStoreResources.set(entry.id, {
            ...data,
            markdown: body,
            readOnly: true,
          });

          context.store.set({
            id: entry.id,
            data: parsedData,
            body,
            digest: context.generateDigest({ ...data, body }),
            rendered,
          });
          syncedEntries += 1;
        }

        logDirectoryInfo(
          `Synced ${syncedEntries} ${collection} from directory source "${source.name}"${
            skippedEntries > 0 ? ` (${skippedEntries} skipped due to local conflicts)` : ''
          }`
        );
      }

      await directoryStore?.writeCollection(collection, Array.from(syncedDirectoryStoreResources.values()));
    },
  };
};

const loadSourceEntries = async ({
  source,
  loadEntries,
}: {
  source: DirectorySource;
  loadEntries: 'loadUsers' | 'loadTeams';
}) => {
  return (await source[loadEntries]?.()) ?? [];
};

const getSourceProvider = (source: DirectorySource) => source.name.split(':')[0] || source.name;

const withDirectoryEntrySource = (entryData: Omit<DirectoryEntry, 'markdown'>, source: DirectorySource) => {
  const entrySource = entryData.source as DirectoryEntry['source'] | undefined;
  const provider = entrySource?.provider ?? getSourceProvider(source);
  const sourceData = {
    ...entrySource,
    provider,
  };

  return {
    ...entryData,
    source: sourceData,
  };
};

const getDirectoryStorePath = (base: GlobOptions['base']) => {
  if (!base || typeof base !== 'string') return undefined;
  return EventCatalogStore.getStorePath(base, 'directory');
};

const createDirectoryStore = ({ base, storePath }: { base: GlobOptions['base']; storePath?: string | false }) => {
  if (storePath === false) return undefined;

  const resolvedStorePath = storePath ?? getDirectoryStorePath(base);
  if (!resolvedStorePath) return undefined;

  return new EventCatalogStore<DirectoryStoreResources>({
    storePath: resolvedStorePath,
    resources: {
      users: [],
      teams: [],
    },
  });
};

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
};

const logDirectoryInfo = (message: string) => {
  console.log(`${colors.dim(getTimestamp())} ${colors.blue('[directory]')} ${message}`);
};
