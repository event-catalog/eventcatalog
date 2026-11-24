import { type CSSProperties, memo } from "react";
import { Package } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import { useNodeHasConnections } from "../utils/node-connections";
import { EventCatalogResource } from "../types";
import { NotesIndicator } from "./NotesIndicator";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import {
  LINE_CLAMP_STYLE,
  FOLDED_CORNER_SHADOW_STYLE,
  useDarkMode,
  HANDLE_GLOW,
} from "./shared-styles";
import { CustomIcon, isIconPath } from "../utils/custom-icon";
import { getNodeCardStyle, useNodeColorStyles } from "../utils/node-color";
import { TruncatedResourceName } from "./TruncatedResourceName";

function GlowHandle({
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
        background: "linear-gradient(135deg, #3e63dd, #3a5bc7)",
        border: "2px solid rgb(var(--ec-page-bg))",
        zIndex: 20,
        ...HANDLE_GLOW.dataProduct,
        ...colorStyle,
        pointerEvents: "none",
      }}
    />
  );
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type DataProductNodeData = EventCatalogResource & {
  dataProduct: {
    id: string;
    version: string;
    name: string;
    summary?: string;
    inputs?: any[];
    outputs?: any[];
    owners?: any[];
    deprecated?: boolean;
    draft?: boolean;
    notes?: import("../types").Note[];
    styles?: {
      icon?: string;
      node?: { color?: string; label?: string };
    };
  };
};

export type DataProductNode = Node<DataProductNodeData, "data-product">;

