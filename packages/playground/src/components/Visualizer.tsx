import { memo } from 'react';
import { NodeGraph } from '@eventcatalog/visualiser';
import type { DslGraph } from '@eventcatalog/visualiser';

interface VisualizerProps {
  graph: DslGraph;
  focusNodeId?: string | null;
  focusRequestId?: number;
  fitRequestId?: number;
}

export const Visualizer = memo(function Visualizer({ graph, focusNodeId, focusRequestId, fitRequestId }: VisualizerProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div id="dsl-playground-portal" style={{ width: '100%', height: '100%' }} />
      <NodeGraph
        id="dsl-playground"
        portalId="dsl-playground-portal"
        graph={graph}
        focusNodeId={focusNodeId}
        focusRequestId={focusRequestId}
        fitRequestId={fitRequestId}
        mode="full"
        zoomOnScroll={true}
        showSearch={false}
      />
    </div>
  );
});
