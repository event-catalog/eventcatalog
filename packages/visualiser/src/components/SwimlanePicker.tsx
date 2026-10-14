import { memo, useEffect, useState, type ReactElement } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Group, Layers, Ungroup, X } from "lucide-react";
import { usePortalContainer } from "../context/PortalContainerContext";
import { isTyping } from "../utils/keyboard";
import { LANE_ICONS, LANE_TINTS } from "../nodes/SwimlaneNode";
import {
  SWIMLANE_GROUP_BY_LABELS,
  type FlowGroupBy,
  type FlowGroupStyle,
  type SwimlaneGroupBy,
} from "../utils/swimlanes";

interface SwimlanePickerProps {
  /** The ways the flow can be grouped (those its steps have groups for) */
  options: FlowGroupBy[];
  /** How many groups each way of grouping makes */
  counts: Partial<Record<FlowGroupBy, number>>;
  value: FlowGroupBy | null;
  style: FlowGroupStyle;
  onChange: (value: FlowGroupBy | null, style: FlowGroupStyle) => void;
}

const OPTIONS: Record<
  FlowGroupBy,
  {
    label: string;
    level: SwimlaneGroupBy;
    noun: string;
    hint?: string;
    icon?: typeof Layers;
  }
> = {
  domain: {
    label: SWIMLANE_GROUP_BY_LABELS.domain,
    level: "domain",
    noun: "domain",
  },
  system: {
    label: SWIMLANE_GROUP_BY_LABELS.system,
    level: "system",
    noun: "system",
  },
  team: { label: SWIMLANE_GROUP_BY_LABELS.team, level: "team", noun: "team" },
  "domain-system": {
    label: SWIMLANE_GROUP_BY_LABELS["domain-system"],
    level: "domain",
    noun: "domain",
    hint: "Systems nested in their domain",
    icon: Layers,
  },
};

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

const rowClassName =
  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs cursor-pointer outline-none transition-colors text-[rgb(var(--ec-page-text))] data-[highlighted]:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.05)] data-[state=checked]:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.14)] data-[state=checked]:font-semibold";

const sectionLabelClassName =
  "px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]";

