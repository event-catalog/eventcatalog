import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The module under test uses browser globals that Node doesn't have; stub them before importing.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    disconnect() {}
  }
);

// Import after stubbing globals
import { buildIconPackDescriptors } from '../mermaid-zoom';

describe('buildIconPackDescriptors', () => {
  const fakeLogosIcons = { prefix: 'logos', icons: {} };
  const fakeOopmojiIcons = { prefix: 'openmoji', icons: { '1st-place-medal': {} } };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns one descriptor per pack name with matching name field', () => {
    const descriptors = buildIconPackDescriptors(['logos', 'openmoji']);
    expect(descriptors).toHaveLength(2);
    expect(descriptors[0].name).toBe('logos');
    expect(descriptors[1].name).toBe('openmoji');
  });

  it('logos loader uses the bundled @iconify-json/logos package, not fetch', async () => {
    vi.doMock('@iconify-json/logos', () => ({ icons: fakeLogosIcons }));

    const [logosDescriptor] = buildIconPackDescriptors(['logos']);
    const result = await logosDescriptor.loader();

    // Should resolve to the bundled icons object
    expect(result).toEqual(fakeLogosIcons);
    // fetch must not have been called for the bundled pack
    expect(fetch).not.toHaveBeenCalled();

    vi.doUnmock('@iconify-json/logos');
  });

  it('openmoji loader fetches from the openmoji jsDelivr URL, not the logos URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeOopmojiIcons),
    });
    vi.stubGlobal('fetch', mockFetch);

    const [emojiDescriptor] = buildIconPackDescriptors(['openmoji']);
    const result = await emojiDescriptor.loader();

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('openmoji');
    expect(calledUrl).not.toContain('logos');
    expect(calledUrl).toBe('https://cdn.jsdelivr.net/npm/@iconify-json/openmoji@1/icons.json');
    expect(result).toEqual(fakeOopmojiIcons);
  });

  it('logos pack and openmoji pack each use their own loader (no cross-contamination)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(fakeOopmojiIcons),
    });
    vi.stubGlobal('fetch', mockFetch);
    vi.doMock('@iconify-json/logos', () => ({ icons: fakeLogosIcons }));

    const descriptors = buildIconPackDescriptors(['logos', 'openmoji']);
    const logosResult = await descriptors[0].loader();
    const emojiResult = await descriptors[1].loader();

    // logos resolves to bundled data
    expect(logosResult).toEqual(fakeLogosIcons);
    // openmoji resolves to fetched data
    expect(emojiResult).toEqual(fakeOopmojiIcons);
    // fetch was only called for openmoji
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toContain('openmoji');

    vi.doUnmock('@iconify-json/logos');
  });

  it('non-logos loader returns null and logs an error on HTTP failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', mockFetch);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const [descriptor] = buildIconPackDescriptors(['mdi']);
    const result = await descriptor.loader();

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('mdi'));
    consoleSpy.mockRestore();
  });

  it('non-logos loader returns null and logs an error on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Network failure'));
    vi.stubGlobal('fetch', mockFetch);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const [descriptor] = buildIconPackDescriptors(['mdi']);
    const result = await descriptor.loader();

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('mdi'), expect.any(TypeError));
    consoleSpy.mockRestore();
  });

  it('each non-logos pack name is included in its own jsDelivr URL', async () => {
    const packs = ['openmoji', 'mdi', 'heroicons'];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const descriptors = buildIconPackDescriptors(packs);
    for (let i = 0; i < packs.length; i++) {
      mockFetch.mockClear();
      await descriptors[i].loader();
      expect(mockFetch.mock.calls[0][0]).toBe(`https://cdn.jsdelivr.net/npm/@iconify-json/${packs[i]}@1/icons.json`);
    }
  });
});
