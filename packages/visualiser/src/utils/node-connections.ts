import { useCallback, useMemo } from "react";
import { useNodeId, useStore, type ReactFlowState } from "@xyflow/react";

/**
 * Whether the node this is in has connections coming in (target) and going out (source), e.g. to show its glowing
 * handles. One store subscription returning a number, rather than two `useNodeConnections`: every subscription's
 * selector runs on every store update (every frame of a drag, pan or remote move), and `useNodeConnections` also
 * compares connection maps key by key each time. With two per node, they were among the top costs of a drag.
 */
export function useNodeHasConnections() {
  const id = useNodeId();
  const keys = useMemo(() => [`${id}-target`, `${id}-source`] as const, [id]);
  const selector = useCallback(
    (state: ReactFlowState) =>
      (state.connectionLookup.get(keys[0])?.size ? 1 : 0) |
      (state.connectionLookup.get(keys[1])?.size ? 2 : 0),
    [keys],
  );
  const connected = useStore(selector);
  return { target: (connected & 1) > 0, source: (connected & 2) > 0 };
}
