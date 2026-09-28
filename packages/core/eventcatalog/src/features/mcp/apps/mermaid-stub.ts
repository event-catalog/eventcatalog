/**
 * Stands in for `mermaid` in MCP App views. The visualiser's optional Mermaid view loads it
 * lazily, but MCP hosts already get the diagram as Mermaid text, and mermaid would more than
 * double the size of the view's HTML.
 */
const unavailable = async () => {
  throw new Error('The Mermaid view is not available here');
};

export default { initialize: () => {}, render: unavailable, parse: unavailable };
