import { type CSSProperties, memo, useMemo } from "react";
import { ServerIcon, Globe } from "lucide-react";
import { CustomIcon, isIconPath } from "../../utils/custom-icon";
import { getNodeCardStyle, useNodeColorStyles } from "../../utils/node-color";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position } from "@xyflow/react";
import { useNodeHasConnections } from "../../utils/node-connections";
import { EventCatalogResource, Service as ServiceType } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import {
  LINE_CLAMP_STYLE,
  WATERMARK_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
  HANDLE_GLOW,
} from "../shared-styles";
import { TruncatedResourceName } from "../TruncatedResourceName";
import { FocusedResourceIndicator } from "../FocusedResourceIndicator";

const SPEC_LABELS: Record<string, string> = {
  openapi: "OpenAPI",
  asyncapi: "AsyncAPI",
  graphql: "GraphQL",
  generic: "Spec",
};

const SPEC_COLORS: Record<
  string,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  openapi: {
    bg: "rgba(106,170,63,0.12)",
    text: "#2a7e3b",
    darkBg: "rgba(106,170,63,0.2)",
    darkText: "#65ba74",
  },
  asyncapi: {
    bg: "rgba(116,78,194,0.12)",
    text: "#6550b9",
    darkBg: "rgba(116,78,194,0.2)",
    darkText: "#c2b5f5",
  },
  graphql: {
    bg: "rgba(229,53,171,0.12)",
    text: "#c2298a",
    darkBg: "rgba(229,53,171,0.2)",
    darkText: "#e7acd0",
  },
  generic: {
    bg: "rgba(141,141,141,0.12)",
    text: "#838383",
    darkBg: "rgba(141,141,141,0.2)",
    darkText: "#cecece",
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
        fill="#bbbbbb"
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
  colorStyle,
}: {
  side: "left" | "right";
  external?: boolean;
  colorStyle?: CSSProperties;
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
        background: external
          ? "linear-gradient(135deg, #8e4ec6, #8145b5)"
          : "linear-gradient(135deg, #d6409f, #c2298a)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...(external ? HANDLE_GLOW.external : HANDLE_GLOW.service),
        ...colorStyle,
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
  gradient: "linear-gradient(135deg, #f6cee7 0%, #e7acd0 40%, #d6409f 100%)",
  draftBorder: "rgba(214, 64, 159, 0.5)",
  corner: "#cf3897",
  ring: "ring-2 ring-[#dd93c2]/60 ring-offset-1",
  iconClass: "w-3 h-3 text-[#651249]/50",
  labelClass:
    "text-[8px] font-bold text-[#651249]/50 uppercase tracking-widest",
  nameText: "text-[#651249]",
  nameTextDeprecated: "text-[#651249]/40 line-through",
  versionClass: "text-[9px] text-[#651249]/40 font-semibold mt-0.5",
  summaryClass:
    "mt-2 pt-1.5 border-t border-[#651249]/10 text-[9px] text-[#651249]/60 leading-relaxed overflow-hidden",
  tooltipBorderColor: "#d6409f",
};

const POST_IT_EXTERNAL: PostItPalette = {
  Icon: Globe,
  label: "External System",
  gradient: "linear-gradient(135deg, #ead5f9 0%, #be93e4 40%, #8e4ec6 100%)",
  draftBorder: "rgba(142, 78, 198, 0.5)",
  corner: "#8145b5",
  ring: "ring-2 ring-[#be93e4]/60 ring-offset-1",
  iconClass: "w-3 h-3 text-[#402060]/50",
  labelClass:
    "text-[8px] font-bold text-[#402060]/50 uppercase tracking-widest",
  nameText: "text-[#402060]",
  nameTextDeprecated: "text-[#402060]/40 line-through",
  versionClass: "text-[9px] text-[#402060]/40 font-semibold mt-0.5",
  summaryClass:
    "mt-2 pt-1.5 border-t border-[#402060]/10 text-[9px] text-[#402060]/60 leading-relaxed overflow-hidden",
  tooltipBorderColor: "#8e4ec6",
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
  ring: "ring-2 ring-[#dd93c2]/60 ring-offset-2",
  borderSolid: "border-[#d6409f]",
  borderDraftDark: "border-dashed border-[#dd93c2]",
  borderDraftLight: "border-dashed border-[#dd93c2]/60",
  draftStripeDark: "rgba(214,64,159,0.25)",
  draftStripeLight: "rgba(214,64,159,0.15)",
  nodeBgVar: "var(--ec-service-node-bg, rgb(var(--ec-card-bg)))",
  shadowColor: "rgba(214, 64, 159, 0.15)",
  badgeBg: "bg-[#d6409f]",
  ownerAccent: "bg-[#dd93c2]",
  ownerBorder: "rgba(214,64,159,0.08)",
  ownerIcon: "text-[#e7acd0]",
  tooltipBorderColor: "#d6409f",
};

