import { Connection, MarkerType } from "@xyflow/react";
import { User } from "lucide-react";
import { NodeConfiguration } from "../../types";
import { SERVICE, MESSAGE, CHANNEL } from "../node-types";

export default {
  type: "actor",
  icon: User,
  color: "yellow",
  targetCanConnectTo: [
    ...SERVICE,
    ...MESSAGE,
    ...CHANNEL,
    "external-system",
    "view",
  ],
  sourceCanConnectTo: [
    ...SERVICE,
    ...MESSAGE,
    ...CHANNEL,
    "external-system",
    "view",
  ],
  validateConnection: (connection: Connection) => {
    return connection.source !== connection.target;
  },
  getEdgeOptions: (_connection: Connection) => {
    return {
      label: "Interacts",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#000000" },
    };
  },
  defaultData: {
    name: "New Actor",
    summary:
      "A person or user in the system. Click edit to change the details.",
    mode: "full",
  },
  editor: {
    title: "Actor",
    subtitle: "Edit the details of the actor",
    schema: {
      type: "object",
      required: ["name"],
      properties: {
        name: {
          type: "string",
          title: "Name",
          default: "New Actor",
          description: "The name of the actor (person/user)",
        },
        summary: {
          type: "string",
          title: "Description",
          default: "",
          description: "A brief description of the actor",
        },
      },
    },
  },
} as NodeConfiguration;
