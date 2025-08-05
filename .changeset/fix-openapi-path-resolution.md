---
"@eventcatalog/core": patch
---

Fix cross-platform path resolution for OpenAPI specs and schemas

Addresses issues #1652 and #1644 by improving the path resolution logic in the `resolveProjectPath` function with full cross-platform compatibility. This fix ensures that paths starting with `../` are resolved correctly on Windows, macOS, and Linux systems.

**Key improvements:**
- Normalizes path separators (`/` and `\`) for cross-platform compatibility
- Prevents `../` paths from incorrectly resolving outside the project directory  
- Fixes OpenAPI specifications and schemas failing to load after version 2.54.4
- Maintains security boundaries while ensuring functionality across all operating systems

This resolves the root cause that wasn't fully addressed in version 2.54.4, ensuring that both OpenAPI specifications and AsyncAPI specifications render correctly across all platforms.