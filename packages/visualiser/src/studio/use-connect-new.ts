import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  useReactFlow,
  type Edge,
  type FinalConnectionState,
  type Node,
  type XYPosition,
} from "@xyflow/react";
import {
  centreBeyond,
  CONNECT_PLACEHOLDER,
  CONNECT_PLACEHOLDER_EDGE,
  CONNECT_PLACEHOLDER_SIZE,
  getConnectOptions,
  isAwayFrom,
  isEmptyCanvasAt,
  linkConnection,
  type ConnectOption,
  type NewLink,
} from "./connect-new";
import type { ConnectPlaceholderData } from "./components/ConnectChooser";
import type { Level } from "./levels";
import { getNodeName, getNodeSize } from "./node-types";

/**
 * Connecting to something new, for both Studios' canvases: a connection let go of on empty canvas puts a placeholder
 * there (connected to the node it came from, only in this browser) and a list beside it (ConnectChooser) to choose
 * what it is. The canvas makes what's chosen (`onMake`), where the placeholder was.
 */

/** A connection let go of on empty canvas: from where to where (canvas coordinates), and what can be made there */
type Connecting = {
  link: NewLink;
  fromName?: string;
  options: ConnectOption[];
  from: XYPosition;
  to: XYPosition;
  choice?: ConnectOption;
};

const PLACEHOLDER_EDGE_STYLE = {
  stroke: "rgb(var(--ec-accent))",
  strokeWidth: 1.5,
  strokeDasharray: "6 4",
};

/** Where the placeholder is on the canvas: centred as the node it becomes is (see centreBeyond) */
const placeholderPosition = ({ from, to }: Connecting): XYPosition => {
  const center = centreBeyond(from, to, CONNECT_PLACEHOLDER_SIZE);
  return {
    x: center.x - CONNECT_PLACEHOLDER_SIZE.width / 2,
    y: center.y - CONNECT_PLACEHOLDER_SIZE.height / 2,
  };
};

export function useConnectNew({
  canvasRef,
  getNode,
  getLevel,
  locked,
  onMake,
}: {
  /** The canvas: a connection's let go of on empty canvas inside it */
  canvasRef: RefObject<HTMLElement | null>;
  /** A node on the canvas people edit, by id (on L1 and L2 too, what's shown is on it): connections start there */
  getNode: (id: string) => Node | undefined;
  getLevel: () => Level;
  /** Locked: nothing's made (and what's waiting to be chosen goes) */
  locked: boolean;
  /** Makes what was chosen, centred on `center`, connected by `link` (in the same change, so one undo takes both) */
  onMake: (option: ConnectOption, center: XYPosition, link: NewLink) => void;
}) {
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const [connecting, setConnecting] = useState<Connecting | null>(null);
  // Read when the connection ends, not followed: the handlers stay the same
  const latest = useRef({ getNode, getLevel, locked, onMake, connecting });
  latest.current = { getNode, getLevel, locked, onMake, connecting };

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      const { fromNode, fromHandle } = state;
      if (
        latest.current.locked ||
        state.isValid ||
        state.toNode ||
        !fromNode ||
        !fromHandle
      )
        return;
      const from = latest.current.getNode(fromNode.id);
      if (!from) return;
      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;
      // Let go of on empty canvas, away from where it started (closer is a click on the handle)
      const to = screenToFlowPosition({ x: clientX, y: clientY });
      if (
        !isAwayFrom(state.from, to) ||
        !isEmptyCanvasAt({ x: clientX, y: clientY }, canvasRef.current)
      )
        return;
      const newIs = fromHandle.type === "source" ? "target" : "source";
      const options = getConnectOptions(
        from.type,
        newIs,
        latest.current.getLevel(),
      );
      if (!options.length) return;
      setConnecting({
        link: { nodeId: from.id, handleId: fromHandle.id ?? null, newIs },
        fromName: getNodeName(from.type, from.data),
        options,
        from: state.from,
        to,
      });
    },
    [screenToFlowPosition, canvasRef],
  );

  /** The placeholder node and its connection, to show with the canvas's (nothing while nothing's waiting) */
  const placeholder = useMemo(() => {
    if (!connecting) return null;
    const { choice } = connecting;
    const data: ConnectPlaceholderData = {
      choice: choice && {
        key: choice.key,
        label: choice.label,
        summary: choice.summary,
      },
    };
    const node: Node = {
      id: CONNECT_PLACEHOLDER,
      type: CONNECT_PLACEHOLDER,
      position: placeholderPosition(connecting),
      data,
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      deletable: false,
      zIndex: 1000,
    };
    const edge: Edge = {
      id: CONNECT_PLACEHOLDER_EDGE,
      ...linkConnection(CONNECT_PLACEHOLDER, connecting.link),
      type: "smoothstep",
      style: PLACEHOLDER_EDGE_STYLE,
      selectable: false,
      focusable: false,
      deletable: false,
    };
    return { node, edge };
  }, [connecting]);

  const highlight = useCallback(
    (choice: ConnectOption | undefined) =>
      setConnecting((current) =>
        current && current.choice?.key !== choice?.key
          ? { ...current, choice }
          : current,
      ),
    [],
  );
  const cancel = useCallback(() => setConnecting(null), []);
  const choose = useCallback((option: ConnectOption) => {
    const { connecting: at, locked: isLocked, onMake: make } = latest.current;
    setConnecting(null);
    if (!at || isLocked) return;
    // Its near side where the connection was let go of
    make(
      option,
      centreBeyond(at.from, at.to, getNodeSize(option.type)),
      at.link,
    );
  }, []);

  useEffect(() => {
    if (locked) setConnecting(null);
  }, [locked]);

  /** ConnectChooser's props, beside the placeholder on screen (nothing while nothing's waiting) */
  let chooser = null;
  if (connecting && placeholder) {
    const { x, y } = placeholder.node.position;
    const start = flowToScreenPosition({ x, y });
    const end = flowToScreenPosition({
      x: x + CONNECT_PLACEHOLDER_SIZE.width,
      y: y + CONNECT_PLACEHOLDER_SIZE.height,
    });
    chooser = {
      options: connecting.options,
      fromName: connecting.fromName,
      anchor: {
        x: start.x,
        y: start.y,
        width: end.x - start.x,
        height: end.y - start.y,
      },
      onHighlight: highlight,
      onChoose: choose,
      onCancel: cancel,
    };
  }

  return { placeholder, chooser, onConnectEnd, cancel };
}
