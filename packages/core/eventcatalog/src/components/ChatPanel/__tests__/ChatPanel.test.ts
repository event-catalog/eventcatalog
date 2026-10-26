// @vitest-environment jsdom
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ChatPanel, {
  activityOf,
  getActivitySteps,
  getCanvasId,
  getFlaggedHotspots,
  getWalkthroughs,
  isBetweenText,
  isSuggestingFollowUps,
  preprocessMarkdown,
} from '../ChatPanel';
import ChatPanelButton from '../ChatPanelButton';

vi.mock('@utils/url-builder', () => ({ buildUrl: (url: string) => url }));

// Keep syntax highlighting out of these interaction tests.
vi.mock('react-syntax-highlighter', () => ({ Prism: () => null }));
vi.mock('react-syntax-highlighter/dist/cjs/styles/prism', () => ({ oneDark: {} }));

describe('Ask AI setup experience', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ tools: [] })));
    vi.stubGlobal('fetch', fetchMock);
    Element.prototype.scrollIntoView = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('answers a suggested question with setup guidance without making an API request when unconfigured', async () => {
    await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: false })));
    const question = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('?'));
    expect(question).toBeDefined();
    await act(async () => question!.click());
    expect(container.textContent).not.toContain('Your whole catalog, connected to your AI.');
    expect(container.querySelector('button[aria-label="Stop generating"]')).not.toBeNull();
    await act(async () => vi.advanceTimersByTime(1200));
    expect(container.textContent).toContain('Your whole catalog, connected to your AI.');
    expect(container.textContent).toContain('I’m not connected to a model yet.');
    expect(container.textContent).toContain('Bring your own model');
    expect(container.textContent).toContain('You choose where your data is processed');
    expect(container.querySelector('a[href="/settings/assistant"]')?.textContent).toBe('Turn off Event Catalog Assistant');
    expect(container.querySelector('a[href$="/eventcatalog-assistant/configuration"]')?.textContent).toBe('Connect your model');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['Stop generating', 'Clear chat'])('cancels the delayed reply when the user clicks %s', async (label) => {
    await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: false })));
    const question = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('?'));
    await act(async () => question!.click());
    const cancelButton = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    expect(cancelButton).not.toBeNull();
    await act(async () => cancelButton!.click());
    await act(async () => vi.advanceTimersByTime(2000));
    expect(container.textContent).not.toContain('Your whole catalog, connected to your AI.');
    expect(container.querySelector('button[aria-label="Stop generating"]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('draws on the Studio canvas it is asked on, and has the canvas follow it', async () => {
    const canvasId = '3f1c2a4e-0000-4000-8000-000000000000';
    window.history.pushState({}, '', `/studio/${canvasId}`);
    const drawing = vi.fn();
    window.addEventListener('eventcatalog:assistant-drawing', drawing);
    try {
      await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: true })));
      expect(container.textContent).toContain("Tell me what to diagram and I'll draw it on the canvas");
      const suggestion = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Review my architecture, highlight any issues')
      );
      await act(async () => suggestion!.click());

      expect(drawing).toHaveBeenCalledTimes(1);
      expect((drawing.mock.calls[0][0] as CustomEvent).detail).toEqual({ canvasId });
      const chatRequest = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(JSON.parse(chatRequest![1].body)).toMatchObject({ canvasId });
    } finally {
      window.removeEventListener('eventcatalog:assistant-drawing', drawing);
      window.history.pushState({}, '', '/');
    }
  });

  it('asks what to diagram straight away, without waiting on the model', async () => {
    window.history.pushState({}, '', '/studio/3f1c2a4e-0000-4000-8000-000000000000');
    try {
      await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: true })));
      const suggestion = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Create a new diagram')
      );
      await act(async () => suggestion!.click());

      expect(container.textContent).toContain('What would you like to diagram?');
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    } finally {
      window.history.pushState({}, '', '/');
    }
  });

  it.each(['metaKey', 'ctrlKey'])('opens Ask and focuses its input with %s + I', async (modifier) => {
    await act(async () => root.render(createElement(ChatPanelButton, { configured: false })));
    const shortcut = new KeyboardEvent('keydown', { key: 'i', [modifier]: true, bubbles: true, cancelable: true });
    await act(async () => document.dispatchEvent(shortcut));
    await act(async () => vi.advanceTimersByTime(100));
    const input = container.querySelector('textarea');
    expect(shortcut.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes the closed sidebar inert and restores focus to Ask when closed', async () => {
    await act(async () => root.render(createElement(ChatPanelButton, { configured: false })));
    const panel = container.querySelector('.ec-chat-surface')!;
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Open AI Assistant"]')!;
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.getAttribute('aria-hidden')).toBe('true');

    await act(async () => trigger.click());
    await act(async () => vi.advanceTimersByTime(100));
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(container.querySelector('textarea'));

    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    expect(document.activeElement).toBe(trigger);
  });

  it('does not move focus back into the sidebar when it closes before the focus timer runs', async () => {
    await act(async () => root.render(createElement(ChatPanelButton, { configured: false })));
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-label="Open AI Assistant"]')!;
    await act(async () => trigger.click());
    await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Close chat panel"]')!.click());
    await act(async () => vi.advanceTimersByTime(100));
    expect(document.activeElement).toBe(trigger);
  });

  it('opens from a page action on mobile without squeezing the page, and adapts when resized', async () => {
    const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media)
    );
    const app = document.createElement('div');
    app.id = 'eventcatalog-application';
    document.body.appendChild(app);
    try {
      await act(async () => root.render(createElement(ChatPanelButton, { configured: false })));
      await act(async () => window.dispatchEvent(new CustomEvent('eventcatalog:open-chat')));
      expect(container.querySelector('.ec-chat-surface')?.hasAttribute('inert')).toBe(false);
      expect(app.style.paddingRight).toBe('0px');
      const updateLayout = media.addEventListener.mock.calls.at(-1)![1];
      media.matches = true;
      await act(async () => updateLayout());
      expect(app.style.paddingRight).toBe('400px');
      media.matches = false;
      await act(async () => updateLayout());
      expect(app.style.paddingRight).toBe('0px');
    } finally {
      app.remove();
    }
  });

  it('keeps making room for the open sidebar on the page a navigation swaps in', async () => {
    const page = () => {
      const app = document.createElement('div');
      app.id = 'eventcatalog-application';
      const sidebar = document.createElement('nav');
      sidebar.id = 'eventcatalog-docs-sidebar';
      app.appendChild(sidebar);
      document.body.appendChild(app);
      return { app, sidebar };
    };
    const first = page();
    let next: ReturnType<typeof page> | undefined;
    try {
      await act(async () => root.render(createElement(ChatPanelButton, { configured: false })));
      await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Open AI Assistant"]')!.click());
      expect(first.app.style.paddingRight).toBe('400px');

      // ClientRouter swaps the page under the persisted header, so the panel stays open
      first.app.remove();
      next = page();
      await act(async () => document.dispatchEvent(new Event('astro:after-swap')));
      expect(next.app.style.paddingRight).toBe('400px');
      expect(next.sidebar.style.display).toBe('none');

      await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Close chat panel"]')!.click());
      expect(next.app.style.paddingRight).toBe('0px');
      expect(next.sidebar.style.display).toBe('');
    } finally {
      first.app.remove();
      next?.app.remove();
    }
  });

  it('suggests questions for the page a navigation swaps in while the chat is still fresh', async () => {
    window.history.replaceState({}, '', '/');
    try {
      await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: false })));
      expect(container.textContent).toContain('What domains do we have?');
      expect(container.textContent).not.toContain('Who owns this service?');

      // ClientRouter swaps the page under the persisted header, so the panel stays open on the new page
      window.history.replaceState({}, '', '/docs/services/OrderService/1.0.0');
      await act(async () => document.dispatchEvent(new Event('astro:after-swap')));
      expect(container.textContent).toContain('Who owns this service?');
      expect(container.textContent).not.toContain('What domains do we have?');
      expect(container.textContent).toContain('Based on Service: OrderService');
    } finally {
      window.history.replaceState({}, '', '/');
    }
  });

  it('follows the answer as it arrives, until the reader scrolls up', async () => {
    await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: false })));
    const messages = container.querySelector<HTMLDivElement>('div.overflow-y-auto.scrollbar-hide')!;
    Object.defineProperty(messages, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(messages, 'clientHeight', { configurable: true, value: 300 });
    const question = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('?'));

    await act(async () => question!.click());
    expect(messages.scrollTop).toBe(1000);

    // The reader scrolls up to read while the answer is still coming
    await act(async () => {
      messages.scrollTop = 200;
      messages.dispatchEvent(new Event('scroll'));
    });
    await act(async () => vi.advanceTimersByTime(1200));
    expect(messages.scrollTop).toBe(200);

    await act(async () =>
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Scroll to bottom')!
        .click()
    );
    expect(messages.scrollTop).toBe(1000);
  });

  it('loads available tools when the configured assistant opens', async () => {
    await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: true })));
    expect(fetchMock).toHaveBeenCalledWith('/api/chat');
    expect(container.textContent).not.toContain('Your whole catalog, connected to your AI.');
  });
});

