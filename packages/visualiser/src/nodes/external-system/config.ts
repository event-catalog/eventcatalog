import { Connection, MarkerType } from "@xyflow/react";
import { Globe } from "lucide-react";
import { NodeConfiguration } from "../../types";
import { SERVICE, CHANNEL, ACTOR, MESSAGE } from "../node-types";

export default {
  type: "external-system",
  icon: Globe,
  color: "pink",
  targetCanConnectTo: [...SERVICE, ...CHANNEL, ...MESSAGE, ...ACTOR],
  sourceCanConnectTo: [...SERVICE, ...CHANNEL, ...MESSAGE, ...ACTOR],
  validateConnection: (connection: Connection) => {
    return connection.source !== connection.target;
  },
  getEdgeOptions: (connection: Connection) => {
    return {
      label: "Connects",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
    };
  },
  defaultData: {
    mode: "full",
    externalSystem: {
      id: "1",
      name: "New External System",
      version: "0.0.1",
      summary: "New external system. Click edit to change the details.",
    },
  },
  editor: {
    title: "External System",
    subtitle: "Edit the details of the external system",
    schema: {
      type: "object",
      required: ["externalSystem", "mode"],
      properties: {
        externalSystem: {
          type: "object",
          required: ["name", "version"],
          properties: {
            name: {
              type: "string",
              title: "Name",
              default: "Random value",
              description: "The name of the external system",
            },
            version: {
              type: "string",
              title: "Version",
              default: "1.0.0",
              description: "The version number (e.g., 1.0.0)",
              pattern: "^\\d+\\.\\d+\\.\\d+(?:-[\\w.-]+)?(?:\\+[\\w.-]+)?$",
            },
            summary: {
              type: "string",
              title: "Summary",
              default: "",
              description: "A brief summary of the external system",
            },
          },
        },
      },
    },
  },
} as NodeConfiguration;
