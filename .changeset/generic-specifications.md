---
'@eventcatalog/core': minor
'@eventcatalog/sdk': minor
'@eventcatalog/linter': minor
'@eventcatalog/exporters': patch
'@eventcatalog/visualiser': patch
---

feat(core): attach any specification file to a service, domain or message with `type: generic`, such as a WSDL, an XML Schema, or a JSON or YAML contract. Each gets a page that shows its source (XML, JSON and YAML are highlighted) and is listed in the sidebar, the resource's badges, the Schema Explorer and the visualiser, with an optional custom `icon`
