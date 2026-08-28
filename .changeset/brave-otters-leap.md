---
"@eventcatalog/core": minor
"@eventcatalog/visualiser": minor
---

chore(core,visualiser): upgrade React and React DOM from 18 to 19. If your catalog has custom React components under `components/`, they now run on React 19 — see the React 19 upgrade guide for removed APIs (`defaultProps` on function components, `propTypes`, string refs, `ReactDOM.render`).
