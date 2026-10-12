/**
 * The command palette (Cmd/Ctrl + K): find a resource on the diagram, or run an action, from the keyboard.
 * Tailwind with EventCatalog's theme variables, on Headless UI's Combobox and Dialog.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Search } from 'lucide-react';

export type Command = {
  id: string;
  group: 'Actions' | 'Resources' | 'Theme';
  label: string;
  /** Shown after the label, e.g. the resource's type */
  hint?: string;
  icon: ReactNode;
  shortcut?: string;
  /** Also matched when searching */
  keywords?: string;
  run: () => void;
};

const GROUP_ORDER: Command['group'][] = ['Actions', 'Resources', 'Theme'];
// With nothing typed, a few resources (typing finds the rest)
const RESOURCES_WHEN_EMPTY = 6;

export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = commands.filter((command) => {
      const text = `${command.label} ${command.hint ?? ''} ${command.keywords ?? ''}`.toLowerCase();
      return words.every((word) => text.includes(word));
    });
    return GROUP_ORDER.map((group) => {
      const items = matches.filter((command) => command.group === group);
      return { group, items: !words.length && group === 'Resources' ? items.slice(0, RESOURCES_WHEN_EMPTY) : items };
    }).filter(({ items }) => items.length);
  }, [commands, query]);

  const close = () => {
    onClose();
    setQuery('');
  };

  return (
    <Dialog open={open} onClose={close} className="relative z-[80]">
      <DialogBackdrop transition className="fixed inset-0 bg-black/30 transition-opacity duration-150 data-closed:opacity-0" />
      <div className="fixed inset-0 overflow-y-auto p-4 pt-[12vh]">
        <DialogPanel
          transition
          className="mx-auto max-w-xl overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] shadow-2xl transition duration-150 data-closed:scale-[0.98] data-closed:opacity-0"
        >
          <Combobox
            onChange={(command: Command | null) => {
              if (!command) return;
              close();
              command.run();
            }}
          >
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[rgb(var(--ec-page-text-muted))]" />
              <ComboboxInput
                autoFocus
                className="h-12 w-full border-0 bg-transparent pl-12 pr-4 text-sm text-[rgb(var(--ec-page-text))] outline-none placeholder:text-[rgb(var(--ec-page-text-muted))]"
                placeholder="Find a resource or action…"
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => setQuery('')}
              />
            </div>

            {groups.length > 0 ? (
              <ComboboxOptions static className="max-h-[min(60vh,440px)] scroll-py-2 overflow-y-auto border-t border-[rgb(var(--ec-page-border))] p-2">
                {groups.map(({ group, items }) => (
                  <li key={group} className="pb-1">
                    <h2 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))]">{group}</h2>
                    <ul>
                      {items.map((command) => (
                        <ComboboxOption
                          key={command.id}
                          value={command}
                          className="group flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm data-focus:bg-[rgb(var(--ec-content-hover))]!"
                        >
                          <span className="flex h-5 w-5 flex-none items-center justify-center text-[rgb(var(--ec-page-text-muted))] group-data-focus:text-[rgb(var(--ec-page-text))]! [&_svg]:h-4 [&_svg]:w-4">
                            {command.icon}
                          </span>
                          <span className="min-w-0 flex-auto truncate">{command.label}</span>
                          {command.hint && <span className="flex-none text-xs text-[rgb(var(--ec-page-text-muted))]">{command.hint}</span>}
                          {command.shortcut && (
                            <kbd className="flex-none rounded border border-[rgb(var(--ec-page-border))] px-1.5 py-0.5 font-sans text-[11px] text-[rgb(var(--ec-page-text-muted))]">
                              {command.shortcut}
                            </kbd>
                          )}
                        </ComboboxOption>
                      ))}
                    </ul>
                  </li>
                ))}
              </ComboboxOptions>
            ) : (
              <p className="border-t border-[rgb(var(--ec-page-border))] px-6 py-10 text-center text-sm text-[rgb(var(--ec-page-text-muted))]">
                Nothing found for “{query}”.
              </p>
            )}

            <div className="flex items-center gap-4 border-t border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-content-hover))] px-4 py-2 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
              <span>
                <kbd className="font-sans font-semibold">↑↓</kbd> to move
              </span>
              <span>
                <kbd className="font-sans font-semibold">↵</kbd> to choose
              </span>
              <span>
                <kbd className="font-sans font-semibold">esc</kbd> to close
              </span>
            </div>
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
