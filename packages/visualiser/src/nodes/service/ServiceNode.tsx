import { memo, useMemo } from "react";
import { ServerIcon, Globe } from "lucide-react";
import { CustomIcon, isIconPath } from "../../utils/custom-icon";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position, useNodeConnections } from "@xyflow/react";
import { EventCatalogResource, Service as ServiceType } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import {
  LINE_CLAMP_STYLE,
  WATERMARK_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
} from "../shared-styles";
import { TruncatedResourceName } from "../TruncatedResourceName";
import { FocusedResourceIndicator } from "../FocusedResourceIndicator";

const SPEC_LABELS: Record<string, string> = {
  openapi: "OpenAPI",
  asyncapi: "AsyncAPI",
  graphql: "GraphQL",
};

const SPEC_COLORS: Record<
  string,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  openapi: {
    bg: "rgba(106,170,63,0.12)",
    text: "#4d7c0f",
    darkBg: "rgba(106,170,63,0.2)",
    darkText: "#a3e635",
  },
  asyncapi: {
    bg: "rgba(116,78,194,0.12)",
    text: "#6d28d9",
    darkBg: "rgba(116,78,194,0.2)",
    darkText: "#c4b5fd",
  },
  graphql: {
    bg: "rgba(229,53,171,0.12)",
    text: "#be185d",
    darkBg: "rgba(229,53,171,0.2)",
    darkText: "#f9a8d4",
  },
};

/** Normalize both array and legacy object spec formats into unique type strings */
function normalizeSpecTypes(specs: unknown): string[] {
  const types = new Set<string>();
  if (Array.isArray(specs)) {
    for (const spec of specs) {
      if (spec?.type) types.add(String(spec.type).toLowerCase());
    }
  } else if (specs && typeof specs === "object") {
    const legacy = specs as Record<string, unknown>;
    if (legacy.asyncapiPath) types.add("asyncapi");
    if (legacy.openapiPath) types.add("openapi");
    if (legacy.graphqlPath) types.add("graphql");
  }
  return Array.from(types);
}

const SpecBadges = memo(function SpecBadges({
  specifications,
  isDark,
}: {
  specifications: unknown;
  isDark: boolean;
}) {
  const specTypes = useMemo(
    () => normalizeSpecTypes(specifications),
    [specifications],
  );

  if (specTypes.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap justify-end">
      {specTypes.map((type) => {
        const colors = SPEC_COLORS[type] || SPEC_COLORS.openapi;
        return (
          <span
            key={type}
            className="inline-flex items-center text-[7px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: isDark ? colors.darkBg : colors.bg,
              color: isDark ? colors.darkText : colors.text,
            }}
          >
            {SPEC_LABELS[type] || type}
          </span>
        );
      })}
    </div>
  );
});

const MiniEnvelope = memo(function MiniEnvelope({
  side,
  delay,
}: {
  side: "left" | "right";
  delay: number;
}) {
  return (
    <svg
      width="14"
      height="10"
      viewBox="0 0 14 10"
      style={{
        animation: `${side === "left" ? "ec-svc-msg-in" : "ec-svc-msg-out"} 2.5s ease-in-out ${delay}s infinite`,
        opacity: 0,
      }}
    >
      <rect
        x="0.5"
        y="0.5"
        width="13"
        height="9"
        rx="1.5"
        fill="#9ca3af"
        opacity={0.85}
      />
      <path
        d="M0.5,0.5 L7,5 L13.5,0.5"
        fill="none"
        stroke="white"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
});

const ServiceMessageFlow = memo(function ServiceMessageFlow({
  side,
}: {
  side: "left" | "right";
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        [side]: -4,
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        zIndex: 15,
        pointerEvents: "none",
      }}
    >
      <MiniEnvelope side={side} delay={0} />
      <MiniEnvelope side={side} delay={0.8} />
      <MiniEnvelope side={side} delay={1.6} />
    </div>
  );
});

const GlowHandle = memo(function GlowHandle({
  side,
  external,
}: {
  side: "left" | "right";
  external?: boolean;
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
        background: external
          ? "linear-gradient(135deg, #a855f7, #7e22ce)"
          : "linear-gradient(135deg, #ec4899, #be185d)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        animation: external
          ? "ec-external-handle-pulse 2s ease-in-out infinite"
          : "ec-service-handle-pulse 2s ease-in-out infinite",
        pointerEvents: "none",
      }}
    />
  );
});

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type PostItPalette = {
  Icon: typeof ServerIcon;
  label: string;
  gradient: string;
  draftBorder: string;
  corner: string;
  ring: string;
  iconClass: string;
  labelClass: string;
  nameText: string;
  nameTextDeprecated: string;
  versionClass: string;
  summaryClass: string;
  tooltipBorderColor: string;
};

