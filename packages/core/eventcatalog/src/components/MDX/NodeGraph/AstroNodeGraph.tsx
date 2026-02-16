/**
 * Astro adapter for @eventcatalog/visualiser
 *
 * This component wraps the framework-agnostic NodeGraph from @eventcatalog/visualiser
 * and provides Astro-specific integration including:
 * - Navigation using Astro's navigate function
 * - Layout persistence via Astro API routes
 * - URL building with Astro's URL utilities
 */

import { useCallback, lazy, Suspense } from 'react';
import '@eventcatalog/visualiser/styles.css';
import type { Node, Edge } from '@xyflow/react';

const NodeGraph = lazy(() => import('@eventcatalog/visualiser').then((module) => ({ default: module.NodeGraph })));

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
}

const AstroNodeGraph = ({ isDevMode = false, resourceKey, ...otherProps }: AstroNodeGraphProps) => {
  // Astro-specific navigation handler
  const handleNavigate = useCallback((url: string) => {
    // Use window.location for navigation since we can't import astro:transitions/client in a React component
    window.location.href = url;
  }, []);

  // Astro-specific URL builder
  const handleBuildUrl = useCallback((path: string) => {
    // Simple URL builder - just return the path as-is
    // The consuming app (core) should handle base URLs if needed
    return path;
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
      />
    </Suspense>
  );
};

export default AstroNodeGraph;
