import { MarkerType } from "@xyflow/react";
import { Database } from "lucide-react";
import { NodeConfiguration } from "../../types";

export default {
  type: "field",
  icon: Database,
  color: "cyan",
  targetCanConnectTo: [],
  sourceCanConnectTo: [],
  validateConnection: () => false,
  getEdgeOptions: () => ({
    label: "contains",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#06b6d4" },
  }),
  defaultData: { name: "New Field", type: "string", mode: "full" },
  editor: {
    title: "Field",
    subtitle: "Schema field",
    schema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", title: "Field Path" },
        type: { type: "string", title: "Type" },
      },
    },
  },
} as NodeConfiguration;
