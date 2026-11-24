import { type CSSProperties, memo, useMemo } from "react";
import { Zap } from "lucide-react";
import {
  OwnerIndicator,
  normalizeOwners,
  HIDDEN_HANDLE_STYLE,
} from "../OwnerIndicator";
import { Node, Handle, Position } from "@xyflow/react";
import { useNodeHasConnections } from "../../utils/node-connections";
import { Message, EventCatalogResource } from "../../types";
import { NotesIndicator } from "../NotesIndicator";
import { MethodBadge, ApiPath, StatusCodes } from "../ApiInfo";
import {
  LINE_CLAMP_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
  HANDLE_GLOW,
} from "../shared-styles";
import { CustomIcon, isIconPath } from "../../utils/custom-icon";
import { getNodeCardStyle, useNodeColorStyles } from "../../utils/node-color";
import { TruncatedResourceName } from "../TruncatedResourceName";
import { FocusedResourceIndicator } from "../FocusedResourceIndicator";

const GlowHandle = memo(function GlowHandle({
  side,
  colorStyle,
}: {
  side: "left" | "right";
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
        background: "linear-gradient(135deg, #f76b15, #ef5f00)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...HANDLE_GLOW.event,
        ...colorStyle,
        pointerEvents: "none",
      }}
    />
  );
});

// The event's orange is Radix's orange scale (as Vercel's Geist palette): 9 #f76b15 for borders, the badge and the
// handles, 10 #ef5f00, 8 #ec9455 and 7 #f5ae73 for lighter accents, 12 #582d1d for text on the post-it's paper

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type MessageNodeData = EventCatalogResource & {
  message: Message;
};

export type EventNode = Node<MessageNodeData, "event">;

