import { useState, useCallback } from "react";
import {
  MessageCircle,
  AlertTriangle,
  X,
  Locate,
  ChevronRight,
  ServerIcon,
  Zap,
  MessageSquare,
  Search,
  ArrowRightLeft,
  Database,
  Package,
  Globe,
  User,
  MonitorIcon,
  BoxesIcon,
  type LucideIcon,
} from "lucide-react";
import { useReactFlow, type Node } from "@xyflow/react";
import * as Dialog from "@radix-ui/react-dialog";
import type { Note } from "../types";

/* ------------------------------------------------------------------ */
/*  Node type → icon + color mapping                                   */
/* ------------------------------------------------------------------ */

const NODE_TYPE_META: Record<
  string,
  { icon: LucideIcon; color: string; label: string }
> = {
  service: { icon: ServerIcon, color: "#ec4899", label: "Service" },
  services: { icon: ServerIcon, color: "#ec4899", label: "Service" },
  event: { icon: Zap, color: "#f97316", label: "Event" },
  events: { icon: Zap, color: "#f97316", label: "Event" },
  command: { icon: MessageSquare, color: "#3b82f6", label: "Command" },
  commands: { icon: MessageSquare, color: "#3b82f6", label: "Command" },
  query: { icon: Search, color: "#22c55e", label: "Query" },
  queries: { icon: Search, color: "#22c55e", label: "Query" },
  channel: { icon: ArrowRightLeft, color: "#6b7280", label: "Channel" },
  channels: { icon: ArrowRightLeft, color: "#6b7280", label: "Channel" },
  data: { icon: Database, color: "#3b82f6", label: "Data" },
  "data-products": { icon: Package, color: "#6366f1", label: "Data Product" },
  externalSystem: { icon: Globe, color: "#ec4899", label: "External System" },
  actor: { icon: User, color: "#eab308", label: "Actor" },
  view: { icon: MonitorIcon, color: "#8b5cf6", label: "View" },
  domain: { icon: BoxesIcon, color: "#14b8a6", label: "Domain" },
  domains: { icon: BoxesIcon, color: "#14b8a6", label: "Domain" },
};

function getNodeMeta(nodeType?: string) {
  if (!nodeType) return null;
  return NODE_TYPE_META[nodeType] || null;
}

/* ------------------------------------------------------------------ */
/*  Extract notes from any node type                                   */
/* ------------------------------------------------------------------ */

export function getNotesFromNode(
  node: Node<any>,
): { name: string; notes: Note[]; nodeType: string } | null {
  const d = node.data;
  const containers = [
    d?.service,
    d?.message,
    d?.channel,
    d?.data,
    d?.dataProduct,
    d?.externalSystem,
    d?.actor,
  ];
  for (const container of containers) {
    if (container?.notes && container.notes.length > 0) {
      return {
        name: container.name || node.id,
        notes: container.notes,
        nodeType: node.type || "unknown",
      };
    }
  }
  if (d?.notes && d.notes.length > 0) {
    return {
      name: d.name || node.id,
      notes: d.notes,
      nodeType: node.type || "unknown",
    };
  }
  return null;
}

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