/** What a way of grouping looks like: its icon, in the colour of its groups */
const LevelIcon = ({
  level,
  icon,
}: {
  level: SwimlaneGroupBy | null;
  icon?: typeof Layers;
}) => {
  const Icon = icon ?? (level ? LANE_ICONS[level] : Ungroup);
  const tint = level ? LANE_TINTS[level] : "var(--ec-page-text-muted)";
  return (
    <span
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
      style={{
        background: `rgba(${tint}, 0.12)`,
        color: `rgb(${tint})`,
      }}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
};

// Small pictures of the two ways groups are shown
const BoxesPreview = () => (
  <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden>
    <rect
      x="2"
      y="4"
      width="26"
      height="28"
      rx="4"
      fill="currentColor"
      fillOpacity="0.1"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.5"
    />
    <rect
      x="34"
      y="10"
      width="28"
      height="18"
      rx="4"
      fill="currentColor"
      fillOpacity="0.1"
      stroke="currentColor"
      strokeOpacity="0.5"
      strokeWidth="1.5"
    />
    <rect
      x="8"
      y="10"
      width="14"
      height="6"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <rect
      x="8"
      y="20"
      width="14"
      height="6"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <rect
      x="41"
      y="16"
      width="14"
      height="6"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
  </svg>
);
const LanesPreview = () => (
  <svg viewBox="0 0 64 36" className="h-9 w-16" aria-hidden>
    {[2, 13, 24].map((y) => (
      <rect
        key={y}
        x="1"
        y={y}
        width="62"
        height="10"
        fill="currentColor"
        fillOpacity={y === 13 ? 0.16 : 0.08}
      />
    ))}
    <rect
      x="1"
      y="2"
      width="4"
      height="32"
      fill="currentColor"
      fillOpacity="0.35"
    />
    <rect
      x="10"
      y="4"
      width="12"
      height="6"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <rect
      x="28"
      y="15"
      width="12"
      height="6"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
    <rect
      x="46"
      y="26"
      width="12"
      height="6"
      rx="1.5"
      fill="currentColor"
      fillOpacity="0.6"
    />
  </svg>
);

const STYLES: {
  value: FlowGroupStyle;
  label: string;
  Preview: () => ReactElement;
}[] = [
  { value: "boxes", label: "Boxes", Preview: BoxesPreview },
  { value: "lanes", label: "Lanes", Preview: LanesPreview },
];

/**
 * Picks what a flow's steps are grouped by, if anything, and whether the
 * groups are boxes around their steps or full-width lanes. A single button
 * (showing the grouping, with a button to clear it) that opens a menu; G
 * opens it too. The menu stays open while choosing, so ways of grouping can
 * be compared.
 */
export default memo(function SwimlanePicker({
  options,
  counts,
  value,
  style,
  onChange,
}: SwimlanePickerProps) {
  const portalContainer = usePortalContainer();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() !== "g" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target)
      )
        return;
      event.preventDefault();
      setOpen((isOpen) => !isOpen);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const choose = (next: string) => {
    const groupBy = next === "none" ? null : (next as FlowGroupBy);
    // Only boxes nest, so domains with their systems are always boxes
    onChange(groupBy, groupBy === "domain-system" ? "boxes" : style);
  };
  const current = value ? OPTIONS[value] : null;

  return (
    <div className="flex items-stretch h-10 rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-sm">
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            title="Group steps (G)"
            className={`flex items-center gap-2 pl-3 pr-2.5 text-sm outline-none transition-colors hover:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.06)] focus-visible:ring-2 focus-visible:ring-[rgb(var(--ec-catalog-accent,79_70_229))] ${value ? "rounded-l-md" : "rounded-md"}`}
          >
            <Group className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" />
            <span className="text-[rgb(var(--ec-page-text-muted))]">
              Group by
            </span>
            {current && (
              <span
                className={`font-semibold text-[rgb(var(--ec-catalog-accent,79_70_229))]`}
              >
                {current.label}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))] transition-transform`}
              style={open ? { transform: "rotate(180deg)" } : undefined}
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={portalContainer}>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 w-80 p-1.5 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] shadow-xl animate-in fade-in zoom-in-95 duration-150"
          >
            <DropdownMenu.Label className={sectionLabelClassName}>
              Group steps by
            </DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={value ?? "none"}
              onValueChange={choose}
            >
              <DropdownMenu.RadioItem
                value="none"
                className={rowClassName}
                onSelect={(event) => event.preventDefault()}
              >
                <LevelIcon level={null} />
                <span className="flex-1 font-medium">Nothing</span>
                <DropdownMenu.ItemIndicator>
                  <Check
                    className={`h-3.5 w-3.5 text-[rgb(var(--ec-catalog-accent,79_70_229))]`}
                  />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
              {options.map((option) => {
                const { label, level, noun, hint, icon } = OPTIONS[option];
                const count = counts[option] ?? 0;
                return (
                  <DropdownMenu.RadioItem
                    key={option}
                    value={option}
                    className={rowClassName}
                    onSelect={(event) => event.preventDefault()}
                  >
                    <LevelIcon level={level} icon={icon} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium">{label}</span>
                      {hint && (
                        <span className="block text-[11px] text-[rgb(var(--ec-page-text-muted))]">
                          {hint}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] tabular-nums text-[rgb(var(--ec-page-text-muted))]">
                      {plural(count, noun)}
                    </span>
                    <span className="w-3.5">
                      <DropdownMenu.ItemIndicator>
                        <Check
                          className={`h-3.5 w-3.5 text-[rgb(var(--ec-catalog-accent,79_70_229))]`}
                        />
                      </DropdownMenu.ItemIndicator>
                    </span>
                  </DropdownMenu.RadioItem>
                );
              })}
            </DropdownMenu.RadioGroup>

            <DropdownMenu.Separator className="my-1.5 h-px bg-[rgb(var(--ec-page-border))]" />

            <DropdownMenu.Label className={sectionLabelClassName}>
              Show groups as
            </DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={style}
              onValueChange={(next) => onChange(value, next as FlowGroupStyle)}
              className="grid grid-cols-2 gap-1.5 px-0.5 pb-0.5"
            >
              {STYLES.map(({ value: option, label, Preview }) => {
                const active = !!value && style === option;
                // Lanes don't nest: domains with their systems show as domains
                const note =
                  option === "lanes" && value === "domain-system"
                    ? "Domains only"
                    : null;
                return (
                  <DropdownMenu.RadioItem
                    key={option}
                    value={option}
                    disabled={!value}
                    onSelect={(event) => event.preventDefault()}
                    className={`flex flex-col items-center gap-1 rounded-md border px-2 pt-2 pb-1.5 text-xs outline-none cursor-pointer transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 ${
                      active
                        ? `border-[rgb(var(--ec-catalog-accent,79_70_229))] bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.08)] text-[rgb(var(--ec-catalog-accent,79_70_229))]`
                        : `border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] data-[highlighted]:border-[rgb(var(--ec-catalog-accent,79_70_229)/0.5)] data-[highlighted]:text-[rgb(var(--ec-page-text))]`
                    }`}
                  >
                    <Preview />
                    <span className={active ? "font-semibold" : "font-medium"}>
                      {label}
                    </span>
                    {note && (
                      <span className="text-[10px] text-[rgb(var(--ec-page-text-muted))]">
                        {note}
                      </span>
                    )}
                  </DropdownMenu.RadioItem>
                );
              })}
            </DropdownMenu.RadioGroup>
            {!value && (
              <p className="px-2 pt-1.5 pb-0.5 text-[11px] text-[rgb(var(--ec-page-text-muted))]">
                Pick something to group by first.
              </p>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {value && (
        <button
          type="button"
          aria-label="Stop grouping"
          title="Stop grouping"
          onClick={() => onChange(null, style)}
          className={`flex items-center px-2 rounded-r-md border-l border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text-muted))] outline-none transition-colors hover:bg-[rgb(var(--ec-catalog-accent,79_70_229)/0.06)] hover:text-[rgb(var(--ec-page-text))] focus-visible:ring-2 focus-visible:ring-[rgb(var(--ec-catalog-accent,79_70_229))]`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
