import { ArrowRightLeft, Link } from "lucide-react";
import { Node, Handle, Position } from "@xyflow/react";
import { getIconForProtocol } from "../../utils/protocols";
import { EventCatalogResource, Channel as ChannelType } from "../../types";

type ChannelNodeData = EventCatalogResource & {
  channel: ChannelType;
};

function classNames(...classes: any) {
  return classes.filter(Boolean).join(" ");
}

export type ChannelNode = Node<ChannelNodeData, "channel">;

export default function Channel(props: ChannelNode) {
  const { data } = props;

  const { version, name, summary, protocols = [], address } = data.channel;

  const mode = props.data.mode || "simple";

  const nodeLabel = "Channel";

  const Icon = getIconForProtocol(protocols?.[0]);

  return (
    <div
      className={classNames(
        "rounded-md border flex justify-start bg-white text-black relative",
        props.selected
          ? "border-gray-600 ring-2 ring-gray-500 shadow-lg"
          : "border-gray-400",
      )}
      style={{ minHeight: "100px", width: "260px" }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!left-[-1px] !w-2.5 !h-2.5 !bg-gray-500 !border !border-gray-600 !rounded-full !z-10"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!right-[-1px] !w-2.5 !h-2.5 !bg-gray-500 !border !border-gray-600 !rounded-full !z-10"
      />
      <div
        className={`bg-gradient-to-b from-gray-500 to-gray-700 relative flex flex-col items-center w-5 justify-between rounded-l-sm text-gray-100 border-r-[1px] border-gray-500`}
      >
        <ArrowRightLeft
          className={`w-4 h-4 opacity-90 text-white mt-1 ${mode === "full" ? "mb-2" : "mb-1"}`}
        />
        {mode === "full" && (
          <span
            className="text-center text-[8px] text-white font-bold uppercase mb-6"
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
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold block pb-0.5">{name}</span>
            {Icon && <Icon className="w-5 h-5 opacity-60 p-0.5" />}
          </div>
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

            {address && (
              <div
                className="leading-3 py-1 flex flex-col items-start space-y-0.5"
                style={{ fontSize: "0.2em" }}
              >
                <div
                  className="flex items-center space-x-0.5"
                  style={{ fontSize: "0.8em" }}
                >
                  <Link className="w-2 h-2 opacity-60" />
                  <span
                    className="block font-normal "
                    style={{ marginLeft: "0.5em" }}
                  >
                    {address}
                  </span>
                </div>
                {protocols && protocols.length > 0 && (
                  <div
                    className="flex space-x-2 items-center "
                    style={{ fontSize: "0.8em" }}
                  >
                    {[...protocols].map((protocol, index) => {
                      const ProtoColIcon = getIconForProtocol(protocol);
                      return (
                        <span
                          key={index}
                          className="font-normal flex items-center -ml-[1px] space-x-0.5"
                        >
                          {ProtoColIcon && (
                            <ProtoColIcon className="w-2 h-2 opacity-60 inline-block" />
                          )}
                          <span style={{ marginLeft: "0.5em" }}>
                            {protocol}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
