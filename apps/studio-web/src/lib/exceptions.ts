/**
 * Errors for PostHog's error tracking (`$exception` events, grouped into issues): the error's type, its message with
 * anything quoted and any link taken out (a message can quote what's on the canvas: a name, a line of a file), and
 * where it was thrown (the stack's frames: code locations, never data). The view's (view/analytics.ts) and the
 * server's (src/analytics.ts).
 */

export type StackFrame = {
  platform: 'web:javascript' | 'node:javascript';
  function: string;
  filename: string;
  lineno: number;
  colno: number;
  in_app: boolean;
};

export type ExceptionEntry = {
  type: string;
  value: string;
  mechanism: { type: string; handled: boolean; synthetic: boolean };
  stacktrace?: { type: 'raw'; frames: StackFrame[] };
};

const MAX_MESSAGE = 200;
const MAX_FRAMES = 50;

/** The message, without what it quotes or links to */
export const scrubMessage = (message: string) =>
  message
    // One kind of quote at a time ("it's" is one quote), from its first to its last: what's quoted can have the same
    // quote in it ('O'Reilly Payments'), so it can't be told from where the quote ends. Takes out more than it quoted
    // when there are several (the text between them goes too), never less
    .replace(/"[^]*"/g, '"…"')
    .replace(/`[^]*`/g, '`…`')
    .replace(/'[^]*'/g, "'…'")
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<link>')
    .slice(0, MAX_MESSAGE);

// V8 (`    at fn (file:1:2)`, `    at file:1:2`) and Firefox and Safari (`fn@file:1:2`)
const V8_FRAME = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/;
const GECKO_FRAME = /^\s*(.*?)@(.+?):(\d+):(\d+)$/;

/** A stack's frames, most recent first (frames without a place in a file, e.g. native code, are left out) */
export function parseStack(stack: string | undefined) {
  const frames: { function: string; filename: string; lineno: number; colno: number }[] = [];
  for (const line of (stack ?? '').split('\n')) {
    const match = V8_FRAME.exec(line) ?? GECKO_FRAME.exec(line);
    if (!match) continue;
    const [, name, filename, lineno, colno] = match;
    frames.push({ function: name?.replace(/^async /, '') || '?', filename: filename!, lineno: Number(lineno), colno: Number(colno) });
  }
  return frames;
}

/** An error (or whatever was thrown) as one of `$exception_list`'s entries; frames are placed by `frame` */
export function toException(
  error: unknown,
  { mechanism, frame }: { mechanism: string; frame: (parsed: ReturnType<typeof parseStack>[number]) => StackFrame }
): ExceptionEntry {
  const isError = error instanceof Error;
  const frames = isError ? parseStack(error.stack).slice(0, MAX_FRAMES).map(frame) : [];
  return {
    type: isError ? error.name || 'Error' : mechanism === 'onunhandledrejection' ? 'UnhandledRejection' : 'Error',
    value: scrubMessage(isError ? error.message : typeof error === 'string' ? error : error == null ? '' : `Non-error thrown (${typeof error})`),
    mechanism: { type: mechanism, handled: mechanism === 'handled', synthetic: !isError },
    // Oldest first, as error tracking reads them
    ...(frames.length && { stacktrace: { type: 'raw' as const, frames: frames.reverse() } }),
  };
}
