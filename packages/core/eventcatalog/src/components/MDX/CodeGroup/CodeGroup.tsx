import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { getCodeLanguageIconUrl, getCodeLanguageName } from './code-group-icons';
import './code-group.css';

export interface CodeGroupItem {
  label: string;
  language?: string;
  content?: ReactNode;
  html?: string;
}
const changeEvent = 'eventcatalog:code-group-change';
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--ec-accent))]';
function LanguageIcon({ item }: { item: CodeGroupItem }) {
  const url = getCodeLanguageIconUrl(item.language ?? '', item.label);
  return url ? <img src={url} alt="" className="size-4 shrink-0" /> : null;
}
export default function CodeGroup({
  items,
  dropdown = false,
  className = '',
}: {
  items: CodeGroupItem[];
  dropdown?: boolean;
  className?: string;
}) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);
  const panels = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const active = Math.min(selected, Math.max(items.length - 1, 0));
  useEffect(() => {
    const sync = (event: Event) => {
      const index = items.findIndex((item) => item.label === (event as CustomEvent<string>).detail);
      if (index >= 0) setSelected(index);
    };
    document.addEventListener(changeEvent, sync);
    return () => document.removeEventListener(changeEvent, sync);
  }, [items]);
  useEffect(() => {
    setCopied(false);
  }, [active]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  const select = (index: number) => {
    setSelected(index);
    document.dispatchEvent(new CustomEvent(changeEvent, { detail: items[index].label }));
  };
  const copy = async () => {
    const panel = panels.current?.children[active];
    const encoded = panel?.querySelector('[data-code]')?.getAttribute('data-code');
    const code = encoded?.replace(/\u007f/g, '\n') ?? panel?.querySelector('pre')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  if (!items.length) return null;
  return (
    <div
      className={`ec-code-group not-prose relative my-6 rounded-xl border border-[rgb(var(--ec-content-border))] bg-[rgb(var(--ec-code-bg,var(--ec-page-bg)))] ${className}`}
    >
      <div
        data-code-controls
        className="flex items-stretch justify-between gap-2 rounded-t-xl border-b border-[rgb(var(--ec-content-border))] bg-[rgb(var(--ec-content-hover))] pl-1 pr-2"
      >
        {dropdown ? (
          <span className="min-w-0 truncate px-3 py-2.5 text-sm">{items[active].label}</span>
        ) : (
          <div role="tablist" aria-label="Code examples" className="flex min-w-0 overflow-x-auto">
            {items.map((item, index) => (
              <button
                key={index}
                ref={(el) => {
                  tabs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${index}`}
                aria-controls={`${id}-panel-${index}`}
                aria-selected={index === active}
                tabIndex={index === active ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={(event) => {
                  const next =
                    event.key === 'ArrowRight'
                      ? (index + 1) % items.length
                      : event.key === 'ArrowLeft'
                        ? (index - 1 + items.length) % items.length
                        : event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? items.length - 1
                            : undefined;
                  if (next !== undefined) {
                    event.preventDefault();
                    select(next);
                    tabs.current[next]?.focus();
                  }
                }}
                className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-[13px] font-medium text-[rgb(var(--ec-content-text-muted))] aria-selected:border-[rgb(var(--ec-accent))] aria-selected:text-[rgb(var(--ec-content-text))] ${focus}`}
              >
                <LanguageIcon item={item} />
                {item.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1 py-1">
          {dropdown && (
            <Listbox value={active} onChange={select}>
              <div className="relative">
                <ListboxButton
                  aria-label="Select code example"
                  className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[13px] hover:bg-[rgb(var(--ec-page-bg))] ${focus}`}
                >
                  <LanguageIcon item={items[active]} />
                  {getCodeLanguageName(items[active].language ?? '', items[active].label)}
                  <ChevronDownIcon className="size-3" />
                </ListboxButton>
                <ListboxOptions className="absolute right-0 top-full z-20 mt-2 min-w-48 rounded-xl border border-[rgb(var(--ec-content-border))] bg-[rgb(var(--ec-page-bg))] p-1 shadow-lg">
                  {items.map((item, index) => (
                    <ListboxOption
                      key={index}
                      value={index}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] data-[focus]:bg-[rgb(var(--ec-content-hover))] data-[selected]:text-[rgb(var(--ec-accent))]"
                    >
                      {({ selected }) => (
                        <>
                          <LanguageIcon item={item} />
                          <span className="flex-1">{getCodeLanguageName(item.language ?? '', item.label)}</span>
                          {selected && <CheckIcon className="size-4" />}
                        </>
                      )}
                    </ListboxOption>
                  ))}
                </ListboxOptions>
              </div>
            </Listbox>
          )}
          <button
            type="button"
            aria-label={copied ? 'Copied!' : 'Copy code'}
            onClick={copy}
            className={`flex size-7 items-center justify-center rounded-md text-[rgb(var(--ec-content-text-muted))] hover:bg-[rgb(var(--ec-page-bg))] ${focus}`}
          >
            {copied ? <CheckIcon className="size-4 text-emerald-500" /> : <ClipboardIcon className="size-4" />}
          </button>
        </div>
      </div>
      <div ref={panels} data-code-panels className="overflow-hidden rounded-b-xl">
        {items.map((item, index) => (
          <div
            key={index}
            data-code-panel={item.label}
            id={`${id}-panel-${index}`}
            role={dropdown ? 'region' : 'tabpanel'}
            aria-label={dropdown ? item.label : undefined}
            aria-labelledby={dropdown ? undefined : `${id}-tab-${index}`}
            hidden={index !== active}
            tabIndex={0}
          >
            {item.html !== undefined ? <div dangerouslySetInnerHTML={{ __html: item.html }} /> : item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