describe('preprocessMarkdown', () => {
  it('shows a link that is still streaming in as its text', () => {
    expect(preprocessMarkdown('Fills go to the [Order Service](/docs/services/order-ser')).toBe('Fills go to the Order Service');
    expect(preprocessMarkdown('Fills go to the [Order Service](')).toBe('Fills go to the Order Service');
  });

  it('leaves finished links alone', () => {
    const text = 'Fills go to the [Order Service](/docs/services/order-service/1.0.0) and on to risk';
    expect(preprocessMarkdown(text)).toBe(text);
  });

  it('only rewrites a link at the end of the text', () => {
    const text = 'See [Order Service](/docs/services/order-service/1.0.0), then [Risk](/docs/domains/ri';
    expect(preprocessMarkdown(text)).toBe('See [Order Service](/docs/services/order-service/1.0.0), then Risk');
  });
});

describe('getCanvasId', () => {
  it('is the Studio canvas the page shows, so the assistant draws on it', () => {
    expect(getCanvasId('/studio/3f1c2a4e-0000-4000-8000-000000000000')).toBe('3f1c2a4e-0000-4000-8000-000000000000');
    expect(getCanvasId('/catalog/studio/3f1c2a4e-0000-4000-8000-000000000000?l=overview')).toBe(
      '3f1c2a4e-0000-4000-8000-000000000000'
    );
  });

  it('is nothing on other pages, or the list of canvases', () => {
    expect(getCanvasId('/studio')).toBeUndefined();
    expect(getCanvasId('/studio?new=1')).toBeUndefined();
    expect(getCanvasId('/docs/services/OrdersService/1.0.0')).toBeUndefined();
  });
});

