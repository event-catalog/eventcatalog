import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { createPresenceSender } from '../hooks/presence-sender';

describe('createPresenceSender', () => {
  let awareness: Awareness;
  let sent: Record<string, unknown>[];

  beforeEach(() => {
    vi.useFakeTimers();
    awareness = new Awareness(new Y.Doc());
    awareness.setLocalState({ user: { name: 'Ada' } });
    sent = [];
    awareness.on('update', () => sent.push({ ...awareness.getLocalState() }));
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
});
