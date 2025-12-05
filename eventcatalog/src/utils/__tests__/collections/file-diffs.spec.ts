import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDiffsForCurrentAndPreviousVersion } from '@utils/file-diffs';
import { join } from 'node:path';

const pathToTestCatalog = join(__dirname, 'fake-catalog');

describe('Diff Utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getDiffsForCurrentAndPreviousVersion', () => {
    it('should return empty array if no diffs found', async () => {
      const result = await getDiffsForCurrentAndPreviousVersion('1.0.0', '0.9.0', 'collection1', []);
      expect(result).toEqual([]);
    });

    it('when two collections have the same file and the extension matches .json the diff is returned', async () => {
      // add data object to these
      const allEvents = [
        {
          data: { id: 'myevent', version: '1.0.0' },
          filePath: join(pathToTestCatalog, 'events', 'OrderAmended', 'index.mdx'),
        },
        {
          data: {
            id: 'myevent',
            version: '0.9.0',
          },
          filePath: join(pathToTestCatalog, 'events', 'OrderAmended', 'versioned', '0.0.1', 'index.mdx'),
        },
      ];
      const currentEvent = allEvents[0];
      const previousEvent = allEvents[1];

      const diffs = (await getDiffsForCurrentAndPreviousVersion(
        currentEvent.data.version,
        previousEvent.data.version,
        'myevent',
        // @ts-ignore
        allEvents
      )) as string[];

      expect(diffs).toHaveLength(2);
      // header of the output
      expect(diffs[1]).toContain('<span class="d2h-file-name">schema.json</span>');
      expect(diffs[1]).toContain('CHANGED');
    });

    it('when two collections have the same file and the extension matches .yaml the diff is returned', async () => {
      // add data object to these
      const allEvents = [
        {
          data: { id: 'myevent', version: '1.0.0' },
          filePath: join(pathToTestCatalog, 'events', 'OrderAmended', 'index.mdx'),
        },
        {
          data: {
            id: 'myevent',
            version: '0.9.0',
          },
          filePath: join(pathToTestCatalog, 'events', 'OrderAmended', 'versioned', '0.0.1', 'index.mdx'),
        },
      ];
      const currentEvent = allEvents[0];
      const previousEvent = allEvents[1];

      const diffs = (await getDiffsForCurrentAndPreviousVersion(
        currentEvent.data.version,
        previousEvent.data.version,
        'myevent',
        // @ts-ignore
        allEvents
      )) as string[];

      expect(diffs).toHaveLength(2);
      // header of the output
      expect(diffs[0]).toContain('<span class="d2h-file-name">asyncapi.yml</span>');
      expect(diffs[0]).toContain('CHANGED');
    });

    it('when two collections have the same file and the file has no changes, no diff is returned for this file', async () => {
      // add data object to these
      const allEvents = [
        {
          data: { id: 'myevent', version: '1.0.0' },
          filePath: join(pathToTestCatalog, 'events', 'OrderAmended', 'index.mdx'),
        },
        {
          data: {
            id: 'myevent',
            version: '0.9.0',
          },
          filePath: join(pathToTestCatalog, 'events', 'OrderAmended', 'versioned', '0.0.1', 'index.mdx'),
        },
      ];
      const currentEvent = allEvents[0];
      const previousEvent = allEvents[1];

      const diffs = (await getDiffsForCurrentAndPreviousVersion(
        currentEvent.data.version,
        previousEvent.data.version,
        'myevent',
        // @ts-ignore
        allEvents
      )) as string[];

      // 3 files are checked the schema-unchanged is not returned.
      expect(diffs).toHaveLength(2);
      expect(diffs[0]).toContain('<span class="d2h-file-name">asyncapi.yml</span>');
      expect(diffs[1]).toContain('<span class="d2h-file-name">schema.json</span>');
    });
  });
});
