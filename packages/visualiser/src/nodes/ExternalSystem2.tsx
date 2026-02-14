import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import ExternalSystemComponent from "./external-system/ExternalSystem";
import { EXTERNAL_SYSTEM_HANDLE_STYLE } from "./shared-styles";

export default memo(function ExternalSystemNode(props: any) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        style={EXTERNAL_SYSTEM_HANDLE_STYLE}
        className="bg-gray-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={EXTERNAL_SYSTEM_HANDLE_STYLE}
        className="bg-gray-500"
      />
      <ExternalSystemComponent {...props} />
    </div>
  );
});
