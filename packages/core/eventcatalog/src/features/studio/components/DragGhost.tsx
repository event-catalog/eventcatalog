import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { ReactFlow, ReactFlowProvider, useStoreApi, type Node, type XYPosition } from '@xyflow/react';
import { getNodeSize, isGroupType } from '../node-types';
import { nodeTypes } from './canvas-nodes';

/**
 * Dragging something from the left panel onto the canvas shows the node it becomes, under the pointer, at the
 * canvas's zoom and where it will land (centred on the pointer, as it's dropped). Drawn here rather than as the
 * browser's drag image, which browsers shrink, fade and put a backing behind.
 */

/** What's dragged: the node it becomes */
export type DragPreview = { type: string; data: Record<string, unknown> };
/** Starts dragging `value` as `dragType`, showing `preview` as what's dragged */
export type StartDrag = (dragType: string, value: string, preview: DragPreview) => (event: DragEvent) => void;

// Hides the browser's own drag image (a transparent pixel)
const NO_DRAG_IMAGE =
  typeof Image === 'undefined'
    ? undefined
    : Object.assign(new Image(), { src: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' });

// Room around the node for the badge on its top edge
const MARGIN = 16;
const PRO_OPTIONS = { hideAttribution: true };

type Ghost = { preview: DragPreview; zoom: number; at: XYPosition };

/** The ghost of what's being dragged, and how to start dragging something with one */
export function useDragGhost() {
  const store = useStoreApi();
  const [ghost, setGhost] = useState<Ghost | null>(null);

  const startDrag = useCallback<StartDrag>(
    (dragType, value, preview) => (event) => {
      event.dataTransfer.setData(dragType, value);
      event.dataTransfer.effectAllowed = 'move';
      if (NO_DRAG_IMAGE) event.dataTransfer.setDragImage(NO_DRAG_IMAGE, 0, 0);
      setGhost({ preview, zoom: store.getState().transform[2], at: { x: event.clientX, y: event.clientY } });
    },
    [store]
  );

  const element = ghost && <DragGhost ghost={ghost} onEnd={() => setGhost(null)} />;
  return { startDrag, ghost: element };
}

function DragGhost({ ghost, onEnd }: { ghost: Ghost; onEnd: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { preview, zoom } = ghost;
  const container = isGroupType(preview.type);
  // The size it's added at (containers are sized; cards are drawn at their own size inside this)
  const size = getNodeSize(preview.type);
  // The node is placed with its middle where it's dropped, at the size it's added at
  const offset = { x: (size.width / 2) * zoom + MARGIN, y: (size.height / 2) * zoom + MARGIN };

  // Follows the pointer (as the browser reports it while dragging) without re-rendering, and goes when it's dropped
  useEffect(() => {
    const move = (x: number, y: number) => {
      if (ref.current) ref.current.style.transform = `translate(${x - offset.x}px, ${y - offset.y}px)`;
    };
    move(ghost.at.x, ghost.at.y);
    const onDragOver = (event: globalThis.DragEvent) => {
      if (event.clientX || event.clientY) move(event.clientX, event.clientY);
    };
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onEnd);
    document.addEventListener('dragend', onEnd);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onEnd);
      document.removeEventListener('dragend', onEnd);
    };
  }, [ghost]);

  const nodes = useMemo<Node[]>(
    () => [
      {
        id: 'drag-ghost',
        type: preview.type,
        position: { x: 0, y: 0 },
        data: preview.data,
        ...(container && size),
      },
    ],
    [preview, container, size]
  );
  const viewport = useMemo(() => ({ x: MARGIN, y: MARGIN, zoom }), [zoom]);

  return (
    <div
      ref={ref}
      aria-hidden
      // Sized here: the visualiser's styles make its class fill the window
      className="studio-drag-preview eventcatalog-visualizer pointer-events-none fixed left-0 top-0 z-[100]"
      style={{ width: size.width * zoom + MARGIN * 2, height: size.height * zoom + MARGIN * 2 }}
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          nodeTypes={nodeTypes}
          defaultViewport={viewport}
          proOptions={PRO_OPTIONS}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          preventScrolling={false}
        />
      </ReactFlowProvider>
    </div>
  );
}
