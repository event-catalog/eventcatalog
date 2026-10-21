/**
 * Between the agent and the diagram the user has open. Hosts show every tool call that has a view as a new view, so
 * the tools that change or read an open diagram (edit_diagram, read_diagram) have none: the open diagram's view
 * waits for requests (wait_for_diagram_requests, called again whenever it returns), carries them out on what's on
 * screen and answers (answer_diagram_request), and the tool returns the answer. As the MCP Apps pdf-server example
 * does (interact, and its viewer polling for commands).
 *
 * Safe between people: a diagram is reached only by its id, 128 random bits the server makes for each diagram and
 * hands only to that conversation (the tool's result, and its view); nothing lists, searches or logs them. The view
 * waits with a secret of its own (the server keeps only its hash), and requests go only to, and answers only come
 * from, the view holding it: another client that learned the id can't take or answer them. Nothing is written to
 * disk: a request is kept in memory until the view answers it (seconds), and a diagram no view waits on is forgotten.
 * One process (as the live sessions' rooms.ts): a view waits on the machine the agent's request comes to.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

/** What the agent asks of the open diagram */
export type BridgeRequest = { id: string; kind: 'edit'; changes: unknown; reorder?: boolean } | { id: string; kind: 'read' };
type Ask = { kind: 'edit'; changes: unknown; reorder?: boolean } | { kind: 'read' };

type Channel = {
  /** The hash of the waiting view's secret (set by its first wait) */
  secret?: Buffer;
  /** When the view last waited, or stopped waiting */
  seenAt: number;
  /** Its waits under way (one, or a few when the diagram is open in more than one tab) */
  waiting: Set<() => void>;
  pending: BridgeRequest[];
  answers: Map<string, (answer: unknown) => void>;
};

/** How long a wait is held before it returns empty (the view waits again straight away): under hosts' tool timeouts */
export const WAIT_MS = 15_000;
/** A view counts as open while it's waiting, or waited this recently (between two waits) */
const OPEN_MS = WAIT_MS + 15_000;
/** How long edit_diagram and read_diagram wait for the view to answer */
export const ANSWER_MS = 8_000;
/** Requests kept for a view at most; and diagrams kept at most (the longest unseen go first) */
const MAX_PENDING = 10;
const MAX_CHANNELS = 10_000;

/** The id of a new diagram: 128 random bits, as hex */
export const newDiagramId = () => randomBytes(16).toString('hex');
export const DIAGRAM_ID = /^[0-9a-f]{32}$/;

const channels = new Map<string, Channel>();
const hash = (secret: string) => createHash('sha256').update(secret).digest();
const isOpen = (channel: Channel) => channel.waiting.size > 0 || Date.now() - channel.seenAt < OPEN_MS;

// Diagrams no view waits on any more are forgotten, with what was asked of them
setInterval(() => channels.forEach((channel, id) => !isOpen(channel) && forget(id, channel)), 60_000).unref();

function forget(id: string, channel: Channel) {
  channel.answers.forEach((resolve) => resolve(undefined));
  channels.delete(id);
}

/**
 * The view showing diagram `diagramId` waiting for what the agent asks of it: returns the requests (taking them) as
 * soon as there are any, or none after `waitMs`. Refused when another view, with another secret, has the diagram
 * open; once that one stops waiting, the next view to wait takes it over (the conversation opened elsewhere)
 */
export async function waitForRequests(
  diagramId: string,
  secret: string,
  { waitMs = WAIT_MS, signal }: { waitMs?: number; signal?: AbortSignal } = {}
): Promise<{ requests: BridgeRequest[] } | { error: string }> {
  const mine = hash(secret);
  let channel = channels.get(diagramId);
  if (channel?.secret && !timingSafeEqual(channel.secret, mine) && isOpen(channel))
    return { error: 'This diagram is open in another view.' };
  if (!channel) {
    if (channels.size >= MAX_CHANNELS) {
      const oldest = [...channels].filter(([, open]) => !open.waiting.size).sort(([, a], [, b]) => a.seenAt - b.seenAt)[0];
      if (oldest) forget(...oldest);
    }
    channel = { seenAt: Date.now(), waiting: new Set(), pending: [], answers: new Map() };
    channels.set(diagramId, channel);
  }
  channel.secret = mine;
  channel.seenAt = Date.now();

  if (!channel.pending.length) {
    const open = channel;
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        open.waiting.delete(done);
        signal?.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, waitMs);
      open.waiting.add(done);
      signal?.addEventListener('abort', done);
    });
  }
  channel.seenAt = Date.now();
  return { requests: channel.pending.splice(0) };
}

/** The view's answer to a request it took. False when it isn't that diagram's view, or nobody's waiting for it */
export function answerRequest(diagramId: string, secret: string, requestId: string, answer: unknown) {
  const channel = channels.get(diagramId);
  if (!channel?.secret || !timingSafeEqual(channel.secret, hash(secret))) return false;
  const resolve = channel.answers.get(requestId);
  channel.answers.delete(requestId);
  resolve?.(answer);
  return !!resolve;
}

/**
 * Asks the open diagram for something and waits for its answer: 'answered' (with it), 'not_open' when no view of
 * it is waiting (closed, or a client that doesn't show diagrams), 'not_taken' when one was but didn't take it in
 * time (out of sight): the request is dropped, never left to be done later (nothing here keeps it that long), or
 * 'not_answered' when the view took it but hasn't answered yet (it may still be done)
 */
export async function ask(
  diagramId: string,
  request: Ask,
  { answerMs = ANSWER_MS } = {}
): Promise<{ outcome: 'answered'; answer: unknown } | { outcome: 'not_open' } | { outcome: 'not_taken' } | { outcome: 'not_answered' } | { outcome: 'busy' }> {
  const channel = channels.get(diagramId);
  if (!channel || !isOpen(channel)) return { outcome: 'not_open' };
  if (channel.pending.length >= MAX_PENDING) return { outcome: 'busy' };
  const asked = { ...request, id: randomUUID() } as BridgeRequest;
  channel.pending.push(asked);
  channel.waiting.forEach((wake) => wake());

  const answer = await new Promise<unknown>((resolve) => {
    const timer = setTimeout(() => {
      channel.answers.delete(asked.id);
      resolve(NOT_ANSWERED);
    }, answerMs);
    channel.answers.set(asked.id, (value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
  if (answer === undefined) return { outcome: 'not_open' };
  if (answer === NOT_ANSWERED) {
    const taken = !channel.pending.includes(asked);
    channel.pending = channel.pending.filter((pending) => pending !== asked);
    return { outcome: taken ? 'not_answered' : 'not_taken' };
  }
  return { outcome: 'answered', answer };
}
const NOT_ANSWERED = Symbol('not answered');

/** For tests: forget every diagram */
export const resetBridge = () => channels.clear();