describe('what the assistant is shown doing', () => {
  it('says what it is doing on a canvas in words, planning while it writes what to draw', () => {
    expect(activityOf('addToCanvas', 'input-streaming')).toBe('Planning the diagram…');
    expect(activityOf('addToCanvas', 'input-available')).toBe('Drawing on the canvas…');
    expect(activityOf('layoutCanvas')).toBe('Tidying the canvas…');
    expect(activityOf('someCustomTool')).toBe('Using someCustomTool…');
  });

  it('is shown working whenever it is not writing text, even after it has written some', () => {
    expect(isBetweenText({ parts: [] })).toBe(true);
    expect(isBetweenText({ parts: [{ type: 'text', text: 'I will draw it', state: 'streaming' }] })).toBe(false);
    expect(
      isBetweenText({
        parts: [
          { type: 'text', text: 'I will draw it', state: 'done' },
          { type: 'tool-addToCanvas', state: 'input-streaming' },
        ],
      })
    ).toBe(true);
    expect(isBetweenText({ parts: [{ type: 'text', text: 'Thinking', state: 'done' }, { type: 'step-start' }] })).toBe(true);
  });
});

describe('getActivitySteps', () => {
  it('lists what the assistant has done this turn, ticked, and what it is doing now', () => {
    const steps = getActivitySteps({
      role: 'assistant',
      parts: [
        { type: 'tool-getCanvas', state: 'output-available' },
        { type: 'tool-getResources', state: 'output-available' },
        { type: 'tool-getResources', state: 'output-available' },
        { type: 'text', text: 'I will draw it', state: 'done' },
        { type: 'tool-addToCanvas', state: 'input-streaming' },
      ],
    });
    expect(steps).toEqual([
      { label: 'Reading the canvas', done: true, count: 1 },
      { label: 'Searching the catalog', done: true, count: 2 },
      { label: 'Planning the diagram', done: false, count: 1 },
    ]);
  });

  it('is thinking when nothing is being done, and between steps', () => {
    expect(getActivitySteps(undefined)).toEqual([{ label: 'Thinking it through', done: false, count: 1 }]);
    // A question just asked: the last message is theirs, not a turn of the assistant's yet
    expect(getActivitySteps({ role: 'user', parts: [{ type: 'tool-getCanvas', state: 'output-available' }] })).toEqual([
      { label: 'Thinking it through', done: false, count: 1 },
    ]);
    expect(getActivitySteps({ role: 'assistant', parts: [{ type: 'tool-getCanvas', state: 'output-available' }] })).toEqual([
      { label: 'Reading the canvas', done: true, count: 1 },
      { label: 'Thinking it through', done: false, count: 1 },
    ]);
  });
});

