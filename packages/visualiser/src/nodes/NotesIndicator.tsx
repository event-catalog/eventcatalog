import { MessageCircle, AlertTriangle, XIcon, PencilLine } from "lucide-react";
import { useState, useCallback, memo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Note } from "../types";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AMBER = {
  50: "#fffbeb",
  100: "#fef3c7",
  200: "#fde68a",
  400: "#fbbf24",
  500: "#f59e0b",
  600: "#d97706",
  700: "#b45309",
  800: "#92400e",
  900: "#78350f",
} as const;

const PRIORITY: Record<
  string,
  { bg: string; fg: string; border: string; label: string; accent: string }
> = {
  high: {
    bg: "#fef2f2",
    fg: "#b91c1c",
    border: "#fecaca",
    label: "High",
    accent: "#ef4444",
  },
  critical: {
    bg: "#fef2f2",
    fg: "#991b1b",
    border: "#fecaca",
    label: "Critical",
    accent: "#dc2626",
  },
  low: {
    bg: "#f0fdf4",
    fg: "#15803d",
    border: "#bbf7d0",
    label: "Low",
    accent: "#22c55e",
  },
};

/* ------------------------------------------------------------------ */
/*  Deterministic avatar color from name                               */
/* ------------------------------------------------------------------ */

const AVATAR_PALETTES = [
  ["#7c3aed", "#a78bfa"], // violet
  ["#2563eb", "#60a5fa"], // blue
  ["#0891b2", "#22d3ee"], // cyan
  ["#059669", "#34d399"], // emerald
  ["#d97706", "#fbbf24"], // amber
  ["#dc2626", "#f87171"], // red
  ["#db2777", "#f472b6"], // pink
  ["#4f46e5", "#818cf8"], // indigo
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ------------------------------------------------------------------ */
/*  Shared atoms                                                       */
/* ------------------------------------------------------------------ */

function Avatar({ name, size = 18 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [c1, c2] = AVATAR_PALETTES[hashStr(name) % AVATAR_PALETTES.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: Math.round(size * 0.42),
          fontWeight: 700,
          color: "white",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {initials}
      </span>
    </div>
  );
}

function PriorityPill({
  priority,
  size = "sm",
}: {
  priority: string;
  size?: "sm" | "md";
}) {
  const p = PRIORITY[priority.toLowerCase()];
  if (!p) return null;
  const isUrgent = priority === "high" || priority === "critical";
  const md = size === "md";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: md ? 4 : 2,
        fontSize: md ? 11 : 8,
        fontWeight: 700,
        color: p.fg,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 99,
        padding: md ? "2px 8px" : "1px 5px",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {isUrgent && (
        <AlertTriangle
          style={{ width: md ? 10 : 7, height: md ? 10 : 7 }}
          strokeWidth={2.5}
        />
      )}
      {p.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Popover (hover preview)                                            */
/* ------------------------------------------------------------------ */

function PopoverCard({ note, last }: { note: Note; last: boolean }) {
  return (
    <div
      style={{
        padding: "7px 10px",
        borderBottom: last ? "none" : "1px solid rgb(var(--ec-page-border))",
        display: "flex",
        gap: 6,
        alignItems: "flex-start",
      }}
    >
      {note.author && <Avatar name={note.author} size={16} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 2,
          }}
        >
          {note.author && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgb(var(--ec-page-text))",
                lineHeight: 1,
              }}
            >
              {note.author}
            </span>
          )}
          {note.priority && <PriorityPill priority={note.priority} />}
        </div>
        <p
          style={{
            fontSize: 9,
            lineHeight: 1.45,
            color: "rgb(var(--ec-page-text-muted))",
            margin: 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {note.content}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal note card (thread-style)                                     */
/* ------------------------------------------------------------------ */

function ThreadNote({
  note,
  index,
  isLast,
}: {
  note: Note;
  index: number;
  isLast: boolean;
}) {
  const prioStyle = note.priority
    ? PRIORITY[note.priority.toLowerCase()]
    : null;

  return (
    <div style={{ display: "flex", gap: 14, position: "relative" }}>
      {/* Left rail: avatar + thread line */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
          width: 32,
        }}
      >
        {note.author ? (
          <Avatar name={note.author} size={32} />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#f1f5f9",
              border: `2px solid ${AMBER[200]}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: AMBER[700] }}>
              {index + 1}
            </span>
          </div>
        )}
        {/* Thread connector */}
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: 2,
              background: `linear-gradient(to bottom, ${AMBER[200]}, transparent)`,
              marginTop: 4,
              borderRadius: 1,
              minHeight: 16,
            }}
          />
        )}
      </div>

      {/* Content card */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          paddingBottom: isLast ? 0 : 20,
        }}
      >
        {/* Meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            minHeight: 20,
          }}
        >
          {note.author && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 650,
                color: "rgb(var(--ec-page-text))",
                lineHeight: 1,
              }}
            >
              {note.author}
            </span>
          )}
          {note.priority && <PriorityPill priority={note.priority} size="md" />}
        </div>

        {/* Body */}
        <div
          style={{
            background: "rgb(var(--ec-card-bg))",
            border: "1px solid rgb(var(--ec-page-border))",
            borderRadius: 10,
            padding: "12px 14px",
            position: "relative",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          {/* Priority accent stripe */}
          {prioStyle && (
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 8,
                bottom: 8,
                width: 3,
                borderRadius: "0 2px 2px 0",
                background: prioStyle.accent,
              }}
            />
          )}
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "rgb(var(--ec-page-text-muted))",
              margin: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              paddingLeft: prioStyle ? 8 : 0,
            }}
          >
            {note.content}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Full-screen modal                                                  */
/* ------------------------------------------------------------------ */

function NotesModal({
  notes,
  isOpen,
  onClose,
  resourceName,
}: {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
  resourceName?: string;
}) {
  const count = notes.length;
  const urgent = notes.filter(
    (n) =>
      n.priority &&
      (n.priority.toLowerCase() === "high" ||
        n.priority.toLowerCase() === "critical"),
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal
        container={typeof document !== "undefined" ? document.body : undefined}
      >
        <div
          className="fixed inset-0 z-[99999]"
          style={{ isolation: "isolate" }}
        >
          <Dialog.Overlay
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(6px)",
            }}
          />

          <Dialog.Content
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "92vw",
              maxWidth: 520,
              maxHeight: "82vh",
              background: "rgb(var(--ec-page-bg))",
              borderRadius: 14,
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              outline: "none",
            }}
          >
            {/* -------- Header -------- */}
            <div
              style={{
                padding: "18px 22px 14px",
                background: `linear-gradient(135deg, ${AMBER[50]}, white 60%)`,
                borderBottom: `1px solid ${AMBER[100]}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: `linear-gradient(135deg, ${AMBER[400]}, ${AMBER[500]})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: `0 2px 8px ${AMBER[400]}55`,
                }}
              >
                <MessageCircle
                  style={{ width: 18, height: 18, color: "white" }}
                  strokeWidth={2.5}
                />
              </div>

              {/* Title block */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Dialog.Title
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "rgb(var(--ec-page-text))",
                    margin: 0,
                    lineHeight: 1.25,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {resourceName || "Notes"}
                </Dialog.Title>
                <Dialog.Description
                  style={{
                    fontSize: 12,
                    color: "rgb(var(--ec-page-text-muted))",
                    margin: 0,
                    marginTop: 2,
                    lineHeight: 1.3,
                  }}
                >
                  {count} note{count !== 1 ? "s" : ""}
                  {urgent.length > 0 &&
                    ` \u00b7 ${urgent.length} high priority`}
                </Dialog.Description>
              </div>

              {/* Close */}
              <Dialog.Close asChild>
                <button className="ec-notes-close-btn" aria-label="Close">
                  <XIcon style={{ width: 15, height: 15 }} />
                </button>
              </Dialog.Close>
            </div>

            {/* -------- Thread body -------- */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 22px 24px",
              }}
            >
              {notes.map((note, i) => (
                <ThreadNote
                  key={i}
                  note={note}
                  index={i}
                  isLast={i === count - 1}
                />
              ))}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Main indicator                                                     */
/* ------------------------------------------------------------------ */

export const NotesIndicator = memo(function NotesIndicator({
  notes,
  resourceName,
}: {
  notes: Note[];
  resourceName?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovered(false);
    setIsModalOpen(true);
  }, []);

  if (!notes || notes.length === 0) return null;

  const count = notes.length;
  const hasUrgent = notes.some(
    (n) =>
      n.priority &&
      (n.priority.toLowerCase() === "high" ||
        n.priority.toLowerCase() === "critical"),
  );

  return (
    <>
      <div
        className="absolute -top-5 -right-1 z-30 nopan nodrag"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Count badge */}
        <div
          className="flex items-center justify-center cursor-pointer"
          onClick={handleClick}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: hasUrgent
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : `linear-gradient(135deg, ${AMBER[400]}, ${AMBER[500]})`,
            boxShadow: `0 0 0 2.5px rgb(var(--ec-card-bg)), 0 2px 6px rgba(0,0,0,0.15)`,
            transition: "transform 0.15s ease",
            transform: isHovered ? "scale(1.15)" : "scale(1)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "white",
              lineHeight: 1,
            }}
          >
            {count}
          </span>
        </div>

        {/* Hover popover */}
        {isHovered && !isModalOpen && (
          <div
            className="absolute top-full right-0 mt-2 pointer-events-none"
            style={{ minWidth: 200, maxWidth: 250, zIndex: 50 }}
          >
            <div
              style={{
                background: "rgb(var(--ec-card-bg))",
                borderRadius: 10,
                border: `1px solid ${AMBER[200]}`,
                boxShadow:
                  "0 4px 20px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "6px 10px",
                  background: AMBER[50],
                  borderBottom: `1px solid ${AMBER[200]}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MessageCircle
                  style={{ width: 10, height: 10, color: AMBER[600] }}
                  strokeWidth={2.5}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: AMBER[800],
                    flex: 1,
                    letterSpacing: "0.01em",
                  }}
                >
                  {count} note{count !== 1 ? "s" : ""}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    color: AMBER[600],
                    fontWeight: 500,
                    opacity: 0.8,
                  }}
                >
                  click to open
                </span>
              </div>

              {/* List */}
              <div style={{ maxHeight: 150, overflowY: "auto" }}>
                {notes.slice(0, 3).map((note, i) => (
                  <PopoverCard
                    key={i}
                    note={note}
                    last={i === Math.min(count, 3) - 1 && count <= 3}
                  />
                ))}
              </div>

              {count > 3 && (
                <div
                  style={{
                    padding: "5px 10px",
                    borderTop: "1px solid rgb(var(--ec-page-border))",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      color: "#94a3b8",
                    }}
                  >
                    +{count - 3} more
                  </span>
                </div>
              )}
            </div>

            {/* Arrow pointing up */}
            <div
              style={{
                position: "absolute",
                top: -5,
                right: 10,
                width: 10,
                height: 10,
                background: "rgb(var(--ec-card-bg))",
                border: `1px solid ${AMBER[200]}`,
                borderRight: "none",
                borderBottom: "none",
                transform: "rotate(45deg)",
                zIndex: 1,
              }}
            />
          </div>
        )}
      </div>

      <NotesModal
        notes={notes}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resourceName={resourceName}
      />
    </>
  );
});
