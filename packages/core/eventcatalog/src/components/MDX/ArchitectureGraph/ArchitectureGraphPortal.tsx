// The portal id pairs each scanner-rendered island with its MDX placeholder.
// The occurrence index keeps multiple no-id embeds on one page from colliding
// (the first occurrence keeps the unsuffixed id).
export const architectureGraphPortalId = (id: string | undefined, occurrenceIndex: number) =>
  `${id ?? 'catalog'}-architecture-graph-portal${occurrenceIndex > 0 ? `-${occurrenceIndex}` : ''}`;

// Empty placeholder rendered by the MDX component map. The real graph is
// rendered by ArchitectureGraph.astro (which builds the data server-side) and
// portals itself into this div by id — same pattern as NodeGraphPortal.
const ArchitectureGraphPortal = (props: any) => {
  return (
    <div
      className="not-prose h-[30em] my-6 mb-12 w-full relative border! border-[rgb(var(--ec-page-border))]! rounded-md overflow-hidden"
      id={architectureGraphPortalId(props.id, props.occurrenceIndex ?? 0)}
      style={{
        maxHeight: props.maxHeight ? `${props.maxHeight}em` : `30em`,
      }}
    />
  );
};

export default ArchitectureGraphPortal;
