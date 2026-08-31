// Placeholders are matched to their islands positionally (nth placeholder in
// document order ↔ nth <ArchitectureGraph/> tag in the host page's body scan).
// The pairing must not rely on a render-time counter in the element id — Astro
// can invoke MDX component functions more than once per tag (renderer probing),
// which drifts such a counter out of sync with the body scan.
export const ARCHITECTURE_GRAPH_PORTAL_SELECTOR = '[data-architecture-graph-portal]';

// Empty placeholder rendered by the MDX component map. The real graph is
// rendered by ArchitectureGraph.astro (which builds the data server-side) and
// portals itself into this div — same pattern as NodeGraphPortal.
const ArchitectureGraphPortal = (props: any) => {
  return (
    <div
      className="not-prose h-[30em] my-6 mb-12 w-full relative border! border-[rgb(var(--ec-page-border))]! rounded-md overflow-hidden"
      data-architecture-graph-portal={props.id ?? 'catalog'}
      style={{
        maxHeight: props.maxHeight ? `${props.maxHeight}em` : `30em`,
      }}
    />
  );
};

export default ArchitectureGraphPortal;
