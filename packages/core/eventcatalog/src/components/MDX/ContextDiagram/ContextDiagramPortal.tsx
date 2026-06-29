/**
 * Placeholder div the Context Diagram graph is portaled into.
 *
 * Mirrors NodeGraphPortal, but uses a distinct `-context-diagram-portal` id so a
 * system page can render both its System Diagram (the default `<NodeGraph />`)
 * and its Context Diagram (`<ContextDiagram />`) without the two graphs fighting
 * over the same portal target.
 */
const ContextDiagramPortal = (props: any) => {
  return (
    <div
      className="not-prose h-[30em] my-6 mb-12 w-full relative border! border-[rgb(var(--ec-page-border))]! rounded-md overflow-hidden"
      id={`${props.id}-context-diagram-portal`}
      style={{
        maxHeight: props.maxHeight ? `${props.maxHeight}em` : `30em`,
      }}
    />
  );
};

export default ContextDiagramPortal;
