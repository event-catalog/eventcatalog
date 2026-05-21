import { memo, useMemo, type ComponentType } from "react";
import { Handle, Position, useNodeConnections } from "@xyflow/react";
import * as Icons from "@heroicons/react/24/solid";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { EMPTY_ARRAY, EMPTY_OBJECT, LINE_CLAMP_STYLE } from "./shared-styles";
import { TruncatedResourceName } from "./TruncatedResourceName";
import { usePortalContainer } from "../context/PortalContainerContext";

type MenuItem = {
  label: string;
  url?: string;
};

type CustomColor =
  | "blue"
  | "teal"
  | "red"
  | "green"
  | "purple"
  | "orange"
  | "pink"
  | "yellow"
  | "gray"
  | "indigo"
  | "cyan"
  | "slate"
  | "amber"
  | "emerald"
  | "violet"
  | "rose";

type CustomPalette = {
  border: string;
  badge: string;
  ring: string;
  shadow: string;
  glow: string;
  pillBorder: string;
};

const PALETTES: Record<CustomColor, CustomPalette> = {
  blue: {
    border: "border-blue-500",
    badge: "bg-blue-500",
    ring: "ring-2 ring-blue-400/60 ring-offset-2",
    shadow: "rgba(59, 130, 246, 0.15)",
    glow: "linear-gradient(135deg, #3b82f6, #2563eb)",
    pillBorder: "#3b82f6",
  },
  teal: {
    border: "border-teal-500",
    badge: "bg-teal-500",
    ring: "ring-2 ring-teal-400/60 ring-offset-2",
    shadow: "rgba(20, 184, 166, 0.15)",
    glow: "linear-gradient(135deg, #14b8a6, #0f766e)",
    pillBorder: "#14b8a6",
  },
  red: {
    border: "border-red-500",
    badge: "bg-red-500",
    ring: "ring-2 ring-red-400/60 ring-offset-2",
    shadow: "rgba(239, 68, 68, 0.15)",
    glow: "linear-gradient(135deg, #ef4444, #b91c1c)",
    pillBorder: "#ef4444",
  },
  green: {
    border: "border-green-500",
    badge: "bg-green-500",
    ring: "ring-2 ring-green-400/60 ring-offset-2",
    shadow: "rgba(34, 197, 94, 0.15)",
    glow: "linear-gradient(135deg, #22c55e, #15803d)",
    pillBorder: "#22c55e",
  },
  purple: {
    border: "border-purple-500",
    badge: "bg-purple-500",
    ring: "ring-2 ring-purple-400/60 ring-offset-2",
    shadow: "rgba(168, 85, 247, 0.15)",
    glow: "linear-gradient(135deg, #a855f7, #7e22ce)",
    pillBorder: "#a855f7",
  },
  orange: {
    border: "border-orange-500",
    badge: "bg-orange-500",
    ring: "ring-2 ring-orange-400/60 ring-offset-2",
    shadow: "rgba(251, 146, 60, 0.15)",
    glow: "linear-gradient(135deg, #fb923c, #ea580c)",
    pillBorder: "#fb923c",
  },
  pink: {
    border: "border-pink-500",
    badge: "bg-pink-500",
    ring: "ring-2 ring-pink-400/60 ring-offset-2",
    shadow: "rgba(236, 72, 153, 0.15)",
    glow: "linear-gradient(135deg, #ec4899, #be185d)",
    pillBorder: "#ec4899",
  },
  yellow: {
    border: "border-yellow-500",
    badge: "bg-yellow-500",
    ring: "ring-2 ring-yellow-400/60 ring-offset-2",
    shadow: "rgba(234, 179, 8, 0.15)",
    glow: "linear-gradient(135deg, #eab308, #a16207)",
    pillBorder: "#eab308",
  },
  gray: {
    border: "border-gray-500",
    badge: "bg-gray-500",
    ring: "ring-2 ring-gray-400/60 ring-offset-2",
    shadow: "rgba(107, 114, 128, 0.15)",
    glow: "linear-gradient(135deg, #6b7280, #374151)",
    pillBorder: "#6b7280",
  },
  indigo: {
    border: "border-indigo-500",
    badge: "bg-indigo-500",
    ring: "ring-2 ring-indigo-400/60 ring-offset-2",
    shadow: "rgba(99, 102, 241, 0.15)",
    glow: "linear-gradient(135deg, #6366f1, #4338ca)",
    pillBorder: "#6366f1",
  },
  cyan: {
    border: "border-cyan-500",
    badge: "bg-cyan-500",
    ring: "ring-2 ring-cyan-400/60 ring-offset-2",
    shadow: "rgba(6, 182, 212, 0.15)",
    glow: "linear-gradient(135deg, #06b6d4, #0e7490)",
    pillBorder: "#06b6d4",
  },
  slate: {
    border: "border-slate-500",
    badge: "bg-slate-500",
    ring: "ring-2 ring-slate-400/60 ring-offset-2",
    shadow: "rgba(100, 116, 139, 0.15)",
    glow: "linear-gradient(135deg, #64748b, #334155)",
    pillBorder: "#64748b",
  },
  amber: {
    border: "border-amber-500",
    badge: "bg-amber-500",
    ring: "ring-2 ring-amber-400/60 ring-offset-2",
    shadow: "rgba(245, 158, 11, 0.15)",
    glow: "linear-gradient(135deg, #f59e0b, #b45309)",
    pillBorder: "#f59e0b",
  },
  emerald: {
    border: "border-emerald-500",
    badge: "bg-emerald-500",
    ring: "ring-2 ring-emerald-400/60 ring-offset-2",
    shadow: "rgba(16, 185, 129, 0.15)",
    glow: "linear-gradient(135deg, #10b981, #047857)",
    pillBorder: "#10b981",
  },
  violet: {
    border: "border-violet-500",
    badge: "bg-violet-500",
    ring: "ring-2 ring-violet-400/60 ring-offset-2",
    shadow: "rgba(139, 92, 246, 0.15)",
    glow: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    pillBorder: "#8b5cf6",
  },
  rose: {
    border: "border-rose-500",
    badge: "bg-rose-500",
    ring: "ring-2 ring-rose-400/60 ring-offset-2",
    shadow: "rgba(244, 63, 94, 0.15)",
    glow: "linear-gradient(135deg, #f43f5e, #be123c)",
    pillBorder: "#f43f5e",
  },
};

