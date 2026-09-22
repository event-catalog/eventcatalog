// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import CodeGroup from './CodeGroup';
import { MarkdownCodeGroup } from './MarkdownCodeGroup';
import { parseCodePanels } from './parse-panels';
import { getCodeLanguageIconUrl, getCodeLanguageName } from './code-group-icons';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const roots: Root[] = [];
function render(element: React.ReactNode) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(element));
  return container;
}
afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.innerHTML = '';
});
const items = [
  { label: 'hello.js', language: 'js', content: <pre>first</pre> },
  { label: 'hello.py', language: 'python', content: <pre>second</pre> },
];
describe('React CodeGroup', () => {
  it('switches panels with keyboard focus and synchronizes matching groups', () => {
    const a = render(<CodeGroup items={items} />);
    const b = render(<CodeGroup items={items} dropdown />);
    const tabs = a.querySelectorAll<HTMLButtonElement>('[role=tab]');
    act(() => tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    expect(a.querySelectorAll<HTMLElement>('[role=tabpanel]')[0].hidden).toBe(true);
    expect(b.querySelectorAll<HTMLElement>('[role=region]')[1].hidden).toBe(false);
    expect(b.querySelector('button')?.textContent).toBe('Python');
  });
  it('copies the selected code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const root = render(<CodeGroup items={items} />);
    act(() => root.querySelectorAll<HTMLButtonElement>('[role=tab]')[1].click());
    await act(async () => root.querySelector<HTMLButtonElement>('[aria-label="Copy code"]')!.click());
    expect(writeText).toHaveBeenCalledWith('second');
    expect(root.querySelector('[aria-label="Copied!"]')).not.toBeNull();
  });
  it('preserves highlighted Astro HTML and decodes copy newlines', async () => {
    const parsed = parseCodePanels(
      '<div data-code-panel="file.js" data-code-lang="js"><pre><code><span>one</span>two</code></pre><button data-code="one&#127;two"></button></div>'
    );
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const root = render(<CodeGroup items={parsed} />);
    expect(root.querySelector('code span')?.textContent).toBe('one');
    await act(async () => root.querySelector<HTMLButtonElement>('[aria-label="Copy code"]')!.click());
    expect(writeText).toHaveBeenCalledWith('one\ntwo');
  });
  it('accepts Markdown panels and escapes labels', () => {
    const root = render(
      <MarkdownCodeGroup>
        <div data-code-panel="<script>" data-code-lang="js">
          <pre>hello</pre>
        </div>
      </MarkdownCodeGroup>
    );
    expect(root.querySelector('[role=tab]')?.textContent).toBe('<script>');
    expect(root.querySelector('script')).toBeNull();
    expect(root.querySelector('pre')?.textContent).toBe('hello');
  });
});

describe('language names and icons', () => {
  it.each([
    ['cs', undefined, 'C#', '/icons/languages/csharp.svg'],
    ['dotnet', undefined, '.NET', '/icons/languages/dotnet.svg'],
    ['fsharp', undefined, 'F#', '/icons/languages/fsharp.svg'],
    ['java', undefined, 'Java', '/icons/languages/java.svg'],
    ['kts', undefined, 'Kotlin', '/icons/languages/kotlin.svg'],
    [undefined, 'Main.go', 'Go', '/icons/languages/go.svg'],
    ['powershell', undefined, 'PowerShell', undefined],
    ['xml', undefined, 'XML', undefined],
    ['avsc', undefined, 'Avro', '/icons/avro.svg'],
    ['brainfuck', undefined, 'Brainfuck', undefined],
  ])('maps %s / %s to %s', (language, label, name, icon) => {
    expect(getCodeLanguageName(language, label)).toBe(name);
    expect(getCodeLanguageIconUrl(language, label)).toBe(icon);
  });
});
