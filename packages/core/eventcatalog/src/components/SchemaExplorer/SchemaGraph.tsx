import { useEffect, useState } from 'react';
import AstroNodeGraph from '@components/MDX/NodeGraph/AstroNodeGraph';
import type { MessageUsageGraph } from '@utils/schema-usage-graph';

interface SchemaGraphProps {
  /** Unique on the page: it names the portal element the visualiser mounts into. */
  id: string;
  graph: MessageUsageGraph;
  /** CSS height of the graph box. Omit to fill the remaining height of a flex column parent. */
  height?: string;
  showLegend?: boolean;
}

/**
 * A visualiser node graph inside the schema panel. The visualiser is browser-only, so the
 * graph mounts after hydration into the portal element rendered here; the box keeps its
 * height meanwhile so the tab does not jump.
 */
export default function SchemaGraph({ id, graph, height, showLegend = true }: SchemaGraphProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const portalId = `${id}-portal`;

  return (
    <>
      <div
        id={portalId}
        className={`not-prose relative w-full overflow-hidden rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] ${height ? '' : 'min-h-[20em] flex-1'}`}
        style={height ? { height } : undefined}
      />
      {mounted && (
        <AstroNodeGraph
          id={id}
          nodes={graph.nodes}
          edges={graph.edges}
          mode="simple"
          linkTo="docs"
          showSearch={false}
          includeKey={showLegend}
          zoomOnScroll={false}
          portalId={portalId}
          disableMessageAnimation={true}
        />
      )}
    </>
  );
}
