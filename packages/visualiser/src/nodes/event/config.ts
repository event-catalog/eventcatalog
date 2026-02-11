import { Connection, MarkerType } from "@xyflow/react";
import { Zap } from "lucide-react";
import { NodeConfiguration } from "../../types";
import { SERVICE, CHANNEL, EVENT } from "../node-types";

export default {
  type: "event",
  icon: Zap,
  color: "orange",
  targetCanConnectTo: [...SERVICE, ...CHANNEL],
  sourceCanConnectTo: [...SERVICE, ...CHANNEL],
  validateConnection: (connection: Connection) => {
    return connection.source !== connection.target;
  },
  getEdgeOptions: (connection: Connection) => {
    if (
      EVENT.includes(connection.source) &&
      SERVICE.includes(connection.target)
    ) {
      return {
        label: "Publishes",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
      };
    }
    return {
      label: "Subscribes",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
    };
  },
  defaultData: {
    name: "New Event",
    version: "0.0.1",
    summary: "New event. Click edit to change the details.",
    mode: "full",
  },
  editor: {
    title: "Event",
    subtitle: "Edit the details of the event",
    schema: {
      type: "object",
      required: ["name", "version"],
      properties: {
        name: {
          type: "string",
          title: "Name",
          default: "Random value",
          description:
            "The name of the event. Use a verb-noun format (e.g., OrderPlaced).",
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
          description: "A brief summary of the event",
        },
      },
    },
  },
} as NodeConfiguration;
