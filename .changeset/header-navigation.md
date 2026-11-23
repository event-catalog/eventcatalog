---
'@eventcatalog/core': minor
'@eventcatalog/create-eventcatalog': patch
---

feat(core): add links to the header, like a docs site, with `navigation.header` in eventcatalog.config.js. A link can go to a catalog page or another site, and an entry with `items` is a dropdown, with optional icons, descriptions and labelled sections. The link for the section you're in is highlighted. When the header is too narrow for its links, they move into the menu. New catalogs created from the default template come with header links, and their config sets `colorMode` (dark, with the toggle) so it is easy to change.

The sidebar's vertical navigation now treats links the same way: a `//host` link opens in a new tab, a link with a query or hash keeps its trailing slash in the right place, and an item whose href uses another scheme (such as `javascript:`) is left out.
