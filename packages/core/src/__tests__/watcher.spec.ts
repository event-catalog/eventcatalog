import { expect, describe, it, beforeEach, vi } from 'vitest';
import { watch } from '../watcher';

const { subscribe } = vi.hoisted(() => ({
  subscribe: vi.fn().mockResolvedValue({ unsubscribe: vi.fn() }),
}));

vi.mock('@parcel/watcher', () => ({
  default: { subscribe },
}));

describe('watcher', () => {
  beforeEach(() => {
    subscribe.mockClear();
  });

  describe('watch', () => {
    it('builds a forward-slash ignore glob from Windows-style paths', async () => {
      // Backslash paths interpolated into the glob compile to invalid regex
      // escapes (e.g. `\x...`) in @parcel/watcher's native matcher, crashing
      // `dev` on startup with regex_error(error_escape).
      const projectDir = 'C:\\Users\\bob\\source\\xyz-communications\\xyz-catalog';
      const catalogDir = `${projectDir}\\node_modules\\@eventcatalog\\core`;

      await watch(projectDir, catalogDir);

      const options = subscribe.mock.calls[0][2];
      expect(options.ignore).toEqual([
        '**/C:/Users/bob/source/xyz-communications/xyz-catalog/node_modules/@eventcatalog/core/!(C:/Users/bob/source/xyz-communications/xyz-catalog)**',
      ]);
    });

    it('leaves posix paths unchanged in the ignore glob', async () => {
      const projectDir = '/Users/bob/source/my-catalog';
      const catalogDir = `${projectDir}/node_modules/@eventcatalog/core`;

      await watch(projectDir, catalogDir);

      const options = subscribe.mock.calls[0][2];
      expect(options.ignore).toEqual([
        '**//Users/bob/source/my-catalog/node_modules/@eventcatalog/core/!(/Users/bob/source/my-catalog)**',
      ]);
    });

    it('notifies the search indexer when a catalog resource changes', async () => {
      const onChange = vi.fn();
      const unsubscribe = await watch('/catalog', '/catalog/.astro/eventcatalog', onChange);
      const events = [{ path: '/catalog/events/OrderPlaced/schema.json', type: 'update' }];

      subscribe.mock.calls[0][1](null, events);

      expect(onChange).toHaveBeenCalledWith(null, events);
      await unsubscribe();
      expect((await subscribe.mock.results[0].value).unsubscribe).toHaveBeenCalledOnce();
    });
  });
});
