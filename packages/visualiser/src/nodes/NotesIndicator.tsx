import { MessageCircle, AlertTriangle, XIcon } from "lucide-react";
import { useState, useCallback, memo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Note } from "../types";
import { useDarkMode } from "./shared-styles";

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

function NoteCard({ note, isDark }: { note: Note; isDark: boolean }) {
  const prioStyle = note.priority
    ? PRIORITY[note.priority.toLowerCase()]
    : null;

  return (
    <div
      style={{
        background: isDark
          ? `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px), rgba(255,255,255,0.04)`
          : `radial-gradient(circle, rgba(212,201,168,0.4) 1px, transparent 1px), #fef9ed`,
        backgroundSize: "12px 12px",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5dcc3"}`,
        borderBottom: `2px dashed ${isDark ? "rgba(255,255,255,0.1)" : "#d4c9a8"}`,
        borderRadius: "8px 8px 0 0",
        padding: "14px 16px 14px",
        position: "relative",
      }}
    >
      {/* Author */}
      {note.author && (
        <span
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 650,
            color: isDark ? "#e2e8f0" : "#1e293b",
            marginBottom: 8,
          }}
        >
          {note.author}
        </span>
      )}

      {/* Content — styled like a handwritten note */}
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: isDark ? "#cbd5e1" : "#1e293b",
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontStyle: "italic",
        }}
      >
        &ldquo;{note.content}&rdquo;
      </p>
    </div>
  );
}

/** Group notes by priority: critical/high first, then low, then no priority */
function groupNotes(
  notes: Note[],
): { label: string; notes: Note[]; color: string }[] {
  const urgent: Note[] = [];
  const low: Note[] = [];
  const normal: Note[] = [];

  for (const n of notes) {
    const p = n.priority?.toLowerCase();
    if (p === "critical" || p === "high") urgent.push(n);
    else if (p === "low") low.push(n);
    else normal.push(n);
  }

  const groups: { label: string; notes: Note[]; color: string }[] = [];
  if (urgent.length > 0)
    groups.push({ label: "High Priority", notes: urgent, color: "#ef4444" });
  if (normal.length > 0)
    groups.push({ label: "Notes", notes: normal, color: "#f59e0b" });
  if (low.length > 0)
    groups.push({ label: "Low Priority", notes: low, color: "#22c55e" });
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Full-screen modal                                                  */
/* ------------------------------------------------------------------ */

export function NotesModal({
  notes,
  isOpen,
  onClose,
  resourceName,
  resourceVersion,
  resourceType,
  accentColor,
  icon,
}: {
  notes: Note[];
  isOpen: boolean;
  onClose: () => void;
  resourceName?: string;
  resourceVersion?: string;
  resourceType?: string;
  accentColor?: string;
  icon?: React.ReactNode;
}) {
  const isDark = useDarkMode();
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
              background: isDark
                ? "rgba(0, 0, 0, 0.7)"
                : "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(8px)",
            }}
          />

          <Dialog.Content
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "92vw",
              maxWidth: 500,
              maxHeight: "80vh",
              background: isDark ? "#1e2330" : "#ffffff",
              borderRadius: 16,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              boxShadow: isDark
                ? "0 24px 48px rgba(0,0,0,0.5)"
                : "0 24px 48px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              outline: "none",
            }}
          >
            {/* -------- Header -------- */}
            <div
              style={{
                padding: "20px 22px 16px",
                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* Resource icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background:
                    accentColor ||
                    `linear-gradient(135deg, ${AMBER[400]}, ${AMBER[500]})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {icon || (
                  <MessageCircle
                    style={{ width: 18, height: 18, color: "white" }}
                    strokeWidth={2.5}
                  />
                )}
              </div>

              {/* Title block */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Dialog.Title
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: isDark ? "#f1f5f9" : "#0f172a",
                    margin: 0,
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                  }}
                >
                  {resourceName || "Notes"}
                  {resourceVersion && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: isDark ? "#64748b" : "#94a3b8",
                      }}
                    >
                      v{resourceVersion}
                    </span>
                  )}
                </Dialog.Title>
                <Dialog.Description
                  style={{
                    fontSize: 12,
                    color: isDark ? "#94a3b8" : "#64748b",
                    margin: 0,
                    marginTop: 3,
                    lineHeight: 1.3,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {resourceType && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {resourceType}
                    </span>
                  )}
                  {resourceType && (
                    <span style={{ opacity: 0.4 }}>&middot;</span>
                  )}
                  {count} note{count !== 1 ? "s" : ""}
                  {urgent.length > 0 &&
                    ` \u00b7 ${urgent.length} high priority`}
                </Dialog.Description>
              </div>

              {/* Close */}
              <Dialog.Close asChild>
                <button
                  aria-label="Close"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "none",
                    background: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: isDark ? "#94a3b8" : "#94a3b8",
                    flexShrink: 0,
                  }}
                >
                  <XIcon style={{ width: 16, height: 16 }} />
                </button>
              </Dialog.Close>
            </div>

            {/* -------- Grouped notes -------- */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {groupNotes(notes).map((group) => (
                <div key={group.label}>
                  {/* Group header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: group.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isDark ? "#94a3b8" : "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {group.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isDark ? "#475569" : "#94a3b8",
                      }}
                    >
                      ({group.notes.length})
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.06)",
                      }}
                    />
                  </div>
                  {/* Notes in group */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    {group.notes.map((note, i) => (
                      <NoteCard key={i} note={note} isDark={isDark} />
                    ))}
                  </div>
                </div>
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
        className="absolute -top-2.5 -right-2.5 z-30 nopan nodrag"
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
