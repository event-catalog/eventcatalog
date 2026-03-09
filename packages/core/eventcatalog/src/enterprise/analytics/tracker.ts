export type EventProperties = Record<string, string | number | boolean>;

export interface AnalyticsAdapter {
  name: string;
  track(event: string, properties?: EventProperties): void;
  pageView(url: string, properties?: EventProperties): void;
}

export class AnalyticsManager {
  private adapters: AnalyticsAdapter[] = [];
  private debug: boolean;

  constructor(options?: { debug?: boolean }) {
    this.debug = options?.debug ?? false;
  }

  register(adapter: AnalyticsAdapter) {
    this.adapters.push(adapter);
    if (this.debug) {
      console.log(`[EventCatalog Analytics] Registered adapter: ${adapter.name}`);
    }
  }

  track(event: string, properties?: EventProperties) {
    if (this.debug) {
      console.log(`[EventCatalog Analytics] track: ${event}`, properties);
    }
    for (const adapter of this.adapters) {
      try {
        adapter.track(event, properties);
      } catch (e) {
        // Silently fail — analytics should never break the app
      }
    }
  }

  pageView(url: string, properties?: EventProperties) {
    if (this.debug) {
      console.log(`[EventCatalog Analytics] pageView: ${url}`, properties);
    }
    for (const adapter of this.adapters) {
      try {
        adapter.pageView(url, properties);
      } catch (e) {
        // Silently fail
      }
    }
  }
}

const COLLECTION_TYPE_MAP: Record<string, string> = {
  services: 'service',
  events: 'event',
  commands: 'command',
  queries: 'query',
  domains: 'domain',
  flows: 'flow',
  channels: 'channel',
  entities: 'entity',
};

const SECTION_PATTERNS: [RegExp, string][] = [
  [/^\/visualiser/, 'visualiser'],
  [/^\/discover/, 'discover'],
  [/^\/directory/, 'directory'],
  [/^\/schemas/, 'schemas'],
  [/^\/docs\/custom/, 'custom-docs'],
  [/^\/docs/, 'docs'],
  [/^\/$/, 'home'],
];

export function extractPageProperties(url: string): EventProperties {
  const properties: EventProperties = { url };

  // Determine section
  for (const [pattern, section] of SECTION_PATTERNS) {
    if (pattern.test(url)) {
      properties.section = section;
      break;
    }
  }

  if (!properties.section) {
    properties.section = 'other';
  }

  // Extract resource info from URL patterns like:
  // /docs/services/OrderService/1.0.0
  // /visualiser/services/OrderService/1.0.0
  // /discover/events
  const parts = url.split('/').filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const collectionType = COLLECTION_TYPE_MAP[parts[i]];
    if (collectionType) {
      properties.resource_type = collectionType;
      if (parts[i + 1]) {
        properties.resource_id = decodeURIComponent(parts[i + 1]);
      }
      if (parts[i + 2]) {
        properties.resource_version = parts[i + 2];
      }
      break;
    }
  }

  return properties;
}
