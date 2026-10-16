---
'@eventcatalog/exporters': minor
'@eventcatalog/cli': minor
'@eventcatalog/core': minor
---

feat: custom exports, parts of the catalog for people outside the team. Each is a file in `exports/` whose frontmatter chooses what's in it (include and exclude, by id or by custom property such as `x-public: true`; references; hide) and whose body is its introduction. `eventcatalog build` writes them to `exports/<id>.html`, and `eventcatalog export <id> [--check]` writes one or reports what's in it and what was left out
