/**
 * A node's card, next to it on the canvas (Studio's way to see and edit a node, in EventCatalog and on the web): it
 * points at the node and follows it as the canvas pans and zooms, goes away when anything else is pressed or on
 * Escape, and its fields save as they're typed (there's nothing to press to keep a change). Styled in studio.css.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Check, X } from "lucide-react";

const MODAL_WIDTH = 300;
const GAP = 12;
const EDGE = 8;
/** How far down the modal its arrow is, when there's room */
const ARROW_DOWN = 32;

/** pointsAt: how far down the node's middle is (for an arrow from the modal to it), when the modal is beside it */
type Anchor = {
  top: number;
  left: number;
  side: "right" | "left";
  pointsAt?: number;
};

/**
 * Where to show the modal: next to the node (on its right, or its left when there is no room),
 * kept inside the diagram and following the node as the diagram is panned or zoomed.
 */
export function useNodeAnchor(
  nodeId: string,
  containerRef: RefObject<HTMLElement | null>,
  modalRef: RefObject<HTMLElement | null>,
  bottomInset = EDGE,
) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const container = containerRef.current;
      const element = container?.querySelector<HTMLElement>(
        `.react-flow__node[data-id="${CSS.escape(nodeId)}"]`,
      );
      if (container && element) {
        const bounds = container.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const height = modalRef.current?.offsetHeight ?? 200;
        const width = modalRef.current?.offsetWidth || MODAL_WIDTH;
        const side =
          rect.right + GAP + width <= bounds.right - EDGE ? "right" : "left";
        const left =
          side === "right"
            ? rect.right - bounds.left + GAP
            : rect.left - bounds.left - GAP - width;
        const clamp = (value: number, max: number) =>
          Math.min(Math.max(value, EDGE), Math.max(max, EDGE));
        // Its top a little above the node's middle, so its arrow (by its header) points at the node
        const top = clamp(
          Math.min(rect.top, rect.top + rect.height / 2 - ARROW_DOWN) -
            bounds.top,
          bounds.height - height - bottomInset,
        );
        const placed = clamp(left, bounds.width - width - EDGE);
        // The node's middle, if it's beside the modal (not covered by it, nor above or below it)
        const middle = rect.top + rect.height / 2 - bounds.top - top;
        const pointsAt =
          placed === left && middle >= 14 && middle <= height - 14
            ? Math.round(middle)
            : undefined;
        const next: Anchor = { side, left: placed, top, pointsAt };
        setAnchor((previous) =>
          previous?.left === next.left &&
          previous?.top === next.top &&
          previous?.side === next.side &&
          previous?.pointsAt === next.pointsAt
            ? previous
            : next,
        );
      }
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [nodeId, containerRef, modalRef, bottomInset]);

  return anchor;
}

/** "Saved", for a moment after a change is: what an edit form says under its fields */
export function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showSaved = useCallback(() => {
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { saved, showSaved };
}

/** Under an edit form's fields: that changes save as they're typed, or that one just was */
export function EditStatus({ saved }: { saved: boolean }) {
  return (
    <p
      className={`ec-edit-status ${saved ? "is-saved" : ""}`}
      aria-live="polite"
    >
      {saved ? (
        <>
          <Check aria-hidden /> Saved
        </>
      ) : (
        "Changes save as you type"
      )}
    </p>
  );
}

/**
 * The card: next to the node (pointing at it), its header (the kicker, e.g. the node's type, with a close button,
 * and what's under it, e.g. its edit form) and its body. Pressing anything outside it, or Escape, closes it, saving
 * what's being typed first.
 */
export function NodeCard({
  nodeId,
  containerRef,
  label,
  kicker,
  header,
  children,
  width = 340,
  bottomInset = 76,
  onClose,
}: {
  nodeId: string;
  /** The canvas the node is on, to place the card next to it */
  containerRef: RefObject<HTMLElement | null>;
  /** What the card is about, for screen readers */
  label: string;
  /** The top line, e.g. the node's type and where it is */
  kicker: ReactNode;
  /** The rest of the header, e.g. the node's name and summary, or the form to edit them */
  header: ReactNode;
  /** Under the header, e.g. what it's connected to */
  children?: ReactNode;
  width?: number;
  /** Room to keep clear at the bottom of the canvas (e.g. its controls) */
  bottomInset?: number;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const anchor = useNodeAnchor(nodeId, containerRef, cardRef, bottomInset);

  // Goes away when anything else is pressed (the canvas, another node, dragging one) or on Escape
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    // What's being typed is saved first (leaving the field saves it)
    const close = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && cardRef.current?.contains(active))
        active.blur();
      onCloseRef.current();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) =>
      event.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Opened to edit: the cursor's in its first field, ready to type (once it's shown: hidden, it can't take focus).
  // Nothing on a card that's only read (a locked canvas has no fields)
  const shown = !!anchor;
  const focusedFirst = useRef(false);
  useEffect(() => {
    if (!shown || focusedFirst.current) return;
    focusedFirst.current = true;
    const field = cardRef.current?.querySelector<
      HTMLInputElement | HTMLTextAreaElement
    >(
      "input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])",
    );
    if (!field) return;
    field.focus({ preventScroll: true });
    // At the end of what's there, to add to it (fields that have no text cursor, e.g. a checkbox, throw)
    try {
      field.setSelectionRange(field.value.length, field.value.length);
    } catch {}
  }, [shown]);

  return (
    <>
      {/* Pointing at the node it's about, so it reads as attached to it */}
      {anchor?.pointsAt !== undefined && (
        <span
          aria-hidden
          className={`ec-doc-card-arrow is-${anchor.side}`}
          style={{
            top: anchor.top + anchor.pointsAt - 7,
            left:
              anchor.side === "right"
                ? anchor.left - 6
                : anchor.left + width - 8,
          }}
        />
      )}
      <div
        ref={cardRef}
        className="ec-doc-card"
        role="dialog"
        aria-label={label}
        style={{
          width,
          top: anchor?.top ?? 8,
          left: anchor?.left ?? 8,
          visibility: anchor ? "visible" : "hidden",
        }}
      >
        <header className="ec-doc-card-header">
          <div className="ec-doc-card-kicker">
            {kicker}
            <button
              type="button"
              className="ec-icon-button ec-doc-card-close"
              aria-label="Close"
              onClick={onClose}
            >
              <X aria-hidden />
            </button>
          </div>
          {header}
        </header>
        {children}
      </div>
    </>
  );
}

