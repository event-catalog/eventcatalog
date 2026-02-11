import { Handle, Position } from "@xyflow/react";
import ExternalSystemComponent from "./external-system/ExternalSystem";

export default function ExternalSystemNode(props: any) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, background: "pink", zIndex: 10 }}
        className="bg-gray-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, background: "pink", zIndex: 10 }}
        className="bg-gray-500"
      />
      <ExternalSystemComponent {...props} />
    </div>
  );
}
