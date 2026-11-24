import { type CSSProperties, memo, useMemo } from "react";
import { MessageSquare } from "lucide-react";
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
import { CustomIcon, isIconPath } from "../../utils/custom-icon";
import { getNodeCardStyle, useNodeColorStyles } from "../../utils/node-color";
import {
  LINE_CLAMP_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
  HANDLE_GLOW,
} from "../shared-styles";
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
        background: "linear-gradient(135deg, #0090ff, #0d74ce)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...HANDLE_GLOW.command,
        ...colorStyle,
        pointerEvents: "none",
      }}
    />
  );
});

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type CommandNodeData = EventCatalogResource & {
  message: Message;
};

export type CommandNode = Node<CommandNodeData, "command">;

function PostItCommand(props: CommandNode) {
  const { version, name, summary, deprecated, draft, notes, styles } =
    props.data.message;
  const mode = props.data.mode || "simple";
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const typeLabel = styles?.node?.label || "Command";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-[#5eb1ef]/60 ring-offset-1" : "",
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
      <div
        className="absolute inset-0"
        style={{
          background:
            nodeColor?.paper ??
            "linear-gradient(135deg, #c2e5ff 0%, #8ec8f6 40%, #0090ff 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(-1deg)",
          border: deprecated
            ? "2px dashed rgba(229, 72, 77, 0.5)"
            : draft
              ? `2px dashed ${nodeColor?.paperDraftBorder ?? "rgba(0, 144, 255, 0.5)"}`
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
            borderColor: `${nodeColor?.corner ?? "#0d74ce"} transparent transparent transparent`,
            opacity: 0.3,
          }}
        />
      </div>

      <div className="relative px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <MessageSquare
              className="w-3 h-3 text-[#113264]/50"
              strokeWidth={2.5}
              style={nodeColor?.muted}
            />
            <span
              className="text-[8px] font-bold text-[#113264]/50 uppercase tracking-widest"
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
            tooltipBorderColor={nodeColor?.tooltipBorder ?? "#0090ff"}
            style={
              nodeColor &&
              (deprecated ? nodeColor.nameDeprecated : nodeColor.name)
            }
            className={classNames(
              "text-[13px] font-bold leading-snug min-w-0 truncate",
              deprecated ? "text-[#113264]/40 line-through" : "text-[#113264]",
            )}
          >
            {name}
          </TruncatedResourceName>
        </div>

        {version && (
          <div
            className="text-[9px] text-[#113264]/40 font-semibold mt-0.5"
            style={nodeColor?.version}
          >
            v{version}
          </div>
        )}

        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-[#113264]/10 text-[9px] text-[#113264]/60 leading-relaxed overflow-hidden"
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

function DefaultCommand(props: CommandNode) {
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
  } = props.data.message;
  const mode = props.data.mode || "simple";
  const hasApiInfo = !!(method || path);
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const typeLabel = styles?.node?.label || "Command";
  const owners = useMemo(
    () => normalizeOwners(props.data.message?.owners),
    [props.data.message?.owners],
  );
  const connected = useNodeHasConnections();
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(229,72,77,0.25)"
    : "rgba(229,72,77,0.1)";
  const draftStripe =
    nodeColor?.draftStripe ??
    (isDark ? "rgba(0,144,255,0.25)" : "rgba(0,144,255,0.15)");

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-[#5eb1ef]/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-[#e5484d]"
          : draft
            ? `border-dashed ${isDark ? "border-[#5eb1ef]" : "border-[#5eb1ef]/60"}`
            : "border-[#0090ff]",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-command-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), var(--ec-command-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-command-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(0, 144, 255, 0.15)",
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
            deprecated ? "bg-[#e5484d]" : "bg-[#0090ff]",
          )}
          style={deprecated ? undefined : nodeColor?.badge}
        >
          <MessageSquare className="w-2.5 h-2.5" strokeWidth={2.5} />
          {typeLabel}
          {draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>
      {/* Schema badge top-right */}
      {schema && (
        <span
          className="z-10 text-[7px] font-semibold text-[rgb(var(--ec-page-text))] bg-[rgb(var(--ec-card-bg))] border border-[#0090ff] rounded-full px-1.5 py-0.5 uppercase tracking-wide"
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
                tooltipBorderColor={nodeColor?.tooltipBorder ?? "#0090ff"}
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
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-1.5 text-[9px] text-[rgb(var(--ec-page-text-muted))] leading-relaxed overflow-hidden"
            style={LINE_CLAMP_STYLE}
            title={summary}
          >
            {summary}
          </div>
        )}

        {/* Status codes */}
        {statusCodes && statusCodes.length > 0 && (
          <StatusCodes codes={statusCodes} />
        )}

        {/* Owners */}
        <OwnerIndicator
          owners={owners}
          accentColor="bg-[#5eb1ef]"
          borderColor={nodeColor?.ownerBorder ?? "rgba(0,144,255,0.08)"}
          iconClass="text-[#8ec8f6]"
          accentStyle={nodeColor?.ownerAccent}
          iconStyle={nodeColor?.ownerIcon}
        />
      </div>
    </div>
  );
}

export default memo(function Command(props: CommandNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItCommand {...props} />;
  }

  return <DefaultCommand {...props} />;
});
