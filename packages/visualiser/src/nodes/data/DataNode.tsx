import { Database } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import { EventCatalogResource, Data as DataType } from "../../types";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type DataNodeData = EventCatalogResource & {
  data: DataType;
};

export type DataNode = Node<DataNodeData, "data">;

export default function Data(props: DataNode) {
  const {
    version,
    owners = [],
    schemas = [],
    name,
    summary,
    type = "Database",
  } = props.data.data;

  const mode = props.data.mode || "simple";

  const nodeLabel = "Data";

  return (
    <div
      className={classNames(
        "rounded-md border flex justify-start bg-white text-black relative",
        props.selected
          ? "border-blue-600 ring-2 ring-blue-500 shadow-lg"
          : "border-blue-400",
      )}
      style={{ minHeight: "100px", width: "260px" }}
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
        <Database
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

            <div className="grid grid-cols-2 gap-x-4 py-1">
              <span className="text-xs" style={{ fontSize: "0.2em" }}>
                Type: {type}
              </span>
              <span className="text-xs" style={{ fontSize: "0.2em" }}>
                Schemas: {schemas.length}
              </span>
              <span className="text-xs" style={{ fontSize: "0.2em" }}>
                Owners: {owners.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