const POST_IT_SERVICE: PostItPalette = {
  Icon: ServerIcon,
  label: "Service",
  gradient: "linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 40%, #ec4899 100%)",
  draftBorder: "rgba(236, 72, 153, 0.5)",
  corner: "#db2777",
  ring: "ring-2 ring-pink-400/60 ring-offset-1",
  iconClass: "w-3 h-3 text-pink-900/50",
  labelClass: "text-[8px] font-bold text-pink-900/50 uppercase tracking-widest",
  nameText: "text-pink-950",
  nameTextDeprecated: "text-pink-950/40 line-through",
  versionClass: "text-[9px] text-pink-900/40 font-semibold mt-0.5",
  summaryClass:
    "mt-2 pt-1.5 border-t border-pink-900/10 text-[9px] text-pink-950/60 leading-relaxed overflow-hidden",
  tooltipBorderColor: "#ec4899",
};

const POST_IT_EXTERNAL: PostItPalette = {
  Icon: Globe,
  label: "External System",
  gradient: "linear-gradient(135deg, #e9d5ff 0%, #c084fc 40%, #a855f7 100%)",
  draftBorder: "rgba(168, 85, 247, 0.5)",
  corner: "#7e22ce",
  ring: "ring-2 ring-purple-400/60 ring-offset-1",
  iconClass: "w-3 h-3 text-purple-900/50",
  labelClass:
    "text-[8px] font-bold text-purple-900/50 uppercase tracking-widest",
  nameText: "text-purple-950",
  nameTextDeprecated: "text-purple-950/40 line-through",
  versionClass: "text-[9px] text-purple-900/40 font-semibold mt-0.5",
  summaryClass:
    "mt-2 pt-1.5 border-t border-purple-900/10 text-[9px] text-purple-950/60 leading-relaxed overflow-hidden",
  tooltipBorderColor: "#a855f7",
};

type DefaultPalette = {
  Icon: typeof ServerIcon;
  label: string;
  ring: string;
  borderSolid: string;
  borderDraftDark: string;
  borderDraftLight: string;
  draftStripeDark: string;
  draftStripeLight: string;
  nodeBgVar: string;
  shadowColor: string;
  badgeBg: string;
  ownerAccent: string;
  ownerBorder: string;
  ownerIcon: string;
  tooltipBorderColor: string;
};

const DEFAULT_SERVICE: DefaultPalette = {
  Icon: ServerIcon,
  label: "Service",
  ring: "ring-2 ring-pink-400/60 ring-offset-2",
  borderSolid: "border-pink-500",
  borderDraftDark: "border-dashed border-pink-400",
  borderDraftLight: "border-dashed border-pink-400/60",
  draftStripeDark: "rgba(236,72,153,0.25)",
  draftStripeLight: "rgba(236,72,153,0.15)",
  nodeBgVar: "var(--ec-service-node-bg, rgb(var(--ec-card-bg)))",
  shadowColor: "rgba(236, 72, 153, 0.15)",
  badgeBg: "bg-pink-500",
  ownerAccent: "bg-pink-400",
  ownerBorder: "rgba(236,72,153,0.08)",
  ownerIcon: "text-pink-300",
  tooltipBorderColor: "#ec4899",
};

const DEFAULT_EXTERNAL: DefaultPalette = {
  Icon: Globe,
  label: "External System",
  ring: "ring-2 ring-purple-400/60 ring-offset-2",
  borderSolid: "border-purple-500",
  borderDraftDark: "border-dashed border-purple-400",
  borderDraftLight: "border-dashed border-purple-400/60",
  draftStripeDark: "rgba(168,85,247,0.25)",
  draftStripeLight: "rgba(168,85,247,0.15)",
  nodeBgVar: "var(--ec-external-node-bg, rgb(var(--ec-card-bg)))",
  shadowColor: "rgba(168, 85, 247, 0.15)",
  badgeBg: "bg-purple-500",
  ownerAccent: "bg-purple-400",
  ownerBorder: "rgba(168,85,247,0.08)",
  ownerIcon: "text-purple-300",
  tooltipBorderColor: "#a855f7",
};

type ServiceNodeData = EventCatalogResource & {
  service: ServiceType;
};

export type ServiceNode = Node<ServiceNodeData, "service">;