function PostItDataProduct(props: DataProductNode) {
  const { version, name, summary, deprecated, draft, notes, styles } =
    props.data.dataProduct;
  const mode = props.data.mode || "simple";
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const typeLabel = styles?.node?.label || "Data Product";

  return (
    <div
      className={classNames(
        "relative min-w-44 max-w-56 min-h-[120px]",
        props?.selected ? "ring-2 ring-[#8da4ef]/60 ring-offset-1" : "",
      )}
      style={nodeColor?.ring}
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
      {notes && notes.length > 0 && (
        <NotesIndicator notes={notes} resourceName={name} />
      )}
      {/* Inner wrapper with rotation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            nodeColor?.paper ??
            "linear-gradient(135deg, #d2deff 0%, #abbdf9 40%, #3e63dd 100%)",
          boxShadow:
            "1px 1px 3px rgba(0,0,0,0.15), 3px 4px 8px rgba(0,0,0,0.08)",
          transform: "rotate(1deg)",
          border: deprecated
            ? "2px dashed rgba(229, 72, 77, 0.5)"
            : draft
              ? `2px dashed ${nodeColor?.paperDraftBorder ?? "rgba(62, 99, 221, 0.5)"}`
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
            borderColor: `${nodeColor?.corner ?? "#3a5bc7"} transparent transparent transparent`,
            opacity: 0.3,
          }}
        />
      </div>

      {/* Content sits on top, unrotated */}
      <div className="relative px-3.5 py-3">
        {/* Type label row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Package
              className="w-3 h-3 text-[#1f2d5c]/50"
              strokeWidth={2.5}
              style={nodeColor?.muted}
            />
            <span
              className="text-[8px] font-bold text-[#1f2d5c]/50 uppercase tracking-widest"
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
                  ? "w-[26px] h-[26px] shrink-0"
                  : "w-4 h-4 shrink-0 -my-1"
              }
            />
          )}
          <TruncatedResourceName
            as="div"
            value={name}
            tooltipBorderColor={nodeColor?.tooltipBorder ?? "#3e63dd"}
            style={
              nodeColor &&
              (deprecated ? nodeColor.nameDeprecated : nodeColor.name)
            }
            className={classNames(
              "text-[13px] font-bold leading-snug min-w-0 truncate",
              deprecated ? "text-[#1f2d5c]/40 line-through" : "text-[#1f2d5c]",
            )}
          >
            {name}
          </TruncatedResourceName>
        </div>

        {/* Version */}
        {version && (
          <div
            className="text-[9px] text-[#1f2d5c]/40 font-semibold mt-0.5"
            style={nodeColor?.version}
          >
            v{version}
          </div>
        )}

        {/* Summary */}
        {mode === "full" && summary && (
          <div
            className="mt-2 pt-1.5 border-t border-[#1f2d5c]/10 text-[9px] text-[#1f2d5c]/60 leading-relaxed overflow-hidden"
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

function DefaultDataProduct(props: DataProductNode) {
  const { version, name, summary, deprecated, draft, notes, styles } =
    props.data.dataProduct;
  const mode = props.data.mode || "simple";
  const customIcon = isIconPath(styles?.icon) ? styles!.icon! : undefined;
  const nodeColor = useNodeColorStyles(styles?.node?.color);
  const typeLabel = styles?.node?.label || "Data Product";
  const connected = useNodeHasConnections();
  const isDark = useDarkMode();
  const deprecatedStripe = isDark
    ? "rgba(229,72,77,0.25)"
    : "rgba(229,72,77,0.1)";
  const draftStripe =
    nodeColor?.draftStripe ??
    (isDark ? "rgba(62,99,221,0.25)" : "rgba(62,99,221,0.15)");

  return (
    <div
      className={classNames(
        "relative min-w-48 max-w-60 rounded-xl border-2 overflow-visible",
        props?.selected ? "ring-2 ring-[#8da4ef]/60 ring-offset-2" : "",
        deprecated
          ? "border-dashed border-[#e5484d]"
          : draft
            ? `border-dashed ${isDark ? "border-[#8da4ef]" : "border-[#8da4ef]/60"}`
            : "border-[#3e63dd]",
      )}
      style={{
        background: deprecated
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${deprecatedStripe} 6px, ${deprecatedStripe} 7px), var(--ec-dp-node-bg, rgb(var(--ec-card-bg)))`
          : draft
            ? `repeating-linear-gradient(135deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), repeating-linear-gradient(45deg, transparent, transparent 4px, ${draftStripe} 4px, ${draftStripe} 4.5px), var(--ec-dp-node-bg, rgb(var(--ec-card-bg)))`
            : "var(--ec-dp-node-bg, rgb(var(--ec-card-bg)))",
        boxShadow: "0 2px 12px rgba(62, 99, 221, 0.15)",
        ...(nodeColor && getNodeCardStyle(nodeColor, { deprecated, draft })),
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
      {notes && notes.length > 0 && (
        <NotesIndicator notes={notes} resourceName={name} />
      )}
      {connected.target && (
        <GlowHandle side="left" colorStyle={nodeColor?.glow} />
      )}
      {connected.source && (
        <GlowHandle side="right" colorStyle={nodeColor?.glow} />
      )}

      {/* Badge positioned outside top-left corner */}
      <div className="absolute -top-2.5 left-2.5 flex items-center gap-1.5 z-10">
        <span
          className={classNames(
            "inline-flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-white px-1.5 py-0.5 rounded shadow-sm",
            deprecated ? "bg-[#e5484d]" : "bg-[#3e63dd]",
          )}
          style={deprecated ? undefined : nodeColor?.badge}
        >
          <Package className="w-2.5 h-2.5" strokeWidth={2.5} />
          {typeLabel}
          {draft && " (Draft)"}
          {deprecated && " (Deprecated)"}
        </span>
      </div>

      <div className="px-3 pt-3.5 pb-2.5">
        {/* Name + version */}
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
              tooltipBorderColor={nodeColor?.tooltipBorder ?? "#3e63dd"}
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
      </div>
    </div>
  );
}

export default memo(function DataProductNode(props: DataProductNode) {
  const nodeStyle = props?.data?.style;

  if (nodeStyle === "post-it") {
    return <PostItDataProduct {...props} />;
  }

  return <DefaultDataProduct {...props} />;
});
