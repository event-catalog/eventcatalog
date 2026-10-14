/**
 * The canvas's right-click menu: on a node, commenting on it, flagging it, a note beside it, editing its details,
 * copying, duplicating and deleting it (or the selection it's in), and questions for an agent about it (when the
 * view is in a chat that takes them); on the canvas, putting a comment, hotspot or note there, pasting there, and
 * laying the level shown out again. What an app leaves out isn't offered.
 */
import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Node, XYPosition } from "@xyflow/react";
import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  MessageCircle,
  MessageCircleQuestion,
  Pencil,
  SendToBack,
  StickyNote,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { isWrittenOnCanvas } from "../node-types";
import { STATUS } from "./status";

export type ContextMenuState = {
  x: number;
  y: number;
  flowPosition: XYPosition;
  node?: Node;
} | null;

/** The least room left between the menu and the window's edges */
const EDGE = 8;

/** Something to ask the agent about the node right clicked */
export type MenuQuestion = { label: string; onSelect: () => void };

export const ContextMenu = memo(function ContextMenu({
  menu,
  questions,
  onCopy,
  onDuplicate,
  onPaste,
  onAddNote,
  onAddComment,
  onAddHotspot,
  onEditDetails,
  onReorder,
  onDeleteNode,
  onClose,
}: {
  menu: ContextMenuState;
  /** For the node right clicked */
  questions?: MenuQuestion[];
  onCopy: () => void;
  onDuplicate: () => void;
  /** Paste what was last copied where the menu was opened, if anything was */
  onPaste?: () => void;
  /** A sticky note where the menu was opened (on the canvas), or beside the node */
  onAddNote: () => void;
  /** A comment pinned where the menu was opened (on the canvas or the node), on L3 */
  onAddComment?: () => void;
  /** A hotspot on the node right clicked (or where the menu was opened), on L3 */
  onAddHotspot?: () => void;
  /** Opens the node's details (not for notes and text, which are written on the canvas) */
  onEditDetails?: () => void;
  /** Lays the level shown out again (the visualiser's layout), from the canvas's menu */
  onReorder?: () => void;
  onDeleteNode: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!menu) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    window.addEventListener("wheel", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("wheel", close);
    };
  }, [menu, onClose]);

  // Kept in the window: opened near its right or bottom edge, it opens to the left of the pointer, or above it.
  // Measured before it's shown (a layout effect), so it never shows cut off first
  const menuRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<{ left: number; top: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!menu || !element) return setPlaced(null);
    const { width, height } = element.getBoundingClientRect();
    const fit = (at: number, size: number, room: number) =>
      at + size <= room - EDGE
        ? at
        : Math.max(EDGE, Math.min(at - size, room - EDGE - size));
    setPlaced({
      left: fit(menu.x, width, window.innerWidth),
      top: fit(menu.y, height, window.innerHeight),
    });
  }, [menu]);

  if (!menu) return null;

  const itemClass =
    "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs hover:bg-[rgb(var(--ec-page-border)/0.5)]";
  const shortcutClass = "ml-auto text-[rgb(var(--ec-page-text-muted))]";
  const item = (
    icon: ReactNode,
    label: string,
    onClick: () => void,
    shortcut?: string,
    className = "",
  ) => (
    <button className={`${itemClass} ${className}`} onClick={onClick}>
      {icon}
      {label}
      {shortcut && <span className={shortcutClass}>{shortcut}</span>}
    </button>
  );
  const separator = (
    <div className="my-1 h-px bg-[rgb(var(--ec-page-border))]" />
  );

  return (
    <div
      // Keep the window pointerdown listener from closing the menu before a click lands
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      ref={menuRef}
      className="fixed z-50 w-56 overflow-y-auto rounded-lg border p-1 shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      style={{
        left: placed?.left ?? menu.x,
        top: placed?.top ?? menu.y,
        maxHeight: `calc(100vh - ${EDGE * 2}px)`,
        visibility: placed ? "visible" : "hidden",
      }}
    >
      {menu.node && questions?.length ? (
        <>
          {questions.map((question) => (
            <button
              key={question.label}
              className={itemClass}
              onClick={question.onSelect}
            >
              <MessageCircleQuestion size={14} />
              {question.label}
            </button>
          ))}
          {separator}
        </>
      ) : null}
      {menu.node && (
        <>
          {onAddComment &&
            item(<MessageCircle size={14} />, "Add comment", onAddComment, "C")}
          {onAddHotspot &&
            !isWrittenOnCanvas(menu.node.type) &&
            item(<TriangleAlert size={14} />, "Add hotspot", onAddHotspot, "A")}
          {!isWrittenOnCanvas(menu.node.type) &&
            item(<StickyNote size={14} />, "Add a note", onAddNote)}
          {onEditDetails &&
            !isWrittenOnCanvas(menu.node.type) &&
            item(<Pencil size={14} />, "Edit details", onEditDetails)}
          {item(<Copy size={14} />, "Copy", onCopy, "⌘C")}
          {item(<CopyPlus size={14} />, "Duplicate", onDuplicate, "⌘D")}
          {separator}
          {item(
            <Trash2 size={14} />,
            "Delete",
            onDeleteNode,
            "⌫",
            STATUS.danger.text,
          )}
        </>
      )}
      {!menu.node && (
        <>
          {onAddComment &&
            item(<MessageCircle size={14} />, "Add comment", onAddComment, "C")}
          {onAddHotspot &&
            item(<TriangleAlert size={14} />, "Add hotspot", onAddHotspot, "A")}
          {item(<StickyNote size={14} />, "Add a sticky note", onAddNote, "N")}
          {onPaste &&
            item(<ClipboardPaste size={14} />, "Paste here", onPaste, "⌘V")}
          {onReorder && (
            <>
              {separator}
              {item(<SendToBack size={14} />, "Reorder diagram", onReorder)}
            </>
          )}
        </>
      )}
    </div>
  );
});
