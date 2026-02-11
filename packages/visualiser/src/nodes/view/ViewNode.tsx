import { MonitorIcon } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import { EventCatalogResource, View as ViewType } from "../../types";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type ViewNodeData = EventCatalogResource & {
  view: ViewType;
};

export type ViewNode = Node<ViewNodeData, "view">;

export default function View(props: ViewNode) {
  const { data: _data, selected } = props;
  const { name, summary, screenshot } = props.data.view;

  const mode = props.data.mode || "simple";

  const nodeLabel = "View";

  return (
    <div
      className={classNames(
        "rounded-md border flex justify-start bg-white text-black min-h-[100px] relative",
        selected
          ? "border-blue-600 ring-2 ring-blue-500 shadow-lg"
          : "border-blue-400",
      )}
      style={{ width: "260px" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-1px] !w-2.5 !h-2.5 !bg-blue-500 !border !border-blue-600 !rounded-full !z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-1px] !w-2.5 !h-2.5 !bg-blue-500 !border !border-blue-600 !rounded-full !z-10"
      />
      <div
        className={`bg-gradient-to-b from-blue-500 to-blue-700 relative flex flex-col items-center w-5 justify-between rounded-l-sm text-blue-100 border-r-[1px] border-blue-500`}
      >
        <MonitorIcon
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
        <div className="pb-1">
          <span className="text-xs font-bold block pt-0.5 pb-0.5">{name}</span>
          {mode === "simple" && (
            <span className="text-[10px] text-gray-500 font-light block pt-0.5 pb-0.5">
              {nodeLabel}
            </span>
          )}
        </div>
        {summary && (
          <div className="pb-1">
            <div
              className="text-[8px] font-light text-gray-600 block leading-tight overflow-hidden"
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
        )}
        {screenshot && (
          <div className="py-1">
            <img
              src={screenshot}
              alt={`${name} screenshot`}
              className="w-full max-w-40 h-20 object-cover rounded border border-gray-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}
