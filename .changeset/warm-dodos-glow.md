---
"@eventcatalog/core": minor
---

feat: add visualizer layout persistence in dev mode (#2035)

Add ability to save and restore custom node positions in the visualizer during development. Layouts are saved to `_data/visualizer-layouts/` and can be committed to git for team sharing. Dev-only feature with UI indicators for layout changes and save/reset options in the visualizer dropdown menu.
