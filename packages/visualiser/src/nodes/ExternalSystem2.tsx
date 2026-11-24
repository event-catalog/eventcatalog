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
        className="bg-[#8d8d8d]"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={EXTERNAL_SYSTEM_HANDLE_STYLE}
        className="bg-[#8d8d8d]"
      />
      <ExternalSystemComponent {...props} />
    </div>
  );
});
