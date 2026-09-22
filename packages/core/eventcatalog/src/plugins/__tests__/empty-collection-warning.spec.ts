import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  KNOWN_EVENTCATALOG_COLLECTIONS,
  isIntentionalEmptyCollectionLine,
  isIntentionalEmptyCollectionMessage,
  wrapLoggerDestination,
} from '../empty-collection-warning.mjs';

type QuietLoggerEvent = {
  level?: string;
  label?: string | null;
  message?: string;
};

const emptyCollectionMessage = (name: string) =>
  `The collection "${name}" does not exist or is empty. Please check your content config file for errors.`;

const collectionNamesFromContentConfig = (source: string) => {
  const marker = 'export const collections = {';
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error('Could not find the collections export in content.config.ts');
  }

  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error('Could not find the end of the collections export');
  }

  const names: string[] = [];
  for (const line of source.slice(bodyStart + 1, end).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    const quoted = trimmed.match(/^'([^']+)'\s*:/);
    if (quoted?.[1]) {
      names.push(quoted[1]);
      continue;
    }

    const shorthand = trimmed.match(/^([A-Za-z0-9_]+)\s*,?\s*(?:\/\/.*)?$/);
    if (shorthand?.[1]) {
      names.push(shorthand[1]);
    }
  }

  return names;
};

describe('empty EventCatalog collection warnings', () => {
  it('covers every collection defined in content.config.ts', () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, '../../content.config.ts'), 'utf8');
    const defined = collectionNamesFromContentConfig(source);

    expect(defined.length).toBeGreaterThan(0);
    expect(new Set(defined)).toEqual(KNOWN_EVENTCATALOG_COLLECTIONS);
  });

  it('recognises the exact Astro getCollection warning for a known collection', () => {
    expect(isIntentionalEmptyCollectionMessage(emptyCollectionMessage('queries'))).toBe(true);
    expect(isIntentionalEmptyCollectionMessage(emptyCollectionMessage('data-products'))).toBe(true);
  });

  it('keeps the same warning when the collection is not one EventCatalog defines', () => {
    expect(isIntentionalEmptyCollectionMessage(emptyCollectionMessage('blog'))).toBe(false);
    expect(isIntentionalEmptyCollectionMessage('The collection "queries" does not exist or is empty.')).toBe(false);
  });

  it('matches Astro logger lines, including the colored [WARN] [content] prefix', () => {
    const message = emptyCollectionMessage('agents');
    const colored = `\u001b[33m\u001b[1m11:09:22\u001b[22m [WARN] [content]\u001b[39m ${message}`;

    expect(isIntentionalEmptyCollectionLine(message)).toBe(true);
    expect(isIntentionalEmptyCollectionLine(`11:09:22 [WARN] [content] ${message}`)).toBe(true);
    expect(isIntentionalEmptyCollectionLine(`11:09:22 PM [WARN] [content] ${message}`)).toBe(true);
    expect(isIntentionalEmptyCollectionLine(colored)).toBe(true);
    expect(isIntentionalEmptyCollectionLine(`11:09:22 [WARN] [build] ${message}`)).toBe(false);
    expect(isIntentionalEmptyCollectionLine(`[WARN] [router] ${message}`)).toBe(false);
  });

  it('leaves real content errors and longer diagnostics visible', () => {
    const message = emptyCollectionMessage('events');

    expect(isIntentionalEmptyCollectionLine(`11:09:22 [ERROR] [content] ${message}`)).toBe(false);
    expect(isIntentionalEmptyCollectionLine(`11:09:22 [WARN] [content] Content config not loaded`)).toBe(false);
    expect(
      isIntentionalEmptyCollectionLine(`11:09:22 [ERROR] [content] events → OrderCreated data does not match collection schema.`)
    ).toBe(false);
    expect(isIntentionalEmptyCollectionLine(`11:09:22 [WARN] [content] Failed to load events. ${message}`)).toBe(false);
    expect(isIntentionalEmptyCollectionLine(`11:09:22 [WARN] [content] ${emptyCollectionMessage('blog')}`)).toBe(false);
  });

  it('drops only the known empty-collection warning from a logger destination', () => {
    const written: QuietLoggerEvent[] = [];
    const destination = wrapLoggerDestination({
      write: (event: QuietLoggerEvent) => {
        written.push(event);
      },
    });

    destination.write({
      level: 'warn',
      label: 'content',
      message: emptyCollectionMessage('flows'),
    });
    destination.write({
      level: 'warn',
      label: 'content',
      message: 'Content config not loaded',
    });
    destination.write({
      level: 'error',
      label: 'content',
      message: emptyCollectionMessage('events'),
    });
    destination.write({
      level: 'warn',
      label: 'content',
      message: emptyCollectionMessage('blog'),
    });
    destination.write({
      level: 'warn',
      label: 'glob-loader',
      message: 'No files found matching "**/index.mdx" in directory "domains"',
    });

    expect(written).toEqual([
      { level: 'warn', label: 'content', message: 'Content config not loaded' },
      { level: 'error', label: 'content', message: emptyCollectionMessage('events') },
      { level: 'warn', label: 'content', message: emptyCollectionMessage('blog') },
      {
        level: 'warn',
        label: 'glob-loader',
        message: 'No files found matching "**/index.mdx" in directory "domains"',
      },
    ]);
  });
});
