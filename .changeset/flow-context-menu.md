---
"@eventcatalog/core": patch
"@eventcatalog/visualiser": patch
---

fix: restore custom right-click context menu for message and service nodes in flow diagrams. `flows-node-graph` now populates `contextMenu` on step nodes (previously only non-flow graphs did, so flow pages fell through to the browser default menu). Context-menu items also get explicit colour and no-underline styling so they no longer inherit browser-default purple/underlined link styling when the host page has no link resets.
