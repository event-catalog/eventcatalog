import { useCallback, useMemo } from "react";
import { useNodeId, useStore, type ReactFlowState } from "@xyflow/react";

/**
 * Whether the node this is in has connections coming in (target) and going out (source), e.g. to show its glowing
 * handles. One store subscription returning a number, rather than two `useNodeConnections`: every subscription's
 * selector runs on every store update (every frame of a drag, pan or remote move), and `useNodeConnections` also
 * compares connection maps key by key each time. With two per node, they were among the top costs of a drag.
 *
 * Given a source handle of its own (e.g. a channel's dead letter handle, at its bottom), says whether connections
 * leave from that handle, and `source` is only for the others.
 */
export function useNodeHasConnections(sourceHandle?: string) {
  const id = useNodeId();
  const keys = useMemo(
    () =>
      [
        `${id}-target`,
        `${id}-source`,
        sourceHandle ? `${id}-source-${sourceHandle}` : undefined,
      ] as const,
    [id, sourceHandle],
  );
  const selector = useCallback(
    (state: ReactFlowState) => {
      const fromHandle = keys[2]
        ? (state.connectionLookup.get(keys[2])?.size ?? 0)
        : 0;
      const fromSource = state.connectionLookup.get(keys[1])?.size ?? 0;
      return (
        (state.connectionLookup.get(keys[0])?.size ? 1 : 0) |
        (fromSource > fromHandle ? 2 : 0) |
        (fromHandle > 0 ? 4 : 0)
      );
    },
    [keys],
  );
  const connected = useStore(selector);
  return {
    target: (connected & 1) > 0,
    source: (connected & 2) > 0,
    handle: (connected & 4) > 0,
  };
}
