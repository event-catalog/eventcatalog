// @vitest-environment jsdom
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ChatPanel from '../ChatPanel';
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

  it('loads available tools when the configured assistant opens', async () => {
    await act(async () => root.render(createElement(ChatPanel, { isOpen: true, onClose: vi.fn(), configured: true })));
    expect(fetchMock).toHaveBeenCalledWith('/api/chat');
    expect(container.textContent).not.toContain('Your whole catalog, connected to your AI.');
  });
});
