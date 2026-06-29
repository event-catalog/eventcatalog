/**
 * Placeholder div the global System Context Map graph is portaled into.
 *
 * Mirrors NodeGraphPortal, but uses a fixed `system-context-map-portal` id so the
 * homepage (and any other page) can embed the global system context map without an
 * id/version. The matching <NodeGraph collection="system-context-map" /> renders the
 * graph into this portal.
 */
const SystemContextMapPortal = (props: any) => {
  return (
    <div
      className="not-prose my-6 mb-12 w-full relative border! border-[rgb(var(--ec-page-border))]! rounded-md overflow-hidden"
      id="system-context-map-portal"
      style={{
        height: props.height ? `${props.height}em` : '36em',
        maxHeight: props.maxHeight ? `${props.maxHeight}em` : '36em',
      }}
    />
  );
};

export default SystemContextMapPortal;
