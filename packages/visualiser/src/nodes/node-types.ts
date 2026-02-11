export const SERVICE = ["service", "services"];
export const EVENT = ["event", "events"];
export const QUERY = ["queries", "query", "querie"];
export const COMMAND = ["command", "commands"];
export const CHANNEL = ["channel", "channels"];
export const ACTOR = ["actor", "actors"];
export const DATA = ["data"];
export const VIEW = ["view"];

export const MESSAGE = [...EVENT, ...COMMAND, ...QUERY];
