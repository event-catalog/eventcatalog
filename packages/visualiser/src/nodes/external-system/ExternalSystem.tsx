import { Globe } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import {
  EventCatalogResource,
  ExternalSystem as ExternalSystemType,
} from "../../types";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type ExternalSystemNodeData = EventCatalogResource & {
  externalSystem: ExternalSystemType;
};

export type ExternalSystemNode = Node<
  ExternalSystemNodeData,
  "external-system"
>;

export default function ExternalSystem(props: ExternalSystemNode) {
  const { data, selected } = props;
  const { version, name, summary } = props.data.externalSystem;

  const mode = props.data.mode || "simple";

  const nodeLabel = "External";

  return (
    <div
      className={classNames(
        "rounded-md min-h-[100px] border flex justify-start bg-white text-black relative",
        selected
          ? "border-pink-600 ring-2 ring-pink-500 shadow-lg"
          : "border-pink-400",
      )}
      style={{ width: "260px" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-1px] !w-2.5 !h-2.5 !bg-pink-500 !border !border-pink-600 !rounded-full !z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-1px] !w-2.5 !h-2.5 !bg-pink-500 !border !border-pink-600 !rounded-full !z-10"
      />
      <div
        className={`bg-gradient-to-b from-pink-500 to-pink-700 relative flex flex-col items-center w-5 justify-between rounded-l-sm text-pink-100 border-r-[1px] border-pink-500`}
      >
        <Globe
          className={`w-4 h-4 opacity-90 text-white mt-1 ${mode === "full" ? "mb-2" : "mb-1"}`}
        />
        {mode === "full" && (
          <span
            className="text-center text-[8px] text-white font-bold uppercase mb-4"
            style={{
              transform: "rotate(-90deg)",
              letterSpacing: "0.15em",
              whiteSpace: "nowrap",
            }}
          >
            {nodeLabel}
          </span>
        )}
      </div>
      <div className="p-1 flex-1">
        <div
          className={classNames(
            mode === "full" ? `border-b border-gray-200` : "",
          )}
        >
          <span className="text-xs font-bold block pt-0.5 pb-0.5">{name}</span>
          <div className="flex justify-between">
            <span className="text-[10px] font-light block pt-0.5 pb-0.5">
              v{version}
            </span>
            {mode === "simple" && (
              <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5">
                {nodeLabel}
              </span>
            )}
          </div>
        </div>
        {mode === "full" && (
          <div className="divide-y divide-gray-200">
            <div className="leading-3 py-1">
              <div
                className="text-[8px] font-light overflow-hidden"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
                title={summary}
              >
                {summary}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
