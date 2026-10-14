/**
 * The canvas with nothing on it (a blank page, or everything deleted), as drawing tools welcome you: the brand, what
 * it's for, and the few things to do from here, drawn on the canvas itself. Tailwind with EventCatalog's theme variables.
 */
import { useEffect, useState, type ReactNode } from "react";
import { CircleHelp, FolderOpen, Plug } from "lucide-react";
import logoSvg from "../eventcatalog-logo.svg?raw";

type EmptyCanvasProps = {
  /** Opening a .eventcatalog file (not offered when not given, e.g. inside a chat) */
  onOpen?: () => void;
  onHelp: () => void;
  /** How to connect an AI agent to this server (when there's one to connect to) */
  onConnect?: () => void;
  /** The resources panel is on the left, to point to */
  palette?: boolean;
  /** Live sessions can be started (from Share, top right), to point to */
  live?: boolean;
  /** The welcome in the middle (the brand, what it's for, Open, Connect, Help); without it, just the hints */
  welcome?: boolean;
};

// Hand-drawn, as Excalidraw points at its tools when the canvas is empty
const hintText =
  "font-[Excalifont,Inter,sans-serif] text-[14px] leading-snug text-[color-mix(in_srgb,rgb(var(--ec-page-text))_22%,transparent)]";
const arrow = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** What the tools around the empty canvas are for, each with an arrow to it (on wide enough screens) */
function Hints({ palette, live }: { palette?: boolean; live?: boolean }) {
  return (
    <div aria-hidden className={`hidden md:block! ${hintText}`}>
      {/* To the resources, on the left (low down, clear of the levels hint) */}
      {palette && (
        <div className="absolute bottom-[120px] left-[290px] flex items-start gap-1">
          <svg width="56" height="32" viewBox="0 0 70 40" {...arrow}>
            <path d="M66 8 C 45 4, 22 10, 6 26" />
            <path d="M6 26 L15.7 23.4 M6 26 L8.6 16.3" />
          </svg>
          <p className="-mt-0.5 max-w-[160px]">
            Drag resources onto the canvas, then connect them
          </p>
        </div>
      )}
      {/* To the levels, in the toolbar */}
      <div className="absolute left-[calc(50%+6px)] top-[66px] flex -translate-x-1/2 flex-col items-center">
        <svg width="32" height="45" viewBox="0 0 40 56" {...arrow}>
          <path d="M14 54 C 6 38, 10 18, 20 4" />
          <path d="M20 4 L11.8 7.7 M20 4 L19.1 13" />
        </svg>
        <p className="mt-1 whitespace-nowrap">
          Switch between levels of detail
        </p>
      </div>
      {/* To Share, top right */}
      {live && (
        <div className="absolute right-[52px] top-[66px] flex items-end gap-1">
          <p className="mb-[-5px] max-w-[200px] text-right">
            Start live collaboration with your team or agents
          </p>
          <svg
            width="40"
            height="48"
            viewBox="0 0 50 60"
            className="flex-none"
            {...arrow}
          >
            <path d="M6 56 C 30 52, 42 30, 40 4" />
            <path d="M40 4 L36.1 12.1 M40 4 L45.1 11.4" />
          </svg>
        </div>
      )}
    </div>
  );
}

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "Cmd" : "Ctrl";

export function EmptyCanvas({
  welcome = true,
  onOpen,
  onHelp,
  onConnect,
  palette,
  live,
}: EmptyCanvasProps) {
  // Something dragged in (a component from the palette): the welcome makes way, so it lands on the canvas. Once it's
  // dropped the canvas is being worked on, so the welcome stays away (e.g. while a domain or system's kind is chosen)
  const [dragging, setDragging] = useState(false);
  const [dropped, setDropped] = useState(false);
  useEffect(() => {
    const start = () => setDragging(true);
    const end = () => setDragging(false);
    const drop = () => {
      setDropped(true);
      setDragging(false);
    };
    document.addEventListener("dragstart", start);
    document.addEventListener("dragend", end);
    document.addEventListener("drop", drop);
    return () => {
      document.removeEventListener("dragstart", start);
      document.removeEventListener("dragend", end);
      document.removeEventListener("drop", drop);
    };
  }, []);
  if (dragging || dropped) return null;

  const item = (
    icon: ReactNode,
    label: ReactNode,
    onClick: () => void,
    hint?: ReactNode,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-11 w-full items-center gap-3.5 rounded-lg px-3 text-left text-[15px] text-[rgb(var(--ec-page-text-muted))] transition-colors hover:bg-[rgb(var(--ec-content-hover))]! hover:text-[rgb(var(--ec-page-text))]! [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[1.75]"
    >
      <span className="flex flex-none">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="flex-none text-[13px] opacity-80">{hint}</span>}
    </button>
  );

  return (
    // On the canvas itself: what's dragged in from the left still lands on it
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-4 pb-16 pt-40">
      <Hints palette={palette} live={live} />
      {welcome && (
        <div className="pointer-events-auto flex w-full max-w-[440px] flex-col items-center">
          <div className="flex items-center gap-3 text-[rgb(var(--ec-page-text))]">
            <span
              className="h-11 w-11 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: logoSvg }}
            />
            <span className="text-[34px] font-bold tracking-tight">
              EventCatalog{" "}
              <span className="font-light text-[rgb(var(--ec-page-text-muted))]">
                Studio
              </span>
            </span>
          </div>
          <p className="mt-5 text-center font-[Excalifont,Inter,sans-serif] text-[22px] leading-snug text-[color-mix(in_srgb,rgb(var(--ec-page-text))_38%,transparent)]">
            Sketch, design and share architecture with your team and AI agents.
          </p>

          <div className="mt-10 w-full">
            {onOpen &&
              item(<FolderOpen aria-hidden />, "Open", onOpen, `${MOD}+O`)}
            {onConnect &&
              item(<Plug aria-hidden />, "Connect to MCP Server", onConnect)}
            {item(<CircleHelp aria-hidden />, "Help", onHelp, "?")}
          </div>
        </div>
      )}
    </div>
  );
}
