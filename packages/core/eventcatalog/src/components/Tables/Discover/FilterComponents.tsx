import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { CheckIcon } from '@heroicons/react/24/outline';

// Filter Dropdown Component
export interface FilterDropdownProps {
  label: string;
  selectedItems: string[];
  onClear: () => void;
  onRemoveItem?: (item: string) => void;
  clearable?: boolean;
  children: React.ReactNode;
}

export const FilterDropdown = ({
  label,
  selectedItems,
  onClear,
  onRemoveItem,
  clearable = true,
  children,
}: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasSelection = selectedItems.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        // A quiet field: hairline border that darkens on hover, a soft ring while open; picked values as grey chips
        className={`flex min-h-8 w-full cursor-pointer items-center justify-between rounded-md border bg-[rgb(var(--ec-page-bg))] px-2.5 py-1 text-[13px] transition-[border-color,box-shadow] ${
          isOpen
            ? 'border-[rgb(var(--ec-page-text)/0.3)] shadow-[0_0_0_3px_rgb(var(--ec-page-text)/0.06)]'
            : 'border-[rgb(var(--ec-page-border))] hover:border-[rgb(var(--ec-page-text)/0.25)]'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {hasSelection ? (
            <div className="flex flex-wrap gap-1 items-center">
              {selectedItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex h-5 items-center gap-1 rounded-[4px] bg-[rgb(var(--ec-page-text)/0.07)] pl-1.5 pr-1 text-[12px] text-[rgb(var(--ec-page-text))]"
                >
                  {item}
                  {onRemoveItem && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          onRemoveItem(item);
                        }
                      }}
                      className="cursor-pointer rounded-sm text-[rgb(var(--ec-page-text-muted))] hover:text-[rgb(var(--ec-page-text))]"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[rgb(var(--ec-page-text-muted))]">{label}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {hasSelection && clearable && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }
              }}
              aria-label="Clear"
              className="cursor-pointer rounded p-0.5 text-[rgb(var(--ec-page-text-muted))] hover:bg-[rgb(var(--ec-page-text)/0.06)] hover:text-[rgb(var(--ec-page-text))]"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] shadow-[0_4px_8px_-4px_rgb(0_0_0/0.06),0_16px_32px_-8px_rgb(0_0_0/0.14)]">
          <div className="max-h-64 overflow-y-auto p-1">{children}</div>
        </div>
      )}
    </div>
  );
};

// Checkbox Item Component
export interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
  icon?: React.ReactNode;
  /** `radio` for a single choice (like Kind): a circle with a dot instead of a box with a tick */
  variant?: 'checkbox' | 'radio';
}

// A row: a small checkbox (filled in the text colour when ticked), the name, and how many match on the right
export const CheckboxItem = ({ label, checked, onChange, count, icon, variant = 'checkbox' }: CheckboxItemProps) => (
  <button
    type="button"
    role={variant}
    aria-checked={checked}
    onClick={onChange}
    className="group flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors hover:bg-[rgb(var(--ec-page-text)/0.045)]"
  >
    <span
      className={`flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center border transition-colors ${
        variant === 'radio' ? 'rounded-full' : 'rounded-[4px]'
      } ${
        checked
          ? 'border-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-page-text))]'
          : 'border-[rgb(var(--ec-page-text)/0.25)] bg-[rgb(var(--ec-page-bg))] group-hover:border-[rgb(var(--ec-page-text)/0.45)]'
      }`}
    >
      {checked &&
        (variant === 'radio' ? (
          <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--ec-page-bg))]" />
        ) : (
          <CheckIcon className="h-2.5 w-2.5 stroke-[3] text-[rgb(var(--ec-page-bg))]" />
        ))}
    </span>
    {icon && <span className="flex-shrink-0 text-[rgb(var(--ec-icon-color))]">{icon}</span>}
    <span className="min-w-0 flex-1 truncate text-[13px] text-[rgb(var(--ec-page-text))]">{label}</span>
    {count !== undefined && (
      <span className="flex-shrink-0 text-xs tabular-nums text-[rgb(var(--ec-page-text-muted))]">{count}</span>
    )}
  </button>
);
