// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextRevealLength, REVEAL_TICK_MS, useRevealedText } from '../revealed-text';

/** How long it takes to show all of `text`, starting from nothing */
const timeToReveal = (text: string) => {
  let shown = 0;
  let ticks = 0;
  while (shown < text.length) {
    shown = nextRevealLength(text, shown);
    ticks++;
  }
  return ticks * REVEAL_TICK_MS;
};

const words = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(' ');

describe('nextRevealLength', () => {
  it('ends on a whole word', () => {
    const text = words(200);
    let shown = 0;
    while (shown < text.length) {
      shown = nextRevealLength(text, shown);
      expect(shown === text.length || text[shown] === ' ').toBe(true);
    }
  });

  it('shows a short answer, or the rest of one, straight away', () => {
    expect(nextRevealLength('Done.', 0)).toBe(5);
    expect(nextRevealLength('Order Created is published', 20)).toBe(26);
  });

  it('shows any answer within a few seconds, a long one too', () => {
    // A typical answer (~800 characters) and a very long one (~9,000)
    expect(timeToReveal(words(120))).toBeLessThan(2500);
    expect(timeToReveal(words(1300))).toBeLessThan(3500);
  });

  it('never goes backwards or past the end', () => {
    const text = words(50);
    expect(nextRevealLength(text, text.length)).toBe(text.length);
    expect(nextRevealLength(text, text.length + 10)).toBe(text.length);
    expect(nextRevealLength(text, 10)).toBeGreaterThan(10);
  });
});

describe('useRevealedText', () => {
  afterEach(() => vi.useRealTimers());

  it('shows a fast stream as it arrives, not once it pauses', () => {
    vi.useFakeTimers();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    let visible = '';
    const Answer = ({ text }: { text: string }) => {
      visible = useRevealedText('fast-stream', text, true).text;
      return null;
    };
    const root = createRoot(document.createElement('div'));

    // A new word every 10ms (faster than the reveal ticks) for 300ms
    let text = '';
    for (let word = 0; word < 30; word++) {
      text += `word${word} `;
      act(() => root.render(createElement(Answer, { text })));
      act(() => vi.advanceTimersByTime(10));
    }

    expect(visible.length).toBeGreaterThan(0);
    act(() => root.unmount());
  });
});