const DEFAULT_EXTERNAL: DefaultPalette = {
  Icon: Globe,
  label: "External System",
  ring: "ring-2 ring-[#be93e4]/60 ring-offset-2",
  borderSolid: "border-[#8e4ec6]",
  borderDraftDark: "border-dashed border-[#be93e4]",
  borderDraftLight: "border-dashed border-[#be93e4]/60",
  draftStripeDark: "rgba(142,78,198,0.25)",
  draftStripeLight: "rgba(142,78,198,0.15)",
  nodeBgVar: "var(--ec-external-node-bg, rgb(var(--ec-card-bg)))",
  shadowColor: "rgba(142, 78, 198, 0.15)",
  badgeBg: "bg-[#8e4ec6]",
  ownerAccent: "bg-[#be93e4]",
  ownerBorder: "rgba(142,78,198,0.08)",
  ownerIcon: "text-[#d1afec]",
  tooltipBorderColor: "#8e4ec6",
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
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const typeLabel = styles?.node?.label || p.label;

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? p.ring : "",
      )}
      style={nodeColor?.ring}
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
          background: nodeColor?.paper ?? p.gradient,
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(1deg)",
          border: deprecated
            ? "2px dashed rgba(229, 72, 77, 0.5)"
            : draft
              ? `2px dashed ${nodeColor?.paperDraftBorder ?? p.draftBorder}`
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
            borderColor: `${nodeColor?.corner ?? p.corner} transparent transparent transparent`,
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <p.Icon
              className={p.iconClass}
              strokeWidth={2.5}
              style={nodeColor?.muted}
            />
            <span className={p.labelClass} style={nodeColor?.muted}>
              {typeLabel}
            </span>
          </div>
          {draft && (
            <span className="text-[8px] font-extrabold text-[#4f3422] bg-[#fff7c2] border border-dashed border-[#e2a336] px-1.5 py-0.5 rounded uppercase">
              Draft
            </span>
          )}
          {deprecated && (
            <span className="text-[7px] font-bold text-white bg-[#e5484d] border border-[#dc3e42] px-1.5 py-0.5 rounded uppercase">
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
            tooltipBorderColor={
              nodeColor?.tooltipBorder ?? p.tooltipBorderColor
            }
            style={
              nodeColor &&
              (deprecated ? nodeColor.nameDeprecated : nodeColor.name)
            }
            className={classNames(
              "text-[13px] font-bold leading-snug min-w-0 truncate",
              deprecated ? p.nameTextDeprecated : p.nameText,
            )}
          >
            {name}
          </TruncatedResourceName>
        </div>

        {version && (
          <div className={p.versionClass} style={nodeColor?.version}>
            v{version}
          </div>
        )}

        {mode === "full" && summary && (
          <div
            className={p.summaryClass}
            style={
              nodeColor
                ? { ...LINE_CLAMP_STYLE, ...nodeColor.summary }
                : LINE_CLAMP_STYLE
            }
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
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const owners = useMemo(
    () => normalizeOwners(props.data.service.owners),
    [props.data.service.owners],
  );
  const connected = useNodeHasConnections();
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(229,72,77,0.25)"
    : "rgba(229,72,77,0.1)";

  const p = externalSystem ? DEFAULT_EXTERNAL : DEFAULT_SERVICE;
  const typeLabel = styles?.node?.label || p.label;
  const draftStripe =
    nodeColor?.draftStripe ?? (isDark ? p.draftStripeDark : p.draftStripeLight);
  const borderDraft = isDark ? p.borderDraftDark : p.borderDraftLight;

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? p.ring : "",
        deprecated
          ? "border-dashed border-[#e5484d]"
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
        ...(nodeColor && getNodeCardStyle(nodeColor, { deprecated, draft })),
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
      {connected.target && (
        <GlowHandle
          side="left"
          colorStyle={nodeColor?.glow}
          external={externalSystem}
        />
      )}
      {connected.source && (
        <GlowHandle
          side="right"
          colorStyle={nodeColor?.glow}
          external={externalSystem}
        />
      )}

      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-[#e5484d]" : p.badgeBg,
          )}
          style={deprecated ? undefined : nodeColor?.badge}
        >
          <p.Icon className="w-2.5 h-2.5" strokeWidth={2.5} />
          {typeLabel}
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
              tooltipBorderColor={
                nodeColor?.tooltipBorder ?? p.tooltipBorderColor
              }
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
            borderColor={nodeColor?.ownerBorder ?? p.ownerBorder}
            iconClass={p.ownerIcon}
            accentStyle={nodeColor?.ownerAccent}
            iconStyle={nodeColor?.ownerIcon}
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
