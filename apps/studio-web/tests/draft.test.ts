import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from './fixtures/orders-model.json';
import { Model } from '@eventcatalog/visualiser/model';
import { draftKey, draftModel } from '../view/build/draft';
import { buildDraftGraph } from '../src/model/to-graph';
import { loadChatView, markChatViewShown, saveChatView } from '../view/local-canvas';

const model = Model.parse(fixture);

describe('draftModel', () => {
  it('waits for the first finished resource', () => {
    expect(draftModel({})).toBeUndefined();
    expect(draftModel({ model: { title: 'Orders' } })).toBeUndefined();
    // The only resource may still be being written (its name cut short)
    expect(draftModel({ model: { title: 'Orders', resources: [{ id: 'orders', type: 'service', name: 'Ord' }] } })).toBeUndefined();
  });

  it("leaves out the last of a list until something's written after it", () => {
    const [first, second, third] = model.resources;
    const writing = draftModel({ model: { title: 'Orders', resources: [first, second, third] } });
    expect(writing?.resources.map((r) => r.id)).toEqual([first.id, second.id]);

    // Relations started: the resources are all finished
    const relating = draftModel({ model: { title: 'Orders', resources: [first, second, third], relations: [] } });
    expect(relating?.resources).toHaveLength(3);
  });

  it('keeps only relations between the resources it has', () => {
    const [relation] = model.relations;
    const ends = model.resources.filter((r) => r.id === relation.from || r.id === relation.to);
    const draft = draftModel({ model: { title: model.title, resources: ends, relations: model.relations }, level: 'messages' })!;
    expect(draft.relations).toContainEqual(relation);
    expect(draft.relations.length).toBeLessThan(model.relations.length);
    expect(draft.relations.every((r) => ends.some((x) => x.id === r.from) && ends.some((x) => x.id === r.to))).toBe(true);
  });

  it('takes everything once the model is finished (the tool arguments go on after it)', () => {
    const draft = draftModel({ model, level: 'services' })!;
    expect(draft.resources).toHaveLength(model.resources.length);
    expect(draft.relations).toHaveLength(model.relations.length);
    expect(draft.title).toBe(model.title);
    expect(draftKey(draft)).toBe(`${model.resources.length}:${model.relations.length}`);
  });

  it('skips what is not a valid resource yet, and lays out what it has', async () => {
    const draft = draftModel({ model: { title: 'x', resources: [{ id: 'a' }, model.resources[0], model.resources[1]], relations: [] } })!;
    expect(draft.resources.map((r) => r.id)).toEqual([model.resources[0].id, model.resources[1].id]);
    const graph = await buildDraftGraph(draft);
    expect(graph.nodes.length).toBeGreaterThan(0);
  });
});

describe('chat views', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('remembers a diagram was shown, and keeps what was changed on it', () => {
    expect(loadChatView('a')).toBeUndefined();
    markChatViewShown('a');
    expect(loadChatView('a')).toEqual({});

    saveChatView('a', model);
    expect(loadChatView('a')?.model?.title).toBe(model.title);
    // Shown again: what was changed stays
    markChatViewShown('a');
    expect(loadChatView('a')?.model?.title).toBe(model.title);
  });

  it('keeps only the most recent diagrams', () => {
    for (let i = 0; i < 25; i++) markChatViewShown(`view-${i}`);
    expect(loadChatView('view-0')).toBeUndefined();
    expect(loadChatView('view-24')).toEqual({});
    expect([...store.keys()].filter((key) => key.includes(':chat:'))).toHaveLength(20);
  });

  it('works on without storage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {},
    });
    expect(() => markChatViewShown('a')).not.toThrow();
    expect(saveChatView('a', model)).toBe(false);
    expect(loadChatView('a')).toBeUndefined();
  });
});
