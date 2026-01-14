import { useState, useRef, useEffect } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { CheckIcon } from '@heroicons/react/24/outline';

// Filter Dropdown Component
export interface FilterDropdownProps {
  label: string;
  selectedItems: string[];
  onClear: () => void;
  onRemoveItem?: (item: string) => void;
  children: React.ReactNode;
}

export const FilterDropdown = ({ label, selectedItems, onClear, onRemoveItem, children }: FilterDropdownProps) => {
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
        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
          hasSelection || isOpen
            ? 'border-[rgb(var(--ec-accent))] bg-[rgb(var(--ec-accent)/0.05)]'
            : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg))] hover:border-[rgb(var(--ec-icon-color))]'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {hasSelection ? (
            <div className="flex flex-wrap gap-1 items-center">
              {selectedItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[rgb(var(--ec-accent)/0.15)] text-[rgb(var(--ec-accent))] rounded-full"
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
                      className="hover:text-[rgb(var(--ec-page-text))] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
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
          {hasSelection && (
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
              className="p-0.5 hover:bg-[rgb(var(--ec-content-hover))] rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-[rgb(var(--ec-icon-color))]" />
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-[rgb(var(--ec-icon-color))]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[rgb(var(--ec-icon-color))]" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-[rgb(var(--ec-card-bg,var(--ec-page-bg)))] border border-[rgb(var(--ec-page-border))] rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto p-2">{children}</div>
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
}

export const CheckboxItem = ({ label, checked, onChange, count, icon }: CheckboxItemProps) => (
  <button
    onClick={onChange}
    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${
      checked ? 'bg-[rgb(var(--ec-accent)/0.1)]' : 'hover:bg-[rgb(var(--ec-content-hover))]'
    }`}
  >
    <div
      className={`w-4 h-4 flex-shrink-0 rounded border flex items-center justify-center transition-colors ${
        checked
          ? 'bg-[rgb(var(--ec-accent))] border-[rgb(var(--ec-accent))]'
          : 'border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-input-bg))]'
      }`}
    >
      {checked && <CheckIcon className="w-3 h-3 text-white" />}
    </div>
    {icon && <span className="flex-shrink-0 text-[rgb(var(--ec-icon-color))]">{icon}</span>}
    <span
      className={`text-sm flex-1 truncate ${checked ? 'font-medium text-[rgb(var(--ec-page-text))]' : 'text-[rgb(var(--ec-page-text))]'}`}
    >
      {label}
    </span>
    {count !== undefined && <span className="text-xs text-[rgb(var(--ec-page-text-muted))]">{count}</span>}
  </button>
);