interface Data {
  mode: "simple" | "full";
  step: {
    id: string;
    title: string;
    summary?: string;
  };
  custom: {
    icon?: string;
    type?: string;
    title?: string;
    summary?: string;
    url?: string;
    color?: string;
    properties?: Record<string, string | number>;
    menu?: MenuItem[];
    height?: number;
  };
}

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}

function getPalette(color: string | undefined) {
  return PALETTES[(color as CustomColor) || "blue"] ?? PALETTES.blue;
}

function GlowHandle({
  side,
  gradient,
}: {
  side: "left" | "right";
  gradient: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        [side]: -6,
        transform: "translateY(-50%)",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: gradient,
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: "ec-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
}

export default memo(function CustomNode({ data, selected }: any) {
  const { mode, custom: customProps, step } = data as Data;
  const {
    color = "blue",
    title = step?.title || "Custom",
    icon = "CubeIcon",
    type = "Custom",
    summary = step?.summary || "",
    url,
    properties = EMPTY_OBJECT,
    menu = EMPTY_ARRAY,
    height = 5,
  } = customProps;

  const palette = getPalette(color);
  const IconComponent = useMemo<
    ComponentType<{ className?: string }> | undefined
  >(() => Icons[icon as keyof typeof Icons] || Icons.CubeIcon, [icon]);
  const portalContainer = usePortalContainer();
  const targetConnections = useNodeConnections({ handleType: "target" });
  const sourceConnections = useNodeConnections({ handleType: "source" });
  const propertyEntries = Object.entries(properties);
  const contextMenuItems = url
    ? [{ label: `Open ${type.toLowerCase()}`, url }, ...menu]
    : menu;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <div
          className={classNames(
            "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
            selected ? palette.ring : "",
            palette.border,
          )}
          style={{
            background: "var(--ec-custom-node-bg, rgb(var(--ec-card-bg)))",
            boxShadow: `0 2px 12px ${palette.shadow}`,
            minHeight: mode === "full" ? `${height}em` : undefined,
          }}
        >
          <Handle
            type="target"
            position={Position.Left}
            style={HIDDEN_HANDLE_STYLE}
          />
          <Handle
            type="source"
            position={Position.Right}
            style={HIDDEN_HANDLE_STYLE}
          />
          {targetConnections.length > 0 && (
            <GlowHandle side="left" gradient={palette.glow} />
          )}
          {sourceConnections.length > 0 && (
            <GlowHandle side="right" gradient={palette.glow} />
          )}

          <div className="absolute -top-3 left-2.5 z-10">
            <span
              className={classNames(
                "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
                palette.badge,
              )}
            >
              {IconComponent && (
                <IconComponent className="w-2.5 h-2.5" aria-hidden />
              )}
              {type}
            </span>
          </div>

          <div className="px-3 pt-3.5 pb-2.5">
            <div className="flex items-center gap-2">
              <TruncatedResourceName
                value={title}
                tooltipBorderColor={palette.pillBorder}
                className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))] truncate"
              >
                {title}
              </TruncatedResourceName>
            </div>

            {mode === "full" && summary && (
              <div
                className="mt-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed overflow-hidden"
                style={LINE_CLAMP_STYLE}
                title={summary}
              >
                {summary}
              </div>
            )}

            {mode === "full" && propertyEntries.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-[rgb(var(--ec-page-border))] grid grid-cols-2 gap-x-2 gap-y-1">
                {propertyEntries.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <div className="text-[7px] font-bold uppercase tracking-wide text-[rgb(var(--ec-page-text-muted))] truncate">
                      {key}
                    </div>
                    {typeof value === "string" && value.startsWith("http") ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[8px] text-blue-500 underline truncate"
                        title={value}
                      >
                        {value}
                      </a>
                    ) : (
                      <div
                        className="text-[8px] text-[rgb(var(--ec-page-text))] truncate"
                        title={String(value)}
                      >
                        {value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ContextMenu.Trigger>
      {contextMenuItems.length > 0 && (
        <ContextMenu.Portal container={portalContainer}>
          <ContextMenu.Content className="min-w-[220px] bg-[rgb(var(--ec-card-bg))] rounded-md p-1 shadow-md border border-[rgb(var(--ec-page-border))]">
            {contextMenuItems.map((item) => (
              <ContextMenu.Item
                asChild
                key={`${item.label}-${item.url || ""}`}
                className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[rgb(var(--ec-page-text))] no-underline"
                >
                  {item.label}
                </a>
              </ContextMenu.Item>
            ))}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
});
