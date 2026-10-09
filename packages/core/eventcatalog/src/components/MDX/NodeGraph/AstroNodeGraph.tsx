/**
 * Astro adapter for @eventcatalog/visualiser
 *
 * This component wraps the framework-agnostic NodeGraph from @eventcatalog/visualiser
 * and provides Astro-specific integration including:
 * - Navigation using Astro's navigate function
 * - Layout persistence via Astro API routes
 * - URL building with Astro's URL utilities
 *
 * Note: the visualiser stylesheet is deliberately NOT imported here. Every Astro file that
 * renders this component imports `@eventcatalog/visualiser/styles-core.css` itself so the
 * CSS ships in the page head and survives ClientRouter navigations (see NodeGraph.astro).
 */

import { useCallback, useState, lazy, Suspense } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { FlowGroupBy, OpenInStudioRequest } from '@eventcatalog/visualiser';
import { buildUrl } from '@utils/url-builder';
import { createCanvasThroughApi } from '@features/studio/api/client';
import { canvasFromVisualiser } from '@features/studio/from-visualiser';
import { getStoredName } from '@features/studio/identity';
import OpenInStudioDialog from '@features/studio/components/OpenInStudioDialog';

const NodeGraph = lazy(() =>
  import('@eventcatalog/visualiser').then((module) => ({ default: module.NodeGraph }))
) as React.LazyExoticComponent<React.ComponentType<AstroNodeGraphProps & Record<string, unknown>>>;

interface AstroNodeGraphProps {
  id: string;
  nodes: Node[];
  edges: Edge[];
  title?: string;
  href?: string;
  hrefLabel?: string;
  linkTo?: 'docs' | 'visualiser';
  includeKey?: boolean;
  footerLabel?: string;
  linksToVisualiser?: boolean;
  links?: { label: string; url: string }[];
  mode?: 'full' | 'simple';
  portalId?: string;
  showFlowWalkthrough?: boolean;
  showSearch?: boolean;
  zoomOnScroll?: boolean;
  designId?: string;
  isChatEnabled?: boolean;
  maxTextSize?: number;
  isDevMode?: boolean;
  resourceKey?: string;
  disableMessageAnimation?: boolean;
  // A simpler graph shown as level 1 (e.g. a system's context diagram)
  overviewGraph?: {
    nodes: Node[];
    edges: Edge[];
    label: string;
    resourceKey?: string;
  };
  // This graph laid out with its messages and channels hidden (level 2), if precomputed
  hiddenMessagesGraph?: { nodes: Node[]; edges: Edge[] };
  // The kind of diagram, so the level is remembered for each kind
  preferenceScope?: string;
  // Group a flow's steps into swimlanes to start with
  swimlanes?: FlowGroupBy;
  // The Studio API's address, when Studio is on: the menu can then start a canvas from the diagram
  studioApiUrl?: string;
}

const AstroNodeGraph = ({ isDevMode = false, resourceKey, studioApiUrl, ...otherProps }: AstroNodeGraphProps) => {
  // Astro-specific navigation handler
  const handleNavigate = useCallback((url: string) => {
    // Use window.location for navigation since we can't import astro:transitions/client in a React component
    window.location.href = url;
  }, []);

  // Astro-specific URL builder that respects the configured base path
  const handleBuildUrl = useCallback((path: string) => {
    return buildUrl(path);
  }, []);

  // Layout persistence: Save layout to Astro API route
  const handleSaveLayout = useCallback(
    async (key: string, positions: Record<string, { x: number; y: number }>): Promise<boolean> => {
      if (!key) return false;

      try {
        const response = await fetch('/api/dev/visualizer-layout/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceKey: key, positions }),
        });
        const result = await response.json();
        return result.success === true;
      } catch {
        return false;
      }
    },
    []
  );

  // Layout persistence: Reset layout via Astro API route
  const handleResetLayout = useCallback(async (key: string): Promise<boolean> => {
    if (!key) return false;

    try {
      const response = await fetch('/api/dev/visualizer-layout/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceKey: key }),
      });
      const result = await response.json();
      return result.success === true;
    } catch {
      return false;
    }
  }, []);

  // Opening the diagram in Studio: asks what to call the canvas, then makes it with what the diagram shows and opens
  // it (in this tab) at the level shown. What it shows is only taken once it's named (laying a level out can take a
  // moment), and anything that goes wrong is shown in the dialog.
  const [toOpen, setToOpen] = useState<OpenInStudioRequest | null>(null);
  const closeOpenInStudio = useCallback(() => setToOpen(null), []);
  const openInStudio = useCallback(
    async (title: string | undefined) => {
      if (!studioApiUrl || !toOpen) return;
      const snapshot = await toOpen.getSnapshot();
      const { nodes, edges, levels } = canvasFromVisualiser(snapshot);
      if (nodes.length === 0) throw new Error('Nothing on this diagram can go on a canvas yet');
      const canvas = await createCanvasThroughApi(studioApiUrl, {
        title,
        createdBy: getStoredName() ?? undefined,
        nodes,
        edges,
        levels,
      });
      window.location.assign(snapshot.level === 3 ? canvas.url : `${canvas.url}?level=${snapshot.level}`);
    },
    [studioApiUrl, toOpen]
  );

  return (
    <Suspense fallback={<div>Loading graph...</div>}>
      <NodeGraph
        {...otherProps}
        resourceKey={resourceKey}
        isDevMode={isDevMode}
        onNavigate={handleNavigate}
        onBuildUrl={handleBuildUrl}
        onSaveLayout={handleSaveLayout}
        onResetLayout={handleResetLayout}
        onOpenInStudio={studioApiUrl ? setToOpen : undefined}
      />
      {toOpen && <OpenInStudioDialog title={toOpen.title} onOpen={openInStudio} onClose={closeOpenInStudio} />}
    </Suspense>
  );
};

export default AstroNodeGraph;