function PostItService(props: ServiceNode) {
  const {
    version,
    name,
    summary,
    deprecated,
    draft,
    notes,
    specifications,
    externalSystem,
    styles,
  } = props.data.service;
  const mode = props.data.mode || "simple";
  const isDark = useDarkMode();
  const p = externalSystem ? POST_IT_EXTERNAL : POST_IT_SERVICE;
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? p.ring : "",
      )}
    >
      {props.data.isFocused && <FocusedResourceIndicator />}
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
      {notes && notes.length > 0 && (
        <NotesIndicator notes={notes} resourceName={name} />
      )}
      {/* Inner wrapper with rotation */}
      <div
        className="absolute inset-0"
        style={{
          background: p.gradient,
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(1deg)",
          border: deprecated
            ? "2px dashed rgba(239, 68, 68, 0.5)"
            : draft
              ? `2px dashed ${p.draftBorder}`
              : "none",
        }}
      >
        {/* Folded corner */}
        <div style={FOLDED_CORNER_SHADOW_STYLE} />
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 0,
            height: 0,
            borderStyle: "solid",
            borderWidth: "18px 0 0 18px",
            borderColor: `${p.corner} transparent transparent transparent`,
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <p.Icon className={p.iconClass} strokeWidth={2.5} />
            <span className={p.labelClass}>{p.label}</span>
          </div>
          {draft && (
            <span className="text-[8px] font-extrabold text-amber-900 bg-amber-100 border border-dashed border-amber-400 px-1.5 py-0.5 rounded uppercase">
              Draft
            </span>
          )}
          {deprecated && (
            <span className="text-[7px] font-bold text-white bg-red-500 border border-red-600 px-1.5 py-0.5 rounded uppercase">
              Deprecated
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {customIcon && (
            <CustomIcon
              src={customIcon}
              alt={name}
              className={
                mode === "full"
                  ? "w-[26px] h-[26px] shrink-0"
                  : "w-6 h-6 shrink-0"
              }
            />
          )}
          <TruncatedResourceName
            as="div"
            value={name}
            tooltipBorderColor={p.tooltipBorderColor}
            className={classNames(
              "text-[13px] font-bold leading-snug min-w-0 truncate",
              deprecated ? p.nameTextDeprecated : p.nameText,
            )}
          >
            {name}
          </TruncatedResourceName>
        </div>

        {version && <div className={p.versionClass}>v{version}</div>}

        {mode === "full" && summary && (
          <div
            className={p.summaryClass}
            style={LINE_CLAMP_STYLE}
            title={summary}
          >
            {summary}
          </div>
        )}

        {!!specifications && (
          <div className="mt-1.5 flex justify-end">
            <SpecBadges specifications={specifications} isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultService(props: ServiceNode) {
  const {
    version,
    name,
    summary,
    deprecated,
    draft,
    notes,
    specifications,
    externalSystem,
    styles,
  } = props.data.service;
  const mode = props.data.mode || "simple";
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const owners = useMemo(
    () => normalizeOwners(props.data.service.owners),
    [props.data.service.owners],
  );
  const targetConnections = useNodeConnections({ handleType: "target" });
  const sourceConnections = useNodeConnections({ handleType: "source" });
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(239,68,68,0.25)"
    : "rgba(239,68,68,0.1)";

  const p = externalSystem ? DEFAULT_EXTERNAL : DEFAULT_SERVICE;
  const draftStripe = isDark ? p.draftStripeDark : p.draftStripeLight;
  const borderDraft = isDark ? p.borderDraftDark : p.borderDraftLight;

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? p.ring : "",
        deprecated
          ? "border-dashed border-red-500"
          : draft
            ? borderDraft
            : p.borderSolid,
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), ${p.nodeBgVar}`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), ${p.nodeBgVar}`
            : p.nodeBgVar,
        boxShadow: `0 2px 12px ${p.shadowColor}`,
      }}
    >
      {props.data.isFocused && <FocusedResourceIndicator />}
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
      {notes && notes.length > 0 && (
        <NotesIndicator notes={notes} resourceName={name} />
      )}
      {targetConnections.length > 0 && (
        <GlowHandle side="left" external={externalSystem} />
      )}
      {sourceConnections.length > 0 && (
        <GlowHandle side="right" external={externalSystem} />
      )}

      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-red-500" : p.badgeBg,
          )}
        >
          <p.Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
          {p.label}
          {draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          {customIcon && (
            <CustomIcon
              src={customIcon}
              alt={name}
              className={
                mode === "full"
                  ? "w-[26px] h-[26px] shrink-0"
                  : "w-4 h-4 shrink-0 -my-1"
              }
            />
          )}
          <div className="flex items-baseline gap-1 min-w-0">
            <TruncatedResourceName
              value={name}
              tooltipBorderColor={p.tooltipBorderColor}
              className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))] truncate"
            >
              {name}
            </TruncatedResourceName>
            {version && (
              <span className="text-[10px] font-normal text-[rgb(var(--ec-page-text-muted))] shrink-0">
                (v{version})
              </span>
            )}
          </div>
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

        <div className="flex items-end justify-between gap-1">
          <OwnerIndicator
            owners={owners}
            accentColor={p.ownerAccent}
            borderColor={p.ownerBorder}
            iconClass={p.ownerIcon}
          />
          {!!specifications && (
            <SpecBadges specifications={specifications} isDark={isDark} />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(function Service(props: ServiceNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItService {...props} />;
  }

  return <DefaultService {...props} />;
});
