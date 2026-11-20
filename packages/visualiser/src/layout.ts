/**
 * Graph layout and transforms, without React components: used by EventCatalog
 * to lay graphs out on the server (`@eventcatalog/visualiser/layout`).
 */
export {
  layoutWithElk,
  getNodeSize,
  type LayoutGraph,
  type LayoutSize,
  type EdgeRoute,
  type CopiedEdgeRoute,
} from "./utils/elk-layout";
export {
  hideMessageNodes,
  hideNodes,
  getMessagesLabel,
  isCarrier,
  isMessageNode,
} from "./utils/hide-messages";
export {
  convertToMermaid,
  type MermaidExportOptions,
} from "./utils/export-mermaid";
export {
  DEAD_LETTER_COLOR,
  DEAD_LETTER_EDGE_CLASS,
  DEAD_LETTER_EDGE_LABEL,
  DEAD_LETTER_EDGE_MARKER,
  DEAD_LETTER_EDGE_STYLE,
  DEAD_LETTER_HANDLE,
} from "./utils/dead-letter";
export {
  CHANNEL_TYPES,
  getChannelIcon,
  getChannelLabel,
  getChannelType,
  type ChannelKind,
} from "./utils/channel-types";
