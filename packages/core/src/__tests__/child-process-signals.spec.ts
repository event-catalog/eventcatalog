import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { stopChildWithParent } from '../utils/child-process-signals';

const createParent = () => Object.assign(new EventEmitter(), { exit: vi.fn() });
const createChild = () => ({ exitCode: null as number | null, signalCode: null as NodeJS.Signals | null, kill: vi.fn() });

describe('stopChildWithParent', () => {
  it.each(['SIGTERM', 'SIGINT', 'SIGHUP'] as const)('passes %s to the child, then exits as the signal would', (signal) => {
    const parent = createParent();
    const child = createChild();
    const { childClosed } = stopChildWithParent(child, parent as any);

    parent.emit(signal, signal);
    expect(child.kill).toHaveBeenCalledWith(signal);
    // The CLI waits for the child to stop before exiting
    expect(parent.exit).not.toHaveBeenCalled();

    child.signalCode = signal;
    expect(childClosed()).toBe(true);
    expect(parent.exit).toHaveBeenCalledWith({ SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }[signal]);
    expect(parent.listenerCount(signal)).toBe(0);
  });

  it('stops the child when the CLI exits for another reason', () => {
    const parent = createParent();
    const child = createChild();
    stopChildWithParent(child, parent as any);

    parent.emit('exit');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('leaves a child that has finished alone, and lets the caller handle its exit', () => {
    const parent = createParent();
    const child = createChild();
    const { childClosed } = stopChildWithParent(child, parent as any);

    child.exitCode = 0;
    expect(childClosed()).toBe(false);
    expect(parent.exit).not.toHaveBeenCalled();
    expect(['SIGINT', 'SIGTERM', 'SIGHUP', 'exit'].map((event) => parent.listenerCount(event))).toEqual([0, 0, 0, 0]);

    parent.emit('exit');
    expect(child.kill).not.toHaveBeenCalled();
  });
});
