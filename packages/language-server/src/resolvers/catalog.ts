import {
  isCatalogPath,
  type SpecMessage,
  type SpecChannel,
  type SpecService,
  type SpecOperation,
  type ResourceType,
  type ResolveError,
} from "./types.js";

// All Node.js imports are lazy to avoid breaking browser builds.
// The functions in this module are only called in Node.js contexts
// (VSCode LSP, CLI) — never in the browser playground.
type SdkFactory = (dir: string) => Record<string, any>;
let _sdk: SdkFactory | undefined;

async function getSdk(): Promise<SdkFactory> {
  if (!_sdk) {
    const mod = await import("@eventcatalog/sdk");
    _sdk = mod.default as unknown as SdkFactory;
  }
  return _sdk;
}

const MESSAGE_SDK_METHODS: Record<string, string> = {
  events: "getEvents",
  commands: "getCommands",
  queries: "getQueries",
  containers: "getDataStores",
};

export interface CatalogResolveResult {
  messages: Map<string, SpecMessage>;
  errors: ResolveError[];
}

export interface CatalogChannelResolveResult {
  channels: Map<string, SpecChannel>;
  errors: ResolveError[];
}

export interface CatalogServiceResolveResult {
  services: Map<string, SpecService>;
  errors: ResolveError[];
}

export { isCatalogPath } from "./types.js";

async function validateCatalogDir(
  catalogDir: string,
): Promise<ResolveError | null> {
  try {
    const { statSync } = await import("node:fs");
    if (!statSync(catalogDir).isDirectory()) {
      return {
        message: `Catalog directory not found: "${catalogDir}"`,
        line: 1,
        column: 1,
      };
    }
    return null;
  } catch {
    return {
      message: `Catalog directory not found: "${catalogDir}"`,
      line: 1,
      column: 1,
    };
  }
}

// ─── TTL cache ───────────────────────────────────────────
// Catalogs can be large. We cache SDK results for a short TTL so that
// multiple import lines pointing at the same catalog (or rapid completion
// keystrokes) don't each trigger a full filesystem scan.

const CACHE_TTL_MS = 5_000; // 5 seconds
const CACHE_MAX_SIZE = 50; // max entries per cache map

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const resourceCache = new Map<string, CacheEntry<CatalogResolveResult>>();
const channelCache = new Map<string, CacheEntry<CatalogChannelResolveResult>>();
const serviceCache = new Map<string, CacheEntry<CatalogServiceResolveResult>>();

function getCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
): void {
  if (cache.size >= CACHE_MAX_SIZE) {
    // Evict oldest entry
    let oldestKey: string | undefined;
    let oldestTs = Infinity;
    for (const [k, v] of cache) {
      if (v.ts < oldestTs) {
        oldestTs = v.ts;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { data, ts: Date.now() });
}

/** Clear all catalog caches. Useful when the catalog directory changes. */
export function clearCatalogCache(): void {
  resourceCache.clear();
  channelCache.clear();
  serviceCache.clear();
}

// ─── Public API ──────────────────────────────────────────

/**
 * Scan an EventCatalog directory and return all resources of a given type as SpecMessages.
 * Works for events, commands, and queries.
 * Results are cached for CACHE_TTL_MS to avoid redundant filesystem scans.
 */
export async function parseCatalogResources(
  catalogDir: string,
  resourceType: ResourceType,
): Promise<CatalogResolveResult> {
  const cacheKey = `${catalogDir}::${resourceType}`;
  const cached = getCached(resourceCache, cacheKey);
  if (cached) return cached;

  const errors: ResolveError[] = [];

  const dirError = await validateCatalogDir(catalogDir);
  if (dirError) return { messages: new Map(), errors: [dirError] };

  const sdkMethodName = MESSAGE_SDK_METHODS[resourceType];
  if (!sdkMethodName) {
    errors.push({
      message: `Catalog imports do not support resource type "${resourceType}" yet.`,
      line: 1,
      column: 1,
    });
    return { messages: new Map(), errors };
  }

  try {
    const sdkFactory = await getSdk();
    const catalog = sdkFactory(catalogDir);
    const resources: any[] = await catalog[sdkMethodName]({
      latestOnly: true,
    });

    const messages = new Map<string, SpecMessage>();
    for (const resource of resources) {
      if (!resource.id) continue;
      messages.set(resource.id, {
        name: resource.id,
        displayName: resource.name !== resource.id ? resource.name : undefined,
        version: resource.version,
        summary: resource.summary,
      });
    }

    const result: CatalogResolveResult = { messages, errors };
    setCached(resourceCache, cacheKey, result);
    return result;
  } catch (err) {
    errors.push({
      message: `Failed to read catalog at "${catalogDir}": ${String(err)}`,
      line: 1,
      column: 1,
    });
    return { messages: new Map(), errors };
  }
}

/**
 * Scan an EventCatalog directory and return all channels as SpecChannels.
 * Results are cached for CACHE_TTL_MS to avoid redundant filesystem scans.
 */
export async function parseCatalogChannels(
  catalogDir: string,
): Promise<CatalogChannelResolveResult> {
  const cached = getCached(channelCache, catalogDir);
  if (cached) return cached;

  const errors: ResolveError[] = [];

  const dirError = await validateCatalogDir(catalogDir);
  if (dirError) return { channels: new Map(), errors: [dirError] };

  try {
    const sdkFactory = await getSdk();
    const catalog = sdkFactory(catalogDir);
    const rawChannels: any[] = await catalog.getChannels({
      latestOnly: true,
    });

    const channels = new Map<string, SpecChannel>();
    for (const ch of rawChannels) {
      if (!ch.id) continue;
      channels.set(ch.id, {
        name: ch.id,
        displayName: ch.name !== ch.id ? ch.name : undefined,
        version: ch.version,
        summary: ch.summary,
        address: ch.address,
        protocol: Array.isArray(ch.protocols) ? ch.protocols[0] : undefined,
      });
    }

    const result: CatalogChannelResolveResult = { channels, errors };
    setCached(channelCache, catalogDir, result);
    return result;
  } catch (err) {
    errors.push({
      message: `Failed to read catalog channels at "${catalogDir}": ${String(err)}`,
      line: 1,
      column: 1,
    });
    return { channels: new Map(), errors };
  }
}

/**
 * Build a lookup map from message id to its type ("event", "command", or "query")
 * by scanning all three message collections once. This is much more reliable than
 * guessing — the SDK scans the correct directories for each type.
 */
interface MessageInfo {
  type: string;
  summary?: string;
  version?: string;
}

async function buildMessageInfoMap(
  catalog: Record<string, any>,
): Promise<Map<string, MessageInfo>> {
  const infoMap = new Map<string, MessageInfo>();

  const safe = (p: Promise<any>) =>
    p.then((r: any) => (Array.isArray(r) ? r : [])).catch(() => []);

  const [events, commands, queries] = await Promise.all([
    safe(catalog.getEvents({ latestOnly: true })),
    safe(catalog.getCommands({ latestOnly: true })),
    safe(catalog.getQueries({ latestOnly: true })),
  ]);

  for (const e of events)
    if (e.id)
      infoMap.set(e.id, {
        type: "event",
        summary: e.summary,
        version: e.version,
      });
  for (const c of commands)
    if (c.id)
      infoMap.set(c.id, {
        type: "command",
        summary: c.summary,
        version: c.version,
      });
  for (const q of queries)
    if (q.id)
      infoMap.set(q.id, {
        type: "query",
        summary: q.summary,
        version: q.version,
      });

  return infoMap;
}

/**
 * Scan an EventCatalog directory and return services as SpecServices.
 * Each service includes its sends/receives operations so a full service block can be generated.
 * Results are cached for CACHE_TTL_MS to avoid redundant filesystem scans.
 */
export async function parseCatalogServices(
  catalogDir: string,
): Promise<CatalogServiceResolveResult> {
  const cached = getCached(serviceCache, catalogDir);
  if (cached) return cached;

  const errors: ResolveError[] = [];

  const dirError = await validateCatalogDir(catalogDir);
  if (dirError) return { services: new Map(), errors: [dirError] };

  try {
    const sdkFactory = await getSdk();
    const catalog = sdkFactory(catalogDir);

    // Build an info map once by scanning all message collections
    const messageInfoMap = await buildMessageInfoMap(catalog);

    const rawServices: any[] = await catalog.getServices({
      latestOnly: true,
    });

    const services = new Map<string, SpecService>();
    for (const svc of rawServices) {
      if (!svc.id) continue;

      const operations: SpecOperation[] = [];
      const messages: SpecMessage[] = [];

      // Process sends pointers
      if (Array.isArray(svc.sends)) {
        for (const pointer of svc.sends) {
          const info = messageInfoMap.get(pointer.id);
          const msgType = info?.type || "event";
          operations.push({
            action: "send",
            channelName: "",
            messageName: pointer.id,
            messageType: msgType as "event" | "command" | "query",
          });
          messages.push({
            name: pointer.id,
            version: pointer.version || info?.version,
            summary: info?.summary,
          });
        }
      }

      // Process receives pointers
      if (Array.isArray(svc.receives)) {
        for (const pointer of svc.receives) {
          const info = messageInfoMap.get(pointer.id);
          const msgType = info?.type || "event";
          operations.push({
            action: "receive",
            channelName: "",
            messageName: pointer.id,
            messageType: msgType as "event" | "command" | "query",
          });
          messages.push({
            name: pointer.id,
            version: pointer.version || info?.version,
            summary: info?.summary,
          });
        }
      }

      services.set(svc.id, {
        name: svc.id,
        version: svc.version,
        summary: svc.summary,
        operations,
        channels: [],
        messages,
      });
    }

    const result: CatalogServiceResolveResult = { services, errors };
    setCached(serviceCache, catalogDir, result);
    return result;
  } catch (err) {
    errors.push({
      message: `Failed to read catalog services at "${catalogDir}": ${String(err)}`,
      line: 1,
      column: 1,
    });
    return { services: new Map(), errors };
  }
}
