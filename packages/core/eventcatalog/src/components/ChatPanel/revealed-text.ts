import { useEffect, useRef, useState } from 'react';

/*
 * Answers often arrive all at once: Anthropic's API sends the text written after a tool call in one burst. So the chat
 * shows each answer word by word as if it were streaming: quickly when a lot is waiting (a long answer still shows in
 * a couple of seconds), more gently near the end, and no slower than a model that does stream.
 */

export const REVEAL_TICK_MS = 33;
// No slower than ~240 characters a second: about as fast as models stream, so a streamed answer isn't held back
const MIN_CHARS_PER_TICK = 8;
// The rest of a big backlog shown each tick: what's waiting shrinks quickly, then slows into the last words
const CATCH_UP_SHARE = 1 / 16;
// How far it may look ahead for the end of the word it stopped in
const MAX_WORD_LOOKAHEAD = 24;

/** How much of `text` to show next, having shown `shown` characters: always ending on a whole word */
export function nextRevealLength(text: string, shown: number): number {
  const remaining = text.length - shown;
  if (remaining <= 0) return text.length;
  const next = shown + Math.max(MIN_CHARS_PER_TICK, Math.ceil(remaining * CATCH_UP_SHARE));
  if (next >= text.length) return text.length;
  const ahead = text.slice(next, next + MAX_WORD_LOOKAHEAD);
  const wordEnd = ahead.search(/\s/);
  if (wordEnd !== -1) return next + wordEnd;
  // In the last word: the rest of it
  return next + ahead.length >= text.length ? text.length : next;
}

// How much of each answer has been shown, by message: switching between the panel and the expanded view carries on
const shownByMessage = new Map<string, number>();

/**
 * The part of an answer to show now. `live` is whether it's the answer being written: one that was already there
 * (earlier in the conversation) shows in full straight away.
 */
export function useRevealedText(id: string, text: string, live: boolean, onReveal?: () => void) {
  const revealing = useRef(live);
  const [shown, setShown] = useState(() => (live ? (shownByMessage.get(id) ?? 0) : text.length));
  // Read by the clock, so text arriving faster than it ticks doesn't restart it (a fast stream would never show)
  const latestText = useRef(text);
  latestText.current = text;
  const caughtUp = shown >= text.length;

  // A steady clock while there's text to show: stopped once it has caught up, started again when more arrives
  useEffect(() => {
    if (!revealing.current || caughtUp) return;
    const clock = setInterval(() => {
      setShown((current) => {
        const next = nextRevealLength(latestText.current, current);
        shownByMessage.set(id, next);
        return next;
      });
    }, REVEAL_TICK_MS);
    return () => clearInterval(clock);
  }, [id, caughtUp]);

  // Once what's shown has grown on the page (e.g. to keep it scrolled into view)
  const latestOnReveal = useRef(onReveal);
  latestOnReveal.current = onReveal;
  useEffect(() => {
    if (revealing.current && shown > 0) latestOnReveal.current?.();
  }, [shown]);

  const visible = revealing.current ? Math.min(shown, text.length) : text.length;
  return { text: text.slice(0, visible), revealing: visible < text.length };
}
