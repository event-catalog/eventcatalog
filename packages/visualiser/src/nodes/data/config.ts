import { Connection, MarkerType } from "@xyflow/react";
import { Database } from "lucide-react";
import { NodeConfiguration } from "../../types";
import { SERVICE, CHANNEL, ACTOR } from "../node-types";

export default {
  type: "data",
  icon: Database,
  color: "blue",
  targetCanConnectTo: [...SERVICE, ...CHANNEL, "external-system", ...ACTOR],
  sourceCanConnectTo: [...SERVICE, ...CHANNEL, "external-system", ...ACTOR],
  validateConnection: (connection: Connection) => {
    return connection.source !== connection.target;
  },
  getEdgeOptions: (connection: Connection) => {
    if (connection.source === "data" && connection.target === "service") {
      return {
        label: "Provides data to",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
      };
    }
    if (connection.source === "service" && connection.target === "data") {
      return {
        label: "Stores data in",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
      };
    }
    return {
      label: "Connected to",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
    };
  },
  defaultData: {
    name: "New Database",
    version: "0.0.1",
    summary: "New data store. Click edit to change the details.",
    type: "Database",
    mode: "full",
  },
  editor: {
    title: "Data Store",
    subtitle: "Edit the details of the data store",
    schema: {
      type: "object",
      required: ["name", "version"],
      properties: {
        name: {
          type: "string",
          title: "Name",
          default: "UserDatabase",
          description: "The name of the data store",
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
          description: "A brief summary of the data store",
        },
        type: {
          type: "string",
          title: "Type",
          default: "Database",
          description: "The type of data store (Database, Cache, Queue, etc.)",
          enum: [
            "Database",
            "Cache",
            "Queue",
            "File System",
            "Data Lake",
            "Data Warehouse",
          ],
        },
      },
    },
  },
} as NodeConfiguration;
