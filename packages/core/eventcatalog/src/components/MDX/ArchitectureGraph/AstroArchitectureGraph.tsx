import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CatalogForceGraph from '@components/CatalogGraph/CatalogForceGraph';
import { ARCHITECTURE_GRAPH_PORTAL_SELECTOR } from '@components/MDX/ArchitectureGraph/ArchitectureGraphPortal';
import type { CatalogGraphWireLink, CatalogGraphWireNode } from '@utils/node-graphs/catalog-force-graph';

interface Props {
  /** Position of this island among the page's <ArchitectureGraph/> embeds — it
   * mounts into the placeholder div at the same position in document order */
  occurrenceIndex?: number;
  nodes: CatalogGraphWireNode[];
  links: CatalogGraphWireLink[];
  linkLabels: string[];
  initialLens?: string;
  initialFocus?: string;
  initialFocusDepth?: number;
  showSearch?: boolean;
  showLegend?: boolean;
  showLensPicker?: boolean;
  /** Base URL of the standalone /visualiser/graph page — the graph renders an
   * "open full screen" link carrying its live view state (focus, depth, lens) */
  href?: string;
  hrefLabel?: string;
}

// The island mounts outside the MDX content, finds the placeholder div the MDX
// component map emitted, and portals the graph into it — same pattern as the
// visualiser's NodeGraph.
const AstroArchitectureGraph = ({ occurrenceIndex = 0, href, hrefLabel, ...graphProps }: Props) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const portals = document.querySelectorAll<HTMLElement>(ARCHITECTURE_GRAPH_PORTAL_SELECTOR);
    setContainer(portals[occurrenceIndex] ?? null);
  }, [occurrenceIndex]);

  if (!container) return null;

  return createPortal(
    <CatalogForceGraph {...graphProps} syncUrl={false} zoomOnScroll={false} openInGraphUrl={href} openInGraphLabel={hrefLabel} />,
    container
  );
};

export default AstroArchitectureGraph;
