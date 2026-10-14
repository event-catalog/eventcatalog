import { constants } from 'node:os';
import type { ChildProcess } from 'node:child_process';

/** Signals that stop the CLI: Ctrl+C, `kill`, a closed terminal, a container or process manager stopping it */
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

type Child = Pick<ChildProcess, 'kill' | 'exitCode' | 'signalCode'>;
type Parent = Pick<NodeJS.Process, 'on' | 'off' | 'exit'>;

const isRunning = (child: Child) => child.exitCode === null && child.signalCode === null;

/**
 * Stops a child process along with the CLI. Without this, `kill` or a container stopping the CLI
 * stopped the CLI only: its child (e.g. the server `eventcatalog start` runs) kept running and holding
 * its port. A signal the CLI receives is passed to the child, which can finish what it's doing; the
 * CLI then exits as the signal would have stopped it (128 + the signal's number). It exits explicitly
 * rather than raising the signal again, which a container's first process (PID 1) would ignore.
 *
 * Call `childClosed` once the child has closed: it returns true when the CLI is exiting because of a
 * signal, so the caller shouldn't report the child's exit as a failure.
 */
export const stopChildWithParent = (child: Child, parent: Parent = process) => {
  let received: NodeJS.Signals | undefined;

  const onSignal = (signal: NodeJS.Signals) => {
    received = signal;
    if (isRunning(child)) child.kill(signal);
  };
  // Exiting for any other reason (e.g. an error) still stops the child
  const onExit = () => {
    if (isRunning(child)) child.kill('SIGTERM');
  };

  for (const signal of FORWARDED_SIGNALS) parent.on(signal, onSignal);
  parent.on('exit', onExit);

  return {
    childClosed: (): boolean => {
      for (const signal of FORWARDED_SIGNALS) parent.off(signal, onSignal);
      parent.off('exit', onExit);
      if (!received) return false;
      parent.exit(128 + constants.signals[received]);
      return true;
    },
  };
};
