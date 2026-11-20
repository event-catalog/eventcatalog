/**
 * The kinds of channel (a channel's `type`), by how they deliver messages: a queue gives each message to one
 * consumer, a topic gives every subscription its own copy, and a stream is an ordered log consumers read at their
 * own offset (a Kafka topic is a stream). Each has its own label and icon (channels stay grey) in the visualiser,
 * Studio and the sidebar.
 */
export const CHANNEL_TYPES = {
  queue: { label: "Queue", icon: "ListEnd" },
  topic: { label: "Topic", icon: "RadioTower" },
  stream: { label: "Stream", icon: "Waves" },
} as const;

export type ChannelKind = keyof typeof CHANNEL_TYPES;

/** The icon (a lucide icon's name) for a channel without a type */
export const CHANNEL_ICON = "ArrowRightLeft";
/** The icon for a dead letter channel, whatever its type */
export const DEAD_LETTER_CHANNEL_ICON = "OctagonX";

/** A channel's type, if it has one we know */
export const getChannelType = (type?: unknown) =>
  typeof type === "string" &&
  Object.prototype.hasOwnProperty.call(CHANNEL_TYPES, type)
    ? CHANNEL_TYPES[type as ChannelKind]
    : undefined;

/** What a channel is called on its card and in the sidebar: its type ("Queue"), and if it's one, "Dead Letter Queue" */
export const getChannelLabel = ({
  type,
  isDeadLetterChannel,
}: {
  type?: unknown;
  isDeadLetterChannel?: boolean;
}) => {
  const name = getChannelType(type)?.label ?? "Channel";
  return isDeadLetterChannel ? `Dead Letter ${name}` : name;
};

/** A channel's icon: a dead letter channel's, its type's, or a channel's */
export const getChannelIcon = ({
  type,
  isDeadLetterChannel,
}: {
  type?: unknown;
  isDeadLetterChannel?: boolean;
}) =>
  isDeadLetterChannel
    ? DEAD_LETTER_CHANNEL_ICON
    : (getChannelType(type)?.icon ?? CHANNEL_ICON);
