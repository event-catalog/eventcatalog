# NodeGraph - Astro Adapter for @eventcatalog/visualiser

## Overview

This directory contains the Astro-specific adapter for the `@eventcatalog/visualiser` package. The visualiser package is framework-agnostic, and this adapter provides Astro-specific integrations.

## Components

### AstroNodeGraph.tsx

The main adapter component that wraps the `NodeGraph` from `@eventcatalog/visualiser` and provides:

- **Navigation**: Uses Astro's `navigate` function from `astro:transitions/client`
- **URL Building**: Uses Astro's `buildUrl` utility for consistent URL generation
- **Layout Persistence**: Integrates with Astro API routes for saving/resetting custom node layouts (dev mode only)
  - `/api/dev/visualiser-layout/save` - Saves node positions
  - `/api/dev/visualiser-layout/reset` - Resets node positions to defaults

### NodeGraph.astro

The Astro component that serves as the entry point for rendering node graphs. It:
- Fetches nodes and edges based on the collection type (services, events, domains, etc.)
- Applies saved layout positions when available (dev mode feature)
- Renders the `AstroNodeGraph` component with `client:only="react"`

### NodeGraphPortal.tsx

A simple portal component that creates the DOM container where the React component will render. Used by MDX components to embed node graphs in documentation.

## Usage

### In Astro Pages

```astro
---
import NodeGraph from '@components/MDX/NodeGraph/NodeGraph.astro';
---

<div id="my-graph-portal"></div>
<NodeGraph
  id="my-graph"
  collection="services"
  version="1.0.0"
  mode="full"
  linkTo="visualiser"
/>
```

### In MDX Content

```mdx
<NodeGraph id="my-service" collection="services" version="1.0.0" />
```

## Integration with @eventcatalog/visualiser

The `AstroNodeGraph` component directly uses the `NodeGraph` component from `@eventcatalog/visualiser` and provides the framework-specific callbacks:

```typescript
<NodeGraph
  {...props}
  onNavigate={handleNavigate}
  onBuildUrl={handleBuildUrl}
  onSaveLayout={handleSaveLayout}
  onResetLayout={handleResetLayout}
/>
```

### Known Limitations

Currently, the `onSaveLayout` and `onResetLayout` callbacks are passed through with a `@ts-expect-error` comment because the visualiser package's outer `NodeGraph` component doesn't expose these props in its TypeScript interface, even though the internal `NodeGraphBuilder` component does accept them.

**TODO**: Update the `@eventcatalog/visualiser` package to expose `onSaveLayout` and `onResetLayout` in the `NodeGraphProps` interface and forward them to `NodeGraphBuilder`.

## Migration Notes

This adapter replaces the old monolithic `NodeGraph.tsx` component that was previously in this directory. The old component has been:
- Refactored into the framework-agnostic `@eventcatalog/visualiser` package
- Wrapped by this new `AstroNodeGraph` adapter for Astro-specific integrations

Benefits of this architecture:
- The visualiser can be used in other frameworks (Next.js, Remix, etc.)
- Astro-specific concerns are isolated to this adapter
- Easier to test and maintain
- Clear separation of concerns
