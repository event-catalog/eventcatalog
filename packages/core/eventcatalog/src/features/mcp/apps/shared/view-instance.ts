// Shared by the MCP App views (client) and the MCP server: no server-only imports here

/**
 * Which tool result a view is showing. Hosts keep every view in a conversation running (one per tool call), so the
 * server stamps each result it shows in a view: the views agree which one keeps the model's context up to date (the
 * newest, or the one last used), and a view keeps what's changed in it under its id. Stamped when the tool runs, so it's the same
 * whenever the conversation is opened again.
 */
export type ViewInstance = { id: string; createdAt: number; seq: number };

/** Key of the stamp in a tool result's `_meta` */
export const VIEW_INSTANCE_META_KEY = 'eventcatalog/view-instance';

let seq = 0;
/** A stamp for a tool result shown in a view */
export const newViewInstance = (): ViewInstance => ({ id: crypto.randomUUID(), createdAt: Date.now(), seq: ++seq });

export const isViewInstance = (value: unknown): value is ViewInstance => {
  const instance = value as Partial<ViewInstance> | undefined;
  return typeof instance?.id === 'string' && typeof instance.createdAt === 'number' && typeof instance.seq === 'number';
};

/** Whether `a` was shown after `b` */
export const isNewerView = (a: ViewInstance, b: ViewInstance) =>
  a.createdAt !== b.createdAt ? a.createdAt > b.createdAt : a.seq !== b.seq ? a.seq > b.seq : a.id > b.id;

const CHANNEL = 'eventcatalog-mcp-views';

type ViewMessage = { kind: 'shown'; instance: ViewInstance } | { kind: 'active'; id: string };

/**
 * Agrees with the other views showing this server's results (same origin, so the same BroadcastChannel) which one
 * keeps the model's context: the newest result's, until someone uses another (`claim`), which then keeps it until a
 * newer result is shown. Views opened later (or again) say what they show, and older ones answer, so every view
 * learns of the newest whatever order they load in. `onActive` is told whenever this view gains or loses it.
 */
export function watchViews(instance: ViewInstance, onActive: (active: boolean) => void) {
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(CHANNEL);
  } catch {
    // No BroadcastChannel (e.g. an opaque origin): every view acts as the newest, as before
    return { claim: () => {}, stop: () => {} };
  }
  const say = (message: ViewMessage) => channel.postMessage(message);
  channel.onmessage = ({ data }: MessageEvent<ViewMessage>) => {
    if (data?.kind === 'active' && typeof data.id === 'string' && data.id !== instance.id) return onActive(false);
    if (data?.kind !== 'shown' || !isViewInstance(data.instance) || data.instance.id === instance.id) return;
    if (isNewerView(data.instance, instance)) onActive(false);
    else say({ kind: 'shown', instance });
  };
  say({ kind: 'shown', instance });
  return {
    /** Someone's using this view: it keeps the model's context now */
    claim: () => {
      say({ kind: 'active', id: instance.id });
      onActive(true);
    },
    stop: () => channel.close(),
  };
}
