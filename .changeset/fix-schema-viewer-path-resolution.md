---
"@eventcatalog/core": patch
---

fix(core): resolve SchemaViewer path resolution for relative paths

Fixes SchemaViewer components failing to load schema files with paths starting with "../". The issue was caused by inconsistent path resolution logic in SchemaViewerRoot.astro.

- Added resolveProjectPath function to handle "../" paths correctly
- Updated getAbsoluteFilePathForAstroFile to use the new path resolution logic  
- SchemaViewerRoot.astro now uses resolveProjectPath for consistent path handling