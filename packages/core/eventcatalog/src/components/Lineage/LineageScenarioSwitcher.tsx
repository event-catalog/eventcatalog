import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';

interface Props {
  conditions: string[];
}

export default function LineageScenarioSwitcher({ conditions }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedCondition = conditions[selectedIndex];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="group inline-flex max-w-full items-center gap-1.5 rounded-md border border-[rgb(var(--ec-dropdown-border)/0.8)] bg-[rgb(var(--ec-dropdown-bg))] px-2 py-1 align-middle text-sm font-semibold text-[rgb(var(--ec-page-text))] shadow-sm transition-colors hover:border-[rgb(var(--ec-accent)/0.5)] hover:bg-[rgb(var(--ec-dropdown-hover))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent)/0.3)]"
          aria-label={`Select scenario. Scenario ${selectedIndex + 1} of ${conditions.length}: ${selectedCondition}`}
        >
          <span className="min-w-0 max-w-xl truncate">{selectedCondition}</span>
          <span className="shrink-0 rounded bg-[rgb(var(--ec-accent-subtle))] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[rgb(var(--ec-accent-text))]">
            {selectedIndex + 1}/{conditions.length}
          </span>
          <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--ec-page-text-muted))] transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[1000] max-h-80 w-[min(36rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-[rgb(var(--ec-dropdown-border)/0.8)] bg-[rgb(var(--ec-dropdown-bg))] p-1.5 shadow-[0_20px_56px_rgb(0_0_0/0.22)]"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-xs font-semibold text-[rgb(var(--ec-dropdown-text))]">Choose a scenario</p>
            <p className="pt-0.5 text-[11px] font-normal text-[rgb(var(--ec-page-text-muted))]">
              This message path is shared by {conditions.length} conditions.
            </p>
          </div>
          <DropdownMenu.Separator className="mb-1 h-px bg-[rgb(var(--ec-dropdown-border)/0.7)]" />
          <DropdownMenu.RadioGroup value={String(selectedIndex)} onValueChange={(value) => setSelectedIndex(Number(value))}>
            {conditions.map((condition, index) => (
              <DropdownMenu.RadioItem
                key={`${condition}-${index}`}
                value={String(index)}
                className="relative flex cursor-pointer select-none items-start gap-2.5 rounded-lg px-2.5 py-2 pr-9 text-sm font-normal leading-5 text-[rgb(var(--ec-dropdown-text))] outline-hidden transition-colors data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
              >
                <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-[rgb(var(--ec-accent-subtle))] px-1 text-[10px] font-semibold tabular-nums text-[rgb(var(--ec-accent-text))]">
                  {index + 1}
                </span>
                <span>{condition}</span>
                <DropdownMenu.ItemIndicator className="absolute right-2.5 top-2.5 text-[rgb(var(--ec-accent))]">
                  <CheckIcon className="h-4 w-4" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Arrow className="fill-[rgb(var(--ec-dropdown-bg))]" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
