/**
 * The canvas's right-click menu, in groups as design tools have them (most used first, deleting last, apart from the
 * rest): on a note or text, writing on it, the clipboard, its colour (notes), commenting, and deleting it; on another
 * node, questions for an agent about it (when the view is in a chat that takes them), editing its details, the
 * clipboard, commenting on it, flagging it or a note beside it, and deleting it (or the selection it's in); on the
 * canvas, pasting there, putting a note, comment or hotspot there, and laying the level shown out again. What an app
 * leaves out isn't offered, nor, on a locked canvas, anything that changes it.
 */
import {
  Fragment,
  memo,
  useContext,
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
  Palette,
  Pencil,
  Scissors,
  SendToBack,
  StickyNote,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { isWrittenOnCanvas } from "../node-types";
import {
  LockedContext,
  NOTE_COLORS,
  startWriting,
  UpdateNodeDataContext,
} from "./canvas-nodes";
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

const itemClass =
  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-5 transition-colors hover:bg-[rgb(var(--ec-page-border)/0.5)]";
const iconClass = "flex-none text-[rgb(var(--ec-icon-color))]";

function Item({
  icon,
  label,
  onClick,
  shortcut,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`${itemClass} ${danger ? `${STATUS.danger.text} ${STATUS.danger.hover}` : ""}`}
      onClick={onClick}
    >
      <span className={danger ? "flex-none" : iconClass}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {shortcut && (
        <kbd className="ml-4 flex-none font-sans text-[11px] text-[rgb(var(--ec-page-text-muted))]">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

/** A note's colours, to pick from */
function NoteColours({ node, onPicked }: { node: Node; onPicked: () => void }) {
  const updateNodeData = useContext(UpdateNodeDataContext);
  const current =
    typeof node.data.color === "string" && NOTE_COLORS[node.data.color]
      ? node.data.color
      : "yellow";
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 text-[13px] leading-5">
      <Palette size={14} className={iconClass} />
      <span className="flex-1">Colour</span>
      <span role="radiogroup" aria-label="Note colour" className="flex gap-1">
        {Object.entries(NOTE_COLORS).map(([name, { fill, border }]) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={name === current}
            title={name.charAt(0).toUpperCase() + name.slice(1)}
            onClick={() => {
              updateNodeData(node.id, (data) => ({ ...data, color: name }));
              onPicked();
            }}
            className="h-4 w-4 rounded-full border transition-transform hover:scale-110"
            style={{
              background: fill,
              borderColor: border,
              ...(name === current && {
                boxShadow:
                  "0 0 0 1.5px rgb(var(--ec-card-bg)), 0 0 0 3px rgb(var(--ec-page-text))",
              }),
            }}
          />
        ))}
      </span>
    </div>
  );
}

export const ContextMenu = memo(function ContextMenu({
  menu,
  questions,
  onCopy,
  onCut,
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
  /** Copies, then deletes, as ⌘X does (only where that works: not offered when not given) */
  onCut?: () => void;
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
  const locked = useContext(LockedContext);
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

  const node = menu.node;
  const written = !!node && isWrittenOnCanvas(node.type);
  const editable = !locked;
  const clipboard = [
    editable && onCut && (
      <Item
        key="cut"
        icon={<Scissors size={14} />}
        label="Cut"
        onClick={onCut}
        shortcut="⌘X"
      />
    ),
    <Item
      key="copy"
      icon={<Copy size={14} />}
      label="Copy"
      onClick={onCopy}
      shortcut="⌘C"
    />,
    editable && onPaste && (
      <Item
        key="paste"
        icon={<ClipboardPaste size={14} />}
        label="Paste"
        onClick={onPaste}
        shortcut="⌘V"
      />
    ),
    editable && (
      <Item
        key="duplicate"
        icon={<CopyPlus size={14} />}
        label="Duplicate"
        onClick={onDuplicate}
        shortcut="⌘D"
      />
    ),
  ];
  const comment = onAddComment && (
    <Item
      key="comment"
      icon={<MessageCircle size={14} />}
      label="Add comment"
      onClick={onAddComment}
      shortcut="C"
    />
  );
  const remove = editable && (
    <Item
      key="delete"
      icon={<Trash2 size={14} />}
      label="Delete"
      onClick={onDeleteNode}
      shortcut="⌫"
      danger
    />
  );

  // Each group is its own section: empty ones are left out, so dividers never double up
  const groups: ReactNode[][] = node
    ? written
      ? [
          [
            editable && (
              <Item
                key="edit"
                icon={<Pencil size={14} />}
                label="Edit text"
                onClick={() => {
                  startWriting(node.id);
                  onClose();
                }}
              />
            ),
          ],
          clipboard,
          [
            editable && node.type === "note" && (
              <NoteColours key="colour" node={node} onPicked={onClose} />
            ),
          ],
          [comment],
          [remove],
        ]
      : [
          (questions ?? []).map((question) => (
            <Item
              key={question.label}
              icon={<MessageCircleQuestion size={14} />}
              label={question.label}
              onClick={question.onSelect}
            />
          )),
          [
            onEditDetails && (
              <Item
                key="details"
                icon={<Pencil size={14} />}
                label="Edit details"
                onClick={onEditDetails}
              />
            ),
          ],
          clipboard,
          [
            comment,
            onAddHotspot && (
              <Item
                key="hotspot"
                icon={<TriangleAlert size={14} />}
                label="Add hotspot"
                onClick={onAddHotspot}
                shortcut="A"
              />
            ),
            editable && (
              <Item
                key="note"
                icon={<StickyNote size={14} />}
                label="Add note"
                onClick={onAddNote}
              />
            ),
          ],
          [remove],
        ]
    : [
        [
          editable && onPaste && (
            <Item
              key="paste"
              icon={<ClipboardPaste size={14} />}
              label="Paste here"
              onClick={onPaste}
              shortcut="⌘V"
            />
          ),
        ],
        [
          editable && (
            <Item
              key="note"
              icon={<StickyNote size={14} />}
              label="Add sticky note"
              onClick={onAddNote}
              shortcut="N"
            />
          ),
          comment,
          onAddHotspot && (
            <Item
              key="hotspot"
              icon={<TriangleAlert size={14} />}
              label="Add hotspot"
              onClick={onAddHotspot}
              shortcut="A"
            />
          ),
        ],
        [
          onReorder && (
            <Item
              key="reorder"
              icon={<SendToBack size={14} />}
              label="Reorder diagram"
              onClick={onReorder}
            />
          ),
        ],
      ];
  const sections = groups
    .map((group) => group.filter(Boolean))
    .filter((group) => group.length > 0);

  return (
    <div
      role="menu"
      // Keep the window pointerdown listener from closing the menu before a click lands
      onPointerDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      ref={menuRef}
      className="fixed z-50 w-60 overflow-y-auto rounded-xl border p-1.5 shadow-xl bg-[rgb(var(--ec-card-bg))] border-[rgb(var(--ec-page-border))] text-[rgb(var(--ec-page-text))]"
      style={{
        left: placed?.left ?? menu.x,
        top: placed?.top ?? menu.y,
        maxHeight: `calc(100vh - ${EDGE * 2}px)`,
        visibility: placed ? "visible" : "hidden",
      }}
    >
      {sections.map((section, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <div
              role="separator"
              className="-mx-1.5 my-1.5 h-px bg-[rgb(var(--ec-page-border))]"
            />
          )}
          {section}
        </Fragment>
      ))}
    </div>
  );
});