describe('isSuggestingFollowUps', () => {
  it('is while the assistant writes its follow-up questions, not once they are written', () => {
    const writing = {
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Done', state: 'done' },
        { type: 'tool-suggestFollowUpQuestions', state: 'input-streaming' },
      ],
    };
    expect(isSuggestingFollowUps(writing)).toBe(true);
    expect(
      isSuggestingFollowUps({ role: 'assistant', parts: [{ type: 'tool-suggestFollowUpQuestions', state: 'output-available' }] })
    ).toBe(false);
    expect(isSuggestingFollowUps({ role: 'assistant', parts: [{ type: 'tool-addToCanvas', state: 'input-streaming' }] })).toBe(
      false
    );
  });
});

describe('getFlaggedHotspots', () => {
  it('lists the hotspots the assistant flagged, as it flagged them', () => {
    expect(
      getFlaggedHotspots({
        parts: [
          {
            type: 'tool-addHotspot',
            state: 'output-available',
            input: { severity: 'warning', title: 'Single point of failure' },
            output: { hotspotId: 'h1' },
          },
          // Couldn't be flagged, or still being flagged
          {
            type: 'tool-addHotspot',
            state: 'output-available',
            input: { severity: 'info', title: 'Nowhere' },
            output: { error: 'No node' },
          },
          { type: 'tool-addHotspot', state: 'input-available', input: { severity: 'critical', title: 'Soon' } },
          { type: 'tool-getCanvas', state: 'output-available', output: {} },
        ],
      })
    ).toEqual([{ id: 'h1', severity: 'warning', title: 'Single point of failure' }]);
  });
});

describe('getWalkthroughs', () => {
  it('reads the walkthroughs the assistant gave, as the canvas had them', () => {
    const steps = [{ title: 'Customer places an order', description: 'They check out.', nodeIds: ['a'] }];
    expect(
      getWalkthroughs({
        parts: [
          {
            type: 'tool-walkThrough',
            toolCallId: 't1',
            state: 'output-available',
            output: { title: 'How checkout works', steps },
          },
          { type: 'tool-walkThrough', toolCallId: 't2', state: 'input-streaming', input: { title: 'Not yet' } },
        ],
      })
    ).toEqual([{ id: 't1', title: 'How checkout works', steps }]);
  });
});
