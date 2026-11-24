import { memo, useMemo, type ComponentType } from "react";
import { Handle, Position } from "@xyflow/react";
import { useNodeHasConnections } from "../utils/node-connections";
import * as Icons from "@heroicons/react/24/solid";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import {
  EMPTY_ARRAY,
  EMPTY_OBJECT,
  LINE_CLAMP_STYLE,
  HANDLE_GLOW,
} from "./shared-styles";
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
    border: "border-[#0090ff]",
    badge: "bg-[#0090ff]",
    ring: "ring-2 ring-[#5eb1ef]/60 ring-offset-2",
    shadow: "rgba(0, 144, 255, 0.15)",
    glow: "linear-gradient(135deg, #0090ff, #0588f0)",
    pillBorder: "#0090ff",
  },
  teal: {
    border: "border-[#12a594]",
    badge: "bg-[#12a594]",
    ring: "ring-2 ring-[#53b9ab]/60 ring-offset-2",
    shadow: "rgba(18, 165, 148, 0.15)",
    glow: "linear-gradient(135deg, #12a594, #008573)",
    pillBorder: "#12a594",
  },
  red: {
    border: "border-[#e5484d]",
    badge: "bg-[#e5484d]",
    ring: "ring-2 ring-[#eb8e90]/60 ring-offset-2",
    shadow: "rgba(229, 72, 77, 0.15)",
    glow: "linear-gradient(135deg, #e5484d, #ce2c31)",
    pillBorder: "#e5484d",
  },
  green: {
    border: "border-[#30a46c]",
    badge: "bg-[#30a46c]",
    ring: "ring-2 ring-[#5bb98b]/60 ring-offset-2",
    shadow: "rgba(48, 164, 108, 0.15)",
    glow: "linear-gradient(135deg, #30a46c, #218358)",
    pillBorder: "#30a46c",
  },
  purple: {
    border: "border-[#8e4ec6]",
    badge: "bg-[#8e4ec6]",
    ring: "ring-2 ring-[#be93e4]/60 ring-offset-2",
    shadow: "rgba(142, 78, 198, 0.15)",
    glow: "linear-gradient(135deg, #8e4ec6, #8145b5)",
    pillBorder: "#8e4ec6",
  },
  orange: {
    border: "border-[#f76b15]",
    badge: "bg-[#f76b15]",
    ring: "ring-2 ring-[#ec9455]/60 ring-offset-2",
    shadow: "rgba(236, 148, 85, 0.15)",
    glow: "linear-gradient(135deg, #ec9455, #ef5f00)",
    pillBorder: "#ec9455",
  },
  pink: {
    border: "border-[#d6409f]",
    badge: "bg-[#d6409f]",
    ring: "ring-2 ring-[#dd93c2]/60 ring-offset-2",
    shadow: "rgba(214, 64, 159, 0.15)",
    glow: "linear-gradient(135deg, #d6409f, #c2298a)",
    pillBorder: "#d6409f",
  },
  // Radix yellow, kept apart from amber. Its badge uses the darker step, as badge text is white
  yellow: {
    border: "border-[#d5ae39]",
    badge: "bg-[#9e6c00]",
    ring: "ring-2 ring-[#e4c767]/60 ring-offset-2",
    shadow: "rgba(255, 230, 41, 0.15)",
    glow: "linear-gradient(135deg, #ffe629, #9e6c00)",
    pillBorder: "#d5ae39",
  },
  gray: {
    border: "border-[#8d8d8d]",
    badge: "bg-[#8d8d8d]",
    ring: "ring-2 ring-[#bbbbbb]/60 ring-offset-2",
    shadow: "rgba(141, 141, 141, 0.15)",
    glow: "linear-gradient(135deg, #8d8d8d, #646464)",
    pillBorder: "#8d8d8d",
  },
  indigo: {
    border: "border-[#3e63dd]",
    badge: "bg-[#3e63dd]",
    ring: "ring-2 ring-[#8da4ef]/60 ring-offset-2",
    shadow: "rgba(62, 99, 221, 0.15)",
    glow: "linear-gradient(135deg, #3e63dd, #3a5bc7)",
    pillBorder: "#3e63dd",
  },
  cyan: {
    border: "border-[#00a2c7]",
    badge: "bg-[#00a2c7]",
    ring: "ring-2 ring-[#3db9cf]/60 ring-offset-2",
    shadow: "rgba(0, 162, 199, 0.15)",
    glow: "linear-gradient(135deg, #00a2c7, #107d98)",
    pillBorder: "#00a2c7",
  },
  // Radix slate, the cool grey, kept apart from gray
  slate: {
    border: "border-[#8b8d98]",
    badge: "bg-[#8b8d98]",
    ring: "ring-2 ring-[#b9bbc6]/60 ring-offset-2",
    shadow: "rgba(139, 141, 152, 0.15)",
    glow: "linear-gradient(135deg, #8b8d98, #60646c)",
    pillBorder: "#8b8d98",
  },
  amber: {
    border: "border-[#ffc53d]",
    badge: "bg-[#ffc53d]",
    ring: "ring-2 ring-[#e2a336]/60 ring-offset-2",
    shadow: "rgba(255, 197, 61, 0.15)",
    glow: "linear-gradient(135deg, #ffc53d, #ab6400)",
    pillBorder: "#ffc53d",
  },
  emerald: {
    border: "border-[#29a383]",
    badge: "bg-[#29a383]",
    ring: "ring-2 ring-[#56ba9f]/60 ring-offset-2",
    shadow: "rgba(41, 163, 131, 0.15)",
    glow: "linear-gradient(135deg, #29a383, #208368)",
    pillBorder: "#29a383",
  },
  violet: {
    border: "border-[#6e56cf]",
    badge: "bg-[#6e56cf]",
    ring: "ring-2 ring-[#aa99ec]/60 ring-offset-2",
    shadow: "rgba(110, 86, 207, 0.15)",
    glow: "linear-gradient(135deg, #6e56cf, #6550b9)",
    pillBorder: "#6e56cf",
  },
  rose: {
    border: "border-[#e93d82]",
    badge: "bg-[#e93d82]",
    ring: "ring-2 ring-[#e093b2]/60 ring-offset-2",
    shadow: "rgba(233, 61, 130, 0.15)",
    glow: "linear-gradient(135deg, #e93d82, #cb1d63)",
    pillBorder: "#e93d82",
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
      className="ec-handle-glow"
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
        ...HANDLE_GLOW.generic,
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
  const connected = useNodeHasConnections();
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
          {connected.target && (
            <GlowHandle side="left" gradient={palette.glow} />
          )}
          {connected.source && (
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
                        className="block text-[8px] text-[#0090ff] underline truncate"
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
                className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-[#ffefd6] rounded-sm flex items-center"
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
