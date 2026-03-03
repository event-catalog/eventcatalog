import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { examples } from "../examples/index";

interface TemplateDropdownProps {
  selectedExample: number;
  templateUnselected: boolean;
  loadedFromUrl: boolean;
  onSelectExample: (index: number) => void;
}

interface GroupedExample {
  group: string;
  items: { index: number; name: string }[];
}

// Preserve the order groups appear in the examples array
function groupExamples(): GroupedExample[] {
  const groups: GroupedExample[] = [];
  const seen = new Map<string, GroupedExample>();
  examples.forEach((ex, i) => {
    const key = ex.group;
    let g = seen.get(key);
    if (!g) {
      g = { group: key, items: [] };
      seen.set(key, g);
      groups.push(g);
    }
    g.items.push({ index: i, name: ex.name });
  });
  return groups;
}

export const TemplateDropdown = memo(function TemplateDropdown({
  selectedExample,
  templateUnselected,
  loadedFromUrl,
  onSelectExample,
}: TemplateDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const grouped = useMemo(groupExamples, []);

  const label = loadedFromUrl
    ? "Shared Link"
    : templateUnselected
      ? "Select a template"
      : (examples[selectedExample]?.name ?? "");

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSelect = useCallback(
    (index: number) => {
      onSelectExample(index);
      setOpen(false);
    },
    [onSelectExample],
  );

  return (
    <div className="template-dropdown" ref={wrapperRef}>
      <button
        className="template-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="template-dropdown-label">{label}</span>
        <ChevronDown size={14} className="template-dropdown-chevron" />
      </button>
      {open && (
        <div className="template-dropdown-panel" role="listbox">
          {grouped.map((g) => (
            <div key={g.group} className="template-dropdown-group">
              <div className="template-dropdown-group-header">{g.group}</div>
              {g.items.map((item) => {
                const isActive = !templateUnselected && !loadedFromUrl && item.index === selectedExample;
                return (
                  <button
                    key={item.index}
                    className={`template-dropdown-item${isActive ? " template-dropdown-item--active" : ""}`}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(item.index)}
                  >
                    <span>{item.name}</span>
                    {isActive && <Check size={13} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
