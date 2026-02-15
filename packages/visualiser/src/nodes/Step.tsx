import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { HIDDEN_HANDLE_STYLE } from "./OwnerIndicator";
import { NODE_WIDTH_STYLE, ROTATED_LABEL_STYLE } from "./shared-styles";

interface Data {
  title: string;
  label: string;
  bgColor: string;
  color: string;
  mode: "simple" | "full";
  step: { id: string; title: string; summary: string };
  showTarget?: boolean;
  showSource?: boolean;
}

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export default memo(function StepNode({
  data,
  sourcePosition,
  targetPosition,
}: any) {
  const { mode, step } = data as Data;

  const { title, summary } = step;

  return (
    <div
      className={classNames(
        "rounded-md border flex justify-start bg-[rgb(var(--ec-card-bg))] text-[rgb(var(--ec-page-text))] border-blue-400 min-h-[3em]",
      )}
      style={NODE_WIDTH_STYLE}
    >
      <div
        className={classNames(
          "bg-gradient-to-b from-gray-700 to-gray-700 relative flex flex-col items-center w-5 justify-end rounded-l-sm text-orange-100-500",
          `border-r-[1px] border-gray-500`,
        )}
      >
        {mode === "full" && (
          <span
            className="text-center text-[9px] text-white font-bold uppercase mb-4"
            style={ROTATED_LABEL_STYLE}
          >
            Step
          </span>
        )}
      </div>
      <div className="p-1 flex-1">
        <Handle
          type="target"
          position={targetPosition || Position.Left}
          style={HIDDEN_HANDLE_STYLE}
        />
        <Handle
          type="source"
          position={sourcePosition || Position.Right}
          style={HIDDEN_HANDLE_STYLE}
        />

        {!summary && (
          <div className="h-full flex items-center">
            <span className="text-sm font-bold block pb-0.5">{title}</span>
          </div>
        )}

        {summary && (
          <div>
            <div
              className={classNames(
                mode === "full"
                  ? `border-b border-[rgb(var(--ec-page-border))]`
                  : "",
              )}
            >
              <span className="text-xs font-bold block pb-0.5">{title}</span>
            </div>
            {mode === "full" && (
              <div className="divide-y divide-[rgb(var(--ec-page-border))] ">
                <div className="leading-3 py-1">
                  <span className="text-[8px] font-light">{summary}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
