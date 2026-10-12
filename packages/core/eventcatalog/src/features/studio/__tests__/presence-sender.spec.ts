import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { createPresenceSender } from '../hooks/presence-sender';

describe('createPresenceSender', () => {
  let awareness: Awareness;
  let sent: Record<string, unknown>[];

  // Someone else on the canvas (their presence, as the collaboration server passes it on)
  const arrive = (name: string) => {
    const other = new Awareness(new Y.Doc());
    other.setLocalState({ user: { name } });
    applyAwarenessUpdate(awareness, encodeAwarenessUpdate(other, [other.clientID]), 'server');
    other.destroy();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    awareness = new Awareness(new Y.Doc());
    awareness.setLocalState({ user: { name: 'Ada' } });
    arrive('Grace');
    sent = [];
    awareness.on('update', ({ updated }: { updated: number[] }) => {
      if (updated.includes(awareness.clientID)) sent.push({ ...awareness.getLocalState() });
    });
  });

  afterEach(() => {
    awareness.destroy();
    vi.useRealTimers();
  });

  it('sends straight away when nothing was sent lately, keeping the rest of the state', async () => {
    const sender = createPresenceSender(awareness, 33);
    sender.send({ pointer: { x: 1, y: 2 } });
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual([{ user: { name: 'Ada' }, pointer: { x: 1, y: 2 } }]);
  });

  it('sends what changes in between together, once per interval, ending with the latest', async () => {
    const sender = createPresenceSender(awareness, 33);
    sender.send({ pointer: { x: 0, y: 0 } });
    await vi.advanceTimersByTimeAsync(0);
    sender.send({ pointer: { x: 1, y: 1 } });
    sender.send({ moving: { a: { x: 5, y: 5 } } });
    sender.send({ pointer: { x: 2, y: 2 } });
    await vi.advanceTimersByTimeAsync(20);
    expect(sent).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(20);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ user: { name: 'Ada' }, pointer: { x: 2, y: 2 }, moving: { a: { x: 5, y: 5 } } });
  });

  it('sends what is waiting on flush, and nothing after destroy', async () => {
    const sender = createPresenceSender(awareness, 33);
    sender.send({ pointer: { x: 0, y: 0 } });
    sender.flush();
    expect(sent).toHaveLength(1);

    sender.send({ pointer: { x: 9, y: 9 } });
    sender.destroy();
    await vi.advanceTimersByTimeAsync(100);
    expect(sent).toHaveLength(1);
  });

  it('sends once a second when nobody else is here, and straight away when someone arrives', async () => {
    const alone = new Awareness(new Y.Doc());
    alone.setLocalState({ user: { name: 'Ada' } });
    const own: unknown[] = [];
    alone.on(
      'update',
      ({ updated }: { updated: number[] }) => updated.includes(alone.clientID) && own.push(alone.getLocalState())
    );
    const sender = createPresenceSender(alone, 33, 1000);
    sender.send({ pointer: { x: 0, y: 0 } });
    await vi.advanceTimersByTimeAsync(0);
    sender.send({ pointer: { x: 1, y: 1 } });
    await vi.advanceTimersByTimeAsync(500);
    expect(own).toHaveLength(1);

    const other = new Awareness(new Y.Doc());
    other.setLocalState({ user: { name: 'Grace' } });
    applyAwarenessUpdate(alone, encodeAwarenessUpdate(other, [other.clientID]), 'server');
    expect(own).toHaveLength(2);
    expect(own[1]).toEqual({ user: { name: 'Ada' }, pointer: { x: 1, y: 1 } });
    sender.destroy();
    alone.destroy();
    other.destroy();
  });
});
