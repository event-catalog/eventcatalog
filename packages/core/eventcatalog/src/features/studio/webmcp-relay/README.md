# WebMCP local relay (browser files)

`embed.js`, `widget.html` and `widget.js` are the browser files of [`@mcp-b/webmcp-local-relay`](https://github.com/WebMCP-org/npm-packages/tree/main/packages/webmcp-local-relay) **5.1.0** (MIT, see `LICENSE`), copied as published. Studio serves them at `/webmcp-relay/*` so a canvas can hand its WebMCP tools to desktop MCP clients running `npx -y @mcp-b/webmcp-local-relay@5.1.0`.

They're copied rather than installed because the package's Node dependencies (which EventCatalog doesn't run) pin vulnerable versions of `@modelcontextprotocol/core` and `zod`. When moving to a new relay version, copy its `dist/browser` files here and update the version in `ConnectAgentDialog.tsx`.