/** How long typing pauses before what's typed is saved (so the canvas keeps up, without saving every key) */
const SAVE_DELAY = 250;

/**
 * A field of the resource's, saved as it's typed (and when it's left, or the card closes): there's nothing to press
 * to keep a change. Escape puts it back as it was when it was clicked into.
 */
export function EditableText({
  value,
  onSave,
  multiline = false,
  placeholder,
  className = "",
  label,
  required = false,
  startEmpty = false,
  onSaved,
}: {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  label: string;
  required?: boolean;
  /**
   * Starts empty rather than showing `value` (a node just made: its name's typed straight in), and `value` is kept if
   * it's left empty
   */
  startEmpty?: boolean;
  /** Something was saved (to say so) */
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState(startEmpty ? "" : value);
  const shown = useRef(value);
  const focused = useRef(false);
  const before = useRef(value);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ value, onSave, onSaved, required });
  latest.current = { value, onSave, onSaved, required };
  // Changed from elsewhere (undo, the agent): shown, unless it's being typed in
  useEffect(() => {
    if (value === shown.current) return;
    shown.current = value;
    if (!focused.current) setDraft(value);
  }, [value]);

  const flush = () => {
    clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (next === null) return;
    const {
      value: saved,
      onSave: save,
      onSaved: said,
      required: needed,
    } = latest.current;
    if ((needed && !next.trim()) || next === saved) return;
    save(next);
    said?.();
  };
  // Saved if the card closes (or the node changes) while it's being typed in
  useEffect(() => flush, []);

  const change = (next: string) => {
    setDraft(next);
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };
  // Escape put it back (and saved that): leaving it then mustn't save what was typed (`draft` here is from before)
  const reverted = useRef(false);
  const leave = () => {
    focused.current = false;
    if (reverted.current) {
      reverted.current = false;
      return;
    }
    const trimmed = draft.trim();
    // A field that can't be empty goes back to what it was
    if (required && !trimmed) {
      setDraft(before.current);
      pending.current = before.current;
    } else {
      if (trimmed !== draft) setDraft(trimmed);
      pending.current = trimmed;
    }
    flush();
  };
  const keys = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      setDraft(before.current);
      pending.current = before.current;
      flush();
      reverted.current = true;
      (event.target as HTMLElement).blur();
    } else if (
      event.key === "Enter" &&
      (!multiline || event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      (event.target as HTMLElement).blur();
    }
  };
  const focus = () => {
    focused.current = true;
    before.current = value;
  };
  const fit = (area: HTMLTextAreaElement | null) => {
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight + 2}px`;
  };
  return multiline ? (
    <textarea
      ref={fit}
      aria-label={label}
      value={draft}
      rows={2}
      placeholder={placeholder}
      onChange={(event) => {
        change(event.target.value);
        fit(event.target);
      }}
      onFocus={focus}
      onBlur={leave}
      onKeyDown={keys}
      className={`ec-editable ${className}`}
    />
  ) : (
    <input
      aria-label={label}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => change(event.target.value)}
      onFocus={focus}
      onBlur={leave}
      onKeyDown={keys}
      className={`ec-editable ${className}`}
    />
  );
}

/** A field with its name above it */
export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`ec-field ${className}`}>
      <span className="ec-field-label">{label}</span>
      {children}
    </label>
  );
}
