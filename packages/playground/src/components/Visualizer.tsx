import { memo } from 'react';
import { NodeGraph } from '@eventcatalog/visualiser';
import type { DslGraph } from '@eventcatalog/visualiser';

interface VisualizerProps {
  graph: DslGraph;
}

export const Visualizer = memo(function Visualizer({ graph }: VisualizerProps) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div id="dsl-playground-portal" style={{ width: '100%', height: '100%' }} />
      <NodeGraph
        id="dsl-playground"
        portalId="dsl-playground-portal"
        graph={graph}
        mode="full"
        zoomOnScroll={true}
      />
    </div>
  );
});
