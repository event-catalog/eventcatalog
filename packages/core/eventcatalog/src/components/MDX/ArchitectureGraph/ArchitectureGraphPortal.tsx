// Empty placeholder rendered by the MDX component map. The real graph is
// rendered by ArchitectureGraph.astro (which builds the data server-side) and
// portals itself into this div by id — same pattern as NodeGraphPortal.
const ArchitectureGraphPortal = (props: any) => {
  return (
    <div
      className="not-prose h-[30em] my-6 mb-12 w-full relative border! border-[rgb(var(--ec-page-border))]! rounded-md overflow-hidden"
      id={`${props.id ?? 'catalog'}-architecture-graph-portal`}
      style={{
        maxHeight: props.maxHeight ? `${props.maxHeight}em` : `30em`,
      }}
    />
  );
};

export default ArchitectureGraphPortal;
