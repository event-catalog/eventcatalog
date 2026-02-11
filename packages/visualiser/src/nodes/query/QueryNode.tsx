import { Search } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import { Message, EventCatalogResource } from "../../types";

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

type QueryNodeData = EventCatalogResource & {
  message: Message;
};

export type QueryNode = Node<QueryNodeData, "query">;

export default function Query(props: QueryNode) {
  const {
    version,
    owners = [],
    producers = [],
    consumers = [],
    name,
    summary,
  } = props.data.message;

  const mode = props.data.mode || "simple";

  const nodeLabel = "Query";

  return (
    <div
      className={classNames(
        "rounded-md border flex justify-start bg-white text-black relative",
        props.selected
          ? "border-green-600 ring-2 ring-green-500 shadow-lg"
          : "border-green-400",
      )}
      style={{ minHeight: "100px", width: "260px" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-1px] !w-2.5 !h-2.5 !bg-green-500 !border !border-green-600 !rounded-full !z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-1px] !w-2.5 !h-2.5 !bg-green-500 !border !border-green-600 !rounded-full !z-10"
      />
      <div
        className={`bg-gradient-to-b from-green-500 to-green-700 relative flex flex-col items-center w-5 justify-between rounded-l-sm text-green-100 border-r-[1px] border-green-500`}
      >
        <Search className="w-4 h-4 opacity-90 text-white mt-1" />
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
                Producers: {producers.length}
              </span>
              <span className="text-xs" style={{ fontSize: "0.2em" }}>
                Consumers: {consumers.length}
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
