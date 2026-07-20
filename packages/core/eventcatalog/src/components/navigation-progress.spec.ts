// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeNavigationProgress } from './navigation-progress';

const dispatchNavigationEvent = (name: string, sourceElement?: HTMLElement) => {
  const event = new Event(name) as Event & { sourceElement?: HTMLElement };
  event.sourceElement = sourceElement;
  document.dispatchEvent(event);
};

describe('navigation progress', () => {
  let cleanup: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <a id="navigation-link" href="/next">Next page</a>
      <div id="navigation-progress" data-visible="false" aria-hidden="true"></div>
      <span id="navigation-progress-status"></span>
      <main id="content"></main>
    `;
    cleanup = initializeNavigationProgress();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not show the indicator for fast navigations', () => {
    const link = document.getElementById('navigation-link')!;

    dispatchNavigationEvent('astro:before-preparation', link);
    vi.advanceTimersByTime(199);
    dispatchNavigationEvent('astro:after-preparation');
    vi.runAllTimers();

    expect(document.getElementById('navigation-progress')?.dataset.visible).toBe('false');
    expect(link.hasAttribute('aria-busy')).toBe(false);
    expect(document.getElementById('content')?.hasAttribute('aria-busy')).toBe(false);
  });

  it('shows accessible pending state during slow navigations', () => {
    const link = document.getElementById('navigation-link')!;

    dispatchNavigationEvent('astro:before-preparation', link);
    expect(link.getAttribute('aria-busy')).toBe('true');
    expect(link.dataset.navigationPending).toBe('true');

    vi.advanceTimersByTime(200);

    expect(document.getElementById('navigation-progress')?.dataset.visible).toBe('true');
    expect(document.getElementById('navigation-progress')?.getAttribute('aria-hidden')).toBe('false');
    expect(document.getElementById('content')?.getAttribute('aria-busy')).toBe('true');
    expect(document.getElementById('navigation-progress-status')?.textContent).toBe('Loading page');

    dispatchNavigationEvent('astro:after-preparation');
    vi.advanceTimersByTime(249);
    expect(document.getElementById('navigation-progress')?.dataset.visible).toBe('true');

    vi.advanceTimersByTime(1);
    expect(document.getElementById('navigation-progress')?.dataset.visible).toBe('false');
    expect(link.hasAttribute('data-navigation-pending')).toBe(false);
    expect(document.getElementById('content')?.hasAttribute('aria-busy')).toBe(false);
    expect(document.getElementById('navigation-progress-status')?.textContent).toBe('');
  });
});
