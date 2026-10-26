/**
 * What a connection let go of on empty canvas makes there: a placeholder where it was let go of (connected to the node
 * it was dragged from), and a list beside it to choose what it is, searched as you type and picked with the arrow
 * keys and Enter (see connect-new.ts).
 */
import {
  Fragment,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus, X } from "lucide-react";
import {
  CONNECT_PLACEHOLDER_SIZE,
  filterConnectOptions,
  type ConnectOption,
} from "../connect-new";
import { NODE_ICONS } from "./icons";

export type ConnectPlaceholderData = {
  /** The option picked out in the list, shown on the placeholder */
  choice?: { key: string; label: string; summary?: string };
};

const HIDDEN_HANDLE = {
  opacity: 0,
  pointerEvents: "none",
} as const;

// Drawn as the canvas's nodes are (a card with its kind on a badge on its top edge, its name and summary as a
// service's), faded and dashed until it's chosen, in the colour of what's picked out in the list (the border and badge
// take the text colour)
const PLACEHOLDER_CLASS =
  "relative rounded-xl border-2 border-dashed border-current bg-[rgb(var(--ec-card-bg))] px-3 pt-3.5 pb-2.5 opacity-50";
const DEFAULT_COLOUR = "text-[rgb(var(--ec-accent))]";

/** What the placeholder shows: what it'll be once chosen, or a new node until then */
function PlaceholderContent({ choice }: ConnectPlaceholderData) {
  const icon = choice ? NODE_ICONS[choice.key] : undefined;
  const Icon = icon?.icon ?? Plus;
  return (
    <>
      <span className="absolute -top-2.5 left-2.5 rounded bg-current px-1.5 py-0.5 shadow-sm">
        <span className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white">
          <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
          {choice?.label ?? "New"}
        </span>
      </span>
      <div className="truncate text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))]">
        {choice ? `New ${choice.label}` : "New node"}
      </div>
      <div className="mt-1.5 truncate text-[9px] leading-relaxed text-[rgb(var(--ec-page-text-muted))]">
        {choice ? choice.summary : "Choose what it is from the list"}
      </div>
    </>
  );
}

/** Where the new node goes, until what it is is chosen */
export const ConnectPlaceholderNode = memo(function ConnectPlaceholderNode({
  data,
}: NodeProps) {
  const { choice } = data as ConnectPlaceholderData;
  const colour =
    (choice && NODE_ICONS[choice.key]?.className) || DEFAULT_COLOUR;
  return (
    <div
      className={`${PLACEHOLDER_CLASS} ${colour}`}
      style={CONNECT_PLACEHOLDER_SIZE}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        style={HIDDEN_HANDLE}
      />
      <PlaceholderContent choice={choice} />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        style={HIDDEN_HANDLE}
      />
    </div>
  );
});

const LIST_WIDTH = 288;
const LIST_HEIGHT = 360;

export function ConnectChooser({
  options,
  fromName,
  anchor,
  onHighlight,
  onChoose,
  onCancel,
}: {
  /** What can be made (getConnectOptions), the suggested ones first */
  options: ConnectOption[];
  /** The node the connection was dragged from */
  fromName?: string;
  /** The placeholder on screen: the list goes under it (or above, near the bottom of the screen) */
  anchor: { x: number; y: number; width: number; height: number };
  onHighlight: (option: ConnectOption | undefined) => void;
  onChoose: (option: ConnectOption) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  // The placeholder says what it'll be once something's picked out (typed, arrowed or pointed at), not straight away
  const [picking, setPicking] = useState(false);
  const shown = useMemo(
    () => filterConnectOptions(options, query),
    [options, query],
  );
  const highlighted = shown[Math.min(index, shown.length - 1)];
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIndex(0), [query]);
  useEffect(
    () => onHighlight(picking ? highlighted : undefined),
    [picking, highlighted?.key],
  );
  useEffect(() => {
    if (!highlighted) return;
    listRef.current
      ?.querySelector(`[data-key="${CSS.escape(highlighted.key)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted?.key]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return onCancel();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setPicking(true);
      if (!shown.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setIndex(
        (current) =>
          (Math.min(current, shown.length - 1) + step + shown.length) %
          shown.length,
      );
    }
    if (event.key === "Enter" && highlighted) {
      event.preventDefault();
      onChoose(highlighted);
    }
  };

  // Kept on screen: under the placeholder, or above it when there's no room below
  const left = Math.min(
    Math.max(anchor.x, 12),
    window.innerWidth - LIST_WIDTH - 12,
  );
  const below = anchor.y + anchor.height + 8;
  const top =
    below + LIST_HEIGHT > window.innerHeight - 12
      ? Math.max(anchor.y - LIST_HEIGHT - 8, 12)
      : below;

  const suggested = shown.filter((option) => option.says);
  const others = shown.filter((option) => !option.says);
  const row = (option: ConnectOption) => {
    const { icon: Icon, className } = NODE_ICONS[option.key] ??
      NODE_ICONS[option.type] ?? { icon: Plus, className: "" };
    const active = option.key === highlighted?.key;
    return (
      <button
        key={option.key}
        type="button"
        role="option"
        // Focus stays in the search, where the keys work (arrows, Enter, Escape)
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        aria-selected={active}
        data-key={option.key}
        onPointerMove={() => {
          setPicking(true);
          if (!active) setIndex(shown.indexOf(option));
        }}
        onClick={() => onChoose(option)}
        className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left ${
          active ? "bg-[rgb(var(--ec-accent)/0.1)]" : ""
        }`}
      >
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-[rgb(var(--ec-content-hover))]">
          <Icon size={15} className={className} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-tight">
            {option.label}
          </span>
          <span className="block truncate text-[11px] leading-snug text-[rgb(var(--ec-page-text-muted))]">
            {option.says || option.summary}
          </span>
        </span>
      </button>
    );
  };
  const section = (title: string, list: ConnectOption[]) =>
    list.length > 0 && (
      <Fragment key={title}>
        <p
          role="presentation"
          className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--ec-page-text-muted))]"
        >
          {title}
        </p>
        {list.map(row)}
      </Fragment>
    );

  return (
    <div className="fixed inset-0 z-50" onPointerDown={onCancel}>
      <div
        role="dialog"
        aria-label="Connect to something new"
        onPointerDown={(event) => event.stopPropagation()}
        className="absolute flex flex-col rounded-lg border shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
        style={{ left, top, width: LIST_WIDTH, maxHeight: LIST_HEIGHT }}
      >
        <div className="flex flex-none items-center gap-1 border-b border-[rgb(var(--ec-page-border))] p-1.5">
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setPicking(true);
              setQuery(event.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder={fromName ? `Connect ${fromName} to…` : "Connect to…"}
            aria-label="What to connect to"
            role="combobox"
            aria-expanded
            aria-controls="studio-connect-options"
            className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-[13px] outline-none placeholder:text-[rgb(var(--ec-page-text-muted))]"
          />
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="rounded p-1 text-[rgb(var(--ec-icon-color))] hover:bg-[rgb(var(--ec-page-border)/0.5)]"
          >
            <X size={14} />
          </button>
        </div>
        <div
          ref={listRef}
          id="studio-connect-options"
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto p-1"
        >
          {shown.length ? (
            <>
              {section("Suggested", suggested)}
              {section(
                suggested.length ? "Everything else" : "Components",
                others,
              )}
            </>
          ) : (
            <p className="px-2 py-3 text-center text-xs text-[rgb(var(--ec-page-text-muted))]">
              Nothing called “{query}”
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
