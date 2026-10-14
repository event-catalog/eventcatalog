---
'@eventcatalog/core': minor
---

chore(core): upgrade React and React DOM to 19, and `@asyncapi/react-component` to 3.2.1 (which now supports React 19). Custom React components in your catalog's `components/` folder now run on React 19. If any of them use APIs that React 19 removed (`defaultProps` on function components, `propTypes`, string refs, `ReactDOM.render`, `findDOMNode`), update them.