function PostItEvent(props: EventNode) {
  const { version, name, summary, deprecated, draft, notes, styles } =
    props?.data?.message;
  const mode = props?.data?.mode || "simple";
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const typeLabel = styles?.node?.label || "Event";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-[#f76b15]/50 ring-offset-1" : "",
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
      {/* Inner wrapper with rotation — keeps handles aligned to the unrotated bounding box */}
      <div
        className="absolute inset-0"
        style={{
          background:
            nodeColor?.paper ??
            "linear-gradient(135deg, #ffdfb5 0%, #ffc182 40%, #ec9455 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          border: deprecated
            ? "2px dashed rgba(229, 72, 77, 0.5)"
            : draft
              ? `2px dashed ${nodeColor?.paperDraftBorder ?? "rgba(247, 107, 21, 0.5)"}`
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
            borderColor: `${nodeColor?.corner ?? "#ef5f00"} transparent transparent transparent`,
            opacity: 0.3,
          }}
        />
      </div>

      {/* Content sits on top, unrotated, so text stays crisp */}
      <div className="relative px-3.5 py-3">
        {/* Type label row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Zap
              className="w-3 h-3 text-[#582d1d]/50"
              strokeWidth={2.5}
              style={nodeColor?.muted}
            />
            <span
              className="text-[8px] font-bold text-[#582d1d]/50 uppercase tracking-widest"
              style={nodeColor?.muted}
            >
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

        {/* Name */}
        <div className="flex items-center gap-2">
          {customIcon && (
            <CustomIcon
              src={customIcon}
              alt={name}
              className={
                mode === "full"
                  ? "w-5 h-5 shrink-0 mt-0.5"
                  : "w-4 h-4 shrink-0 -my-1"
              }
            />
          )}
          <TruncatedResourceName
            as="div"
            value={name}
            tooltipBorderColor={nodeColor?.tooltipBorder ?? "#f76b15"}
            style={
              nodeColor &&
              (deprecated ? nodeColor.nameDeprecated : nodeColor.name)
            }
            className={classNames(
              "text-[13px] font-bold leading-snug min-w-0 truncate",
              deprecated ? "text-[#582d1d]/40 line-through" : "text-[#582d1d]",
            )}
          >
            {name}
          </TruncatedResourceName>
        </div>

        {/* Version */}
        {version && (
          <div
            className="text-[9px] text-[#582d1d]/40 font-semibold mt-0.5"
            style={nodeColor?.version}
          >
            v{version}
          </div>
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-[#582d1d]/10 text-[9px] text-[#582d1d]/60 leading-relaxed overflow-hidden"
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
      </div>
    </div>
  );
}

function DefaultEvent(props: EventNode) {
  const {
    version,
    name,
    summary,
    deprecated,
    draft,
    schema,
    notes,
    method,
    path,
    statusCodes,
    styles,
  } = props?.data?.message;
  const mode = props?.data?.mode || "simple";
  const hasApiInfo = !!(method || path);
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const typeLabel = styles?.node?.label || "Event";
  const owners = useMemo(
    () => normalizeOwners(props?.data?.message?.owners),
    [props?.data?.message?.owners],
  );
  const connected = useNodeHasConnections();
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(229,72,77,0.25)"
    : "rgba(229,72,77,0.1)";
  const draftStripe =
    nodeColor?.draftStripe ??
    (isDark ? "rgba(247,107,21,0.25)" : "rgba(247,107,21,0.14)");

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-[#f76b15]/50 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-[#e5484d]"
          : draft
            ? `border-dashed ${isDark ? "border-[#ec9455]" : "border-[#ec9455]/70"}`
            : "border-[#f76b15]",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-event-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), var(--ec-event-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-event-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(247, 107, 21, 0.12)",
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
      {connected.target && (
        <GlowHandle side="left" colorStyle={nodeColor?.glow} />
      )}
      {connected.source && (
        <GlowHandle side="right" colorStyle={nodeColor?.glow} />
      )}

      {/* Type badge top-left */}
      <div className="absolute -top-2.5 left-2.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-[#e5484d]" : "bg-[#f76b15]",
          )}
          style={deprecated ? undefined : nodeColor?.badge}
        >
          <Zap className="w-2.5 h-2.5" strokeWidth={2.5} />
          {typeLabel}
          {draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>
      {/* Schema badge top-right */}
      {schema && (
        <span
          className="z-10 text-[7px] font-semibold text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg))] border border-[#f76b15] rounded-full px-1.5 py-0.5 uppercase tracking-wide"
          style={{
            position: "absolute",
            top: -8,
            right: 10,
            ...nodeColor?.outline,
          }}
        >
          {schema.includes(".") ? schema.split(".").pop() : schema}
        </span>
      )}

      <div className="px-3 pt-3.5 pb-2.5">
        {/* API method + path row */}
        {hasApiInfo && (
          <div className="flex items-center gap-1.5 mb-1 overflow-hidden min-w-0">
            {method && <MethodBadge method={method} />}
            {path && <ApiPath path={path} />}
          </div>
        )}

        {/* Name + version */}
        {!hasApiInfo && (
          <div className="flex items-center gap-2">
            {customIcon && (
              <CustomIcon
                src={customIcon}
                alt={name}
                className={
                  mode === "full"
                    ? "w-5 h-5 shrink-0 mt-0.5"
                    : "w-4 h-4 shrink-0 -my-1"
                }
              />
            )}
            <div className="flex items-baseline gap-1 min-w-0">
              <TruncatedResourceName
                value={name}
                tooltipBorderColor={nodeColor?.tooltipBorder ?? "#f76b15"}
                className="text-[13px] font-semibold leading-snug text-[rgb(var(--ec-page-text))] truncate"
              >
                {name}
              </TruncatedResourceName>
              {version && (
                <span
                  className="text-[10px] font-normal shrink-0"
                  style={{ color: isDark ? "#d4d4d4" : "#737373" }}
                >
                  (v{version})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-1.5 text-[9px] leading-relaxed overflow-hidden"
            style={{
              ...LINE_CLAMP_STYLE,
              color: isDark ? "#ededed" : "#404040",
            }}
            title={summary}
          >
            {summary}
          </div>
        )}

        {/* Status codes */}
        {statusCodes && statusCodes.length > 0 && (
          <StatusCodes codes={statusCodes} />
        )}

        {/* Owners + Notes row */}
        <div className="flex items-end justify-between">
          <OwnerIndicator
            owners={owners}
            accentColor="bg-[#ec9455]"
            borderColor={nodeColor?.ownerBorder ?? "rgba(247,107,21,0.08)"}
            iconClass="text-[#f5ae73]"
            accentStyle={nodeColor?.ownerAccent}
            iconStyle={nodeColor?.ownerIcon}
          />
          {notes && notes.length > 0 && (
            <NotesIndicator notes={notes} resourceName={name} />
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(function Event(props: EventNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItEvent {...props} />;
  }

  return <DefaultEvent {...props} />;
});
