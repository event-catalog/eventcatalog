import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

type StoreResource = {
  id: string;
};

type StoreResources<TResources> = {
  [K in keyof TResources]: StoreResource[];
};

type EventCatalogStoreFile<TResources> = {
  version: '1';
  generatedAt: string;
  resources: TResources;
};

type EventCatalogStoreOptions<TResources> = {
  storePath: string;
  resources: TResources;
};

const writeQueues = new Map<string, Promise<void>>();

export class EventCatalogStore<TResources extends StoreResources<TResources>> {
  static getStorePath(projectDir: string, name: string) {
    return path.join(projectDir, '.eventcatalog', 'store', `${name}.json`);
  }

  constructor(private options: EventCatalogStoreOptions<TResources>) {}

  async exists() {
    try {
      await access(this.options.storePath);
      return true;
    } catch {
      return false;
    }
  }

  async read(): Promise<EventCatalogStoreFile<TResources>> {
    try {
      const store = JSON.parse(await readFile(this.options.storePath, 'utf8')) as Partial<EventCatalogStoreFile<TResources>>;
      return {
        version: '1',
        generatedAt: store.generatedAt ?? new Date().toISOString(),
        resources: this.normalizeResources(store.resources),
      };
    } catch {
      return this.createEmptyStore();
    }
  }

  async writeCollection<TKey extends keyof TResources & string>(collection: TKey, resources: TResources[TKey]) {
    await this.queueWrite(async () => {
      const store = await this.read();
      store.generatedAt = new Date().toISOString();
      store.resources[collection] = [...resources].sort((a, b) => a.id.localeCompare(b.id)) as TResources[TKey];

      await this.write(store);
    });
  }

  async clearCollectionIfStoreExists<TKey extends keyof TResources & string>(collection: TKey) {
    if (!(await this.exists())) return;
    await this.writeCollection(collection, [] as unknown as TResources[TKey]);
  }

  private createEmptyStore(): EventCatalogStoreFile<TResources> {
    return {
      version: '1',
      generatedAt: new Date().toISOString(),
      resources: this.normalizeResources(),
    };
  }

  private normalizeResources(resources?: Partial<TResources>): TResources {
    const normalized = {} as TResources;

    for (const collection of Object.keys(this.options.resources) as (keyof TResources & string)[]) {
      const value = resources?.[collection];
      normalized[collection] = (
        Array.isArray(value) ? value : [...this.options.resources[collection]]
      ) as TResources[typeof collection];
    }

    return normalized;
  }

  private async write(store: EventCatalogStoreFile<TResources>) {
    await mkdir(path.dirname(this.options.storePath), { recursive: true });
    await writeFile(`${this.options.storePath}.tmp`, `${JSON.stringify(store, null, 2)}\n`);
    await rename(`${this.options.storePath}.tmp`, this.options.storePath);
  }

  private async queueWrite(write: () => Promise<void>) {
    const previousWrite = writeQueues.get(this.options.storePath) ?? Promise.resolve();
    const nextWrite = previousWrite.catch(() => undefined).then(write);

    writeQueues.set(this.options.storePath, nextWrite);
    await nextWrite;
  }
}