const AVATAR_PALETTES = [
  ["#7c3aed", "#a78bfa"],
  ["#2563eb", "#60a5fa"],
  ["#0891b2", "#22d3ee"],
  ["#059669", "#34d399"],
  ["#d97706", "#fbbf24"],
  ["#dc2626", "#f87171"],
  ["#db2777", "#f472b6"],
  ["#4f46e5", "#818cf8"],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
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
        }}
      >
        {initials}
      </span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY[priority.toLowerCase()];
  if (!p) return null;
  const isUrgent = priority === "high" || priority === "critical";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 600,
        color: p.fg,
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 99,
        padding: "2px 7px",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        lineHeight: 1.4,
      }}
    >
      {isUrgent && (
        <AlertTriangle style={{ width: 9, height: 9 }} strokeWidth={2.5} />
      )}
      {p.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Note card for the right panel                                      */
/* ------------------------------------------------------------------ */

function NoteCard({ note, index }: { note: Note; index: number }) {
  const prioStyle = note.priority
    ? PRIORITY[note.priority.toLowerCase()]
    : null;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "14px 16px",
        position: "relative",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Priority accent stripe */}
      {prioStyle && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 10,
            bottom: 10,
            width: 3,
            borderRadius: "0 2px 2px 0",
            background: prioStyle.accent,
          }}
        />
      )}

      {/* Header: author + priority */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        {note.author ? (
          <Avatar name={note.author} size={24} />
        ) : (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "#f1f5f9",
              border: `2px solid ${AMBER[200]}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: AMBER[700] }}>
              {index + 1}
            </span>
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {note.author && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0f172a",
                lineHeight: 1,
              }}
            >
              {note.author}
            </span>
          )}
        </div>
        {note.priority && <PriorityBadge priority={note.priority} />}
      </div>

      {/* Content */}
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "#334155",
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          paddingLeft: prioStyle ? 6 : 0,
        }}
      >
        {note.content}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  All Notes Modal — split layout                                     */
/* ------------------------------------------------------------------ */

interface NoteGroup {
  nodeId: string;
  name: string;
  notes: Note[];
  nodeType: string;
}

export function AllNotesModal({
  noteGroups,
  isOpen,
  onClose,
  nodes,
}: {
  noteGroups: NoteGroup[];
  isOpen: boolean;
  onClose: () => void;
  nodes: Node<any>[];
}) {
  const { setCenter, getZoom } = useReactFlow();
  const [selectedIdx, setSelectedIdx] = useState(0);

  const totalNotes = noteGroups.reduce((sum, g) => sum + g.notes.length, 0);
  const selected = noteGroups[selectedIdx] || noteGroups[0];

  const handleNavigate = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const zoom = Math.max(getZoom(), 1);
      setCenter(node.position.x + 100, node.position.y + 50, {
        zoom,
        duration: 600,
      });
      onClose();
    },
    [nodes, setCenter, getZoom, onClose],
  );

  if (totalNotes === 0) return null;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setSelectedIdx(0);
        }
      }}
    >
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
              width: "94vw",
              maxWidth: 720,
              height: "78vh",
              maxHeight: 560,
              background: "white",
              borderRadius: 14,
              boxShadow:
                "0 0 0 1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              outline: "none",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MessageCircle
                  style={{ width: 16, height: 16, color: "#64748b" }}
                  strokeWidth={2.5}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Dialog.Title
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: 0,
                    lineHeight: 1.25,
                  }}
                >
                  Notes
                </Dialog.Title>
                <Dialog.Description
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    margin: 0,
                    marginTop: 1,
                  }}
                >
                  {totalNotes} note{totalNotes !== 1 ? "s" : ""} across{" "}
                  {noteGroups.length} resource
                  {noteGroups.length !== 1 ? "s" : ""}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#94a3b8",
                    flexShrink: 0,
                  }}
                  aria-label="Close"
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              </Dialog.Close>
            </div>

            {/* Split body */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left: resource list */}
              <div
                style={{
                  width: 240,
                  flexShrink: 0,
                  borderRight: "1px solid #e2e8f0",
                  overflowY: "auto",
                  background: "#f8fafc",
                }}
              >
                {noteGroups.map((group, i) => {
                  const isActive = i === selectedIdx;
                  const meta = getNodeMeta(group.nodeType);
                  const IconComp = meta?.icon || MessageCircle;
                  const iconColor = meta?.color || "#64748b";

                  return (
                    <button
                      key={group.nodeId}
                      onClick={() => setSelectedIdx(i)}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        background: isActive ? "white" : "transparent",
                        border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        borderRight: isActive
                          ? `2px solid ${iconColor}`
                          : "2px solid transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textAlign: "left",
                        transition: "background 0.1s",
                      }}
                    >
                      {/* Resource type icon */}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: isActive ? iconColor : `${iconColor}14`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "background 0.15s",
                        }}
                      >
                        <IconComp
                          style={{
                            width: 14,
                            height: 14,
                            color: isActive ? "white" : iconColor,
                            transition: "color 0.15s",
                          }}
                          strokeWidth={2}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? "#0f172a" : "#475569",
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {group.name}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "#94a3b8",
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginTop: 2,
                          }}
                        >
                          {meta?.label || group.nodeType} &middot;{" "}
                          {group.notes.length} note
                          {group.notes.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      <ChevronRight
                        style={{
                          width: 14,
                          height: 14,
                          color: isActive ? iconColor : "#cbd5e1",
                          flexShrink: 0,
                        }}
                        strokeWidth={2}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right: notes for selected resource */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {selected && (
                  <>
                    {/* Selected resource header */}
                    <div
                      style={{
                        padding: "14px 20px",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                        background: "#fafbfc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        {(() => {
                          const meta = getNodeMeta(selected.nodeType);
                          const Icon = meta?.icon || MessageCircle;
                          const color = meta?.color || "#64748b";
                          return (
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: `${color}14`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Icon
                                style={{
                                  width: 15,
                                  height: 15,
                                  color,
                                }}
                                strokeWidth={2}
                              />
                            </div>
                          );
                        })()}
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#0f172a",
                              lineHeight: 1.3,
                            }}
                          >
                            {selected.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              marginTop: 2,
                            }}
                          >
                            {getNodeMeta(selected.nodeType)?.label ||
                              selected.nodeType}{" "}
                            &middot; {selected.notes.length} note
                            {selected.notes.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleNavigate(selected.nodeId)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "5px 10px",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          background: "white",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#475569",
                          transition: "all 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = AMBER[400];
                          e.currentTarget.style.color = AMBER[700];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.color = "#475569";
                        }}
                      >
                        <Locate style={{ width: 12, height: 12 }} />
                        Find on canvas
                      </button>
                    </div>

                    {/* Notes list */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {selected.notes.map((note, i) => (
                        <NoteCard key={i} note={note} index={i} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
