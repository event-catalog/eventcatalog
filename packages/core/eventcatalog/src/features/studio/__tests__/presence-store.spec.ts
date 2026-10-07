import { afterEach, describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { createPresenceStore, type Peer, type PresenceStore } from '../hooks/presence-store';

const awarenesses: Awareness[] = [];
const stores: PresenceStore[] = [];

const createAwareness = (state: Record<string, unknown>) => {
  const awareness = new Awareness(new Y.Doc());
  awareness.setLocalState(state);
  awarenesses.push(awareness);
  return awareness;
};

/** Our awareness and its store, and a listener subscribed to it */
const setup = () => {
  const local = createAwareness({ user: { name: 'Ada', color: '#f00' }, pointer: null, selection: [] });
  const store = createPresenceStore(local);
  stores.push(store);
  const listener = vi.fn();
  store.subscribe(listener);
  return { local, store, listener };
};

/** Another person's tab, whose awareness reaches ours like it would over the network */
const createRemote = (local: Awareness, state: Record<string, unknown>) => {
  const remote = createAwareness(state);
  const sync = () => applyAwarenessUpdate(local, encodeAwarenessUpdate(remote, [remote.clientID]), 'remote');
  sync();
  return {
    remote,
    set: (field: string, value: unknown) => {
      remote.setLocalStateField(field, value);
      sync();
    },
  };
};

const agent: Peer = { clientId: -1, name: 'Claude', color: '#00f', agent: true, pointer: null, selection: [] };

afterEach(() => {
  stores.splice(0).forEach((store) => store.destroy());
  awarenesses.splice(0).forEach((awareness) => awareness.destroy());
});

describe('createPresenceStore', () => {
  it('lists everyone with a user, including us', () => {
    const { store } = setup();
    expect(store.getPeers()).toEqual([expect.objectContaining({ name: 'Ada', color: '#f00', pointer: null, selection: [] })]);
  });

  it('does not notify when only our own pointer, selection or view changes', () => {
    const { local, listener } = setup();

    local.setLocalStateField('pointer', { x: 10, y: 20 });
    local.setLocalStateField('selection', ['a']);
    local.setLocalStateField('viewport', { x: 0, y: 0, zoom: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies when our own name changes', () => {
    const { local, store, listener } = setup();
    const people = store.getPeople();

    local.setLocalStateField('user', { name: 'Ada Lovelace', color: '#f00' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getPeople()).not.toBe(people);
    expect(store.getPeople()[0].name).toBe('Ada Lovelace');
  });

  it('notifies when someone else joins or moves', () => {
    const { local, store, listener } = setup();

    const bob = createRemote(local, { user: { name: 'Bob', color: '#0f0' }, pointer: { x: 0, y: 0 } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(
      store
        .getPeers()
        .map((peer) => peer.name)
        .sort()
    ).toEqual(['Ada', 'Bob']);

    bob.set('pointer', { x: 50, y: 60 });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getPeers().find((peer) => peer.name === 'Bob')?.pointer).toEqual({ x: 50, y: 60 });
  });

  it('keeps the same people list when someone else only moves their pointer, and changes it when they rename', () => {
    const { local, store } = setup();
    const bob = createRemote(local, { user: { name: 'Bob', color: '#0f0' }, pointer: { x: 0, y: 0 } });
    const people = store.getPeople();
    const peers = store.getPeers();

    bob.set('pointer', { x: 50, y: 60 });
    expect(store.getPeers()).not.toBe(peers);
    expect(store.getPeople()).toBe(people);

    bob.set('user', { name: 'Robert', color: '#0f0' });
    expect(store.getPeople()).not.toBe(people);
    expect(
      store
        .getPeople()
        .map((peer) => peer.name)
        .sort()
    ).toEqual(['Ada', 'Robert']);
  });

  it('changes the people list when someone comes onto or leaves the canvas (has a pointer or not)', () => {
    const { local, store } = setup();
    const bob = createRemote(local, { user: { name: 'Bob', color: '#0f0' }, pointer: { x: 0, y: 0 } });
    const people = store.getPeople();

    bob.set('pointer', null);

    expect(store.getPeople()).not.toBe(people);
  });

  it('skips clients that have not said who they are', () => {
    const { local, store } = setup();
    createRemote(local, { pointer: { x: 0, y: 0 } });
    expect(store.getPeers().map((peer) => peer.name)).toEqual(['Ada']);
  });

  it('shows an agent working through this tab, and removes it', () => {
    const { store, listener } = setup();

    store.setLocalAgent(agent);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getPeers().map((peer) => peer.clientId)).toContain(-1);
    expect(store.getPeople().map((peer) => peer.clientId)).toContain(-1);

    store.setLocalAgent(null);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getPeers().map((peer) => peer.clientId)).not.toContain(-1);
    expect(store.getPeople().map((peer) => peer.clientId)).not.toContain(-1);
  });

  it('changes the people list when the agent changes what it is doing', () => {
    const { store } = setup();
    store.setLocalAgent({ ...agent, activity: 'Adding OrderService' });
    const people = store.getPeople();

    store.setLocalAgent({ ...agent, activity: 'Adding OrderService', pointer: { x: 1, y: 1 } });
    const withPointer = store.getPeople();
    expect(withPointer).not.toBe(people);

    store.setLocalAgent({ ...agent, activity: 'Adding OrderService', pointer: { x: 3, y: 3 } });
    expect(store.getPeople()).toBe(withPointer);

    store.setLocalAgent({ ...agent, activity: 'Done', pointer: { x: 3, y: 3 } });
    expect(store.getPeople()).not.toBe(withPointer);
  });

  it('stops notifying when unsubscribed or destroyed', () => {
    const { local, store, listener } = setup();
    const other = vi.fn();
    const unsubscribe = store.subscribe(other);
    unsubscribe();

    store.destroy();
    createRemote(local, { user: { name: 'Bob', color: '#0f0' } });

    expect(listener).not.toHaveBeenCalled();
    expect(other).not.toHaveBeenCalled();
  });
});
