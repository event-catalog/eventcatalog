---
'@eventcatalog/visualiser': patch
'@eventcatalog/core': patch
---

fix(visualiser): diagram nodes use the `styles.node.color` and `styles.node.label` set in a resource's frontmatter again (ignored since 2.55.0). The label replaces the node's type badge ("Service", "Event"...), and the colour (a Tailwind colour name like `blue`, or a hex colour like `#0ea5e9`) colours its border, badge, handles and owners, on default and post-it nodes, for services, events, commands, queries, channels, data stores, data products and agents. Flow nodes now draw their colour too.
