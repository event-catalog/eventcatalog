/**
 * Astro's getCollection() warns when a collection is missing from the content store:
 * `The collection "<name>" does not exist or is empty. Please check your content config file for errors.`
 *
 * EventCatalog always defines every resource collection. A catalog that does not use a resource
 * type leaves that collection empty, and Astro repeats the warning for every getCollection() call.
 * That warning is noise. Schema failures, loader errors, and warnings for unknown collection
 * names use different messages (or a collection name outside this set) and stay visible.
 *
 * Keep this set aligned with `export const collections` in content.config.ts.
 */
export const KNOWN_EVENTCATALOG_COLLECTIONS = new Set([
  'events',
  'commands',
  'queries',
  'examples',
  'services',
  'agents',
  'adrs',
  'channels',
  'users',
  'teams',
  'domains',
  'systems',
  'flows',
  'pages',
  'changelogs',
  'containers',
  'data-products',
  'ubiquitousLanguages',
  'entities',
  'customPages',
  'resourceDocs',
  'resourceDocCategories',
  'designs',
  'diagrams',
  'schemas',
  'sidebars',
]);

const EMPTY_COLLECTION_MESSAGE =
  /^The collection ("(?:\\.|[^"\\])*") does not exist or is empty\. Please check your content config file for errors\.$/;

const ANSI_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

/** Timestamp text, then Astro's `[WARN]` label and optional `[content]` tag. */
const ASTRO_WARN_PREFIX = /^[^[\]]*\[WARN\](?:\s+\[[^\]]+\])*\s*$/;

export function collectionNameFromEmptyWarning(message) {
  const match = message.match(EMPTY_COLLECTION_MESSAGE);
  if (!match) return null;

  try {
    const name = JSON.parse(match[1]);
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

export function isIntentionalEmptyCollectionMessage(message) {
  const name = collectionNameFromEmptyWarning(message);
  return name !== null && KNOWN_EVENTCATALOG_COLLECTIONS.has(name);
}

/**
 * Matches the warning as Astro prints it: a bare message, or the node/console logger line
 * `<time> [WARN] [content] <message>`, including ANSI color on the prefix.
 * Extra diagnostic text and `[ERROR]` lines are left alone.
 */
export function isIntentionalEmptyCollectionLine(line) {
  const plain = line.replace(ANSI_PATTERN, '').replace(/\r/g, '').trim();
  const marker = 'The collection "';
  const start = plain.indexOf(marker);
  if (start === -1) return false;

  const message = plain.slice(start).trim();
  if (!isIntentionalEmptyCollectionMessage(message)) return false;

  const before = plain.slice(0, start).trim();
  return before.length === 0 || ASTRO_WARN_PREFIX.test(before);
}

export function wrapLoggerDestination(destination) {
  return {
    write(event) {
      if (
        event?.level === 'warn' &&
        event?.label === 'content' &&
        typeof event.message === 'string' &&
        isIntentionalEmptyCollectionMessage(event.message)
      ) {
        return;
      }
      destination.write(event);
    },
    flush() {
      return destination.flush?.();
    },
    close() {
      return destination.close?.();
    },
  };
}
