# EventCatalog MCP server (spike)

A public, no-login MCP server. Connect your AI client and ask *"help me understand how payments work"*. The agent reads your code and specs, describes the architecture in EventCatalog's terms (domains, systems, services, events, commands, queries, channels, data stores) and calls `render_architecture`. You get the EventCatalog visualiser with its levels (L1 domains and systems, L2 services, L3 messages and channels):

- **Clients with MCP Apps** (Claude web/desktop, ChatGPT, VS Code, Goose) show it inline. Click a node to ask the agent about it.
- **Other clients** (e.g. Claude Code) get a link to the same diagram in the browser, plus a Mermaid version.

**We never store your architecture.** It arrives in the tool call, is validated, and goes back in the result. A change the agent makes to a diagram you have open waits in memory only until your open view takes it (seconds), and goes only to that view. The browser link carries the model in the URL fragment (`/view#m=...`), which browsers never send to the server. Logs hold only timings.

## In the view
- **A canvas, as drawing tools have it.** The toolbar is at the top: lock, select (V), hand (H), the levels (1, 2, 3), sticky notes (N), text (T) and comments (C). The resources to drag on are on the left. Zoom, undo/redo, fit, reorder and the comments list are at the bottom left. The menu (☰) is top left, with Open (Cmd+O), Save to file (Cmd+S), Export… (as an image, Cmd+Shift+E, or the model copied to the clipboard), Command palette (Cmd+K), Find (Cmd+F), Help (?), **Export to EventCatalog** and the theme (light by default).
- **Kept in your browser.** The canvas is saved to local storage as you work, not on our servers. Diagram links (`#m=...`) open on it (asking first if they'd replace your work).
- **Built up in front of you** when the agent draws it (Studio's agent choreography), as it writes it in chats that stream it; then **changed in place** when you ask the agent for changes, in the same view, keeping what you changed and where things are.
- **Share** (top right): a link with the diagram in it (for a teammate, or to paste to your agent), a **live session**, or connecting your agent.
- **Live collaboration:** an end-to-end encrypted room (`#room=<id>,<key>`, the key never leaves the link's fragment). Everyone edits the same canvas and sees each other's cursors. The server relays encrypted messages and stores nothing. Whoever started it can stop it.
- **Hotspots** (A, or right-click): what people should know about the architecture (risks, single points of failure, known problems, the key parts), critical, warning or info. A marker and a glow on the node, a count on what it's in on L1 and L2, and a list (bottom left), most important first. Agents add them too.
- **Comments** (C, or right-click): threads pinned to a node or a place, with replies and resolving. They go to the agent with the diagram.
- **You, top right:** your name and colour, on your comments and your cursor in live sessions.
- **`.eventcatalog` files:** Save to file downloads the diagram (with its notes and comments) as JSON; Open, or dropping a file on the canvas, brings it back.
- **Click a node** and **Edit** for its page: type, summary, badges, what it sends, receives, reads and writes, "View the code", and for messages a **Schema** tab.
- **Export to EventCatalog:** one prompt to copy into your AI agent; it ports the diagram to an EventCatalog with the [EventCatalog skills](https://github.com/event-catalog/skills).
- Levels L1/L2/L3, EventCatalog's ELK layout. Built with Tailwind (EventCatalog's theme variables) and Headless UI.

## Tools
- `get_architecture_schema`: the vocabulary, relation rules, how to change a diagram, and an example. Agents call it first.
- `render_architecture`: `{ model, focus?, level? }`, once per diagram, where the model can carry `notes`, `hotspots` and `comments` → the interactive view (`_meta`), a `diagramId`, and text (view link, Mermaid, summary).
- `edit_diagram`: `{ diagramId, changes }` → changes the diagram where the user has it open: only what changes (`add_resource`, `update_resource`, `remove_resource`, `add_relation`, `remove_relation`, `add_hotspot`, `remove_hotspot`, `add_note`, `set_title`). It has no view of its own (that would show a new diagram): the open view waits for requests (`wait_for_diagram_requests`, app-only), makes the changes on its canvas and answers (`answer_diagram_request`) with which were made and why any weren't. Only the view holding its own secret for that diagram can take and answer them (`src/mcp/bridge.ts`).
- `read_diagram`: `{ diagramId }` → the open diagram as it is now, with what the user changed (from the view), or `{ diagram }` → the model in a diagram link someone pasted (`#m=...`). Never where things are. Live session links are encrypted and can't be read.
- `get_architecture_view`: app-only, for hosts that don't pass `_meta` to the view.

## Run it
An app in the EventCatalog monorepo (`apps/studio-web`), using the workspace's `@eventcatalog/visualiser`. From the repo root:
```bash
pnpm install
pnpm turbo run build --filter=@eventcatalog/studio-web   # the visualiser first, then this (its view and server)
```
Then in `apps/studio-web`:
```bash
pnpm dev             # builds the view, serves http://localhost:8787 (the canvas) and /mcp, from source
pnpm test
pnpm build && pnpm start   # as production runs it: the view (dist/) and the server bundled (build/server.js)
```
After changing the visualiser, build it again (`pnpm --filter @eventcatalog/visualiser build`) before building the view.

Connect Claude Code: `claude mcp add --transport http eventcatalog http://localhost:8787/mcp`

To try the inline view in Claude or ChatGPT, expose it publicly (e.g. `cloudflared tunnel --url http://localhost:8787`) and add `<url>/mcp` as a custom connector with no sign-in.

## Performance
The canvas is profiled like EventCatalog v5-beta's Studio: rules and baselines in the repo's `studio` skill (`.claude/skills/studio/`, with `references/studio-web.md` for this app), tools in `scripts/perf/` (renders, JS and main-thread time per scenario over CDP, a pretend person in a live session, test canvases). Dragging a node is ~20 renders a frame on 100 nodes; nothing animates or renders at idle, or while someone else moves their pointer.

## Deploy (Fly)
From the repo root (the Docker build uses workspace packages; `.dockerignore` there says which):
```bash
fly deploy . --config apps/studio-web/fly.toml --ha=false --remote-only
```
Live at https://eventcatalog-mcp.fly.dev. One long-running Node process on one machine (`fly.toml`): rate limits (60/min, 1,000/day per IP) and live rooms are in memory, so keep it to one machine until rooms are routed by id. `PUBLIC_URL` (in `fly.toml`) is where links and the social preview point. The page is served compressed (Brotli, gzip) from memory.

## Layout
- `PUBLIC_URL`: where view links point (set it behind a tunnel, e.g. `PUBLIC_URL=https://xyz.trycloudflare.com pnpm dev`).
- `src/server.ts`: Hono. `POST /mcp` (stateless Streamable HTTP), `GET /` and `/view` (the canvas), `GET /og.png`, `GET /health`
- `src/rooms.ts`: the live sessions' relay (WebSockets at `/rooms/:id`): passes encrypted messages between the people in a room, stores nothing, logs counts only
- `src/mcp/`: the server, tools, and `register.ts` (`registerMcpApp`, ported from EventCatalog v5-beta)
- `src/model/`: the model schema, validation, Model → visualiser graph (L1/L2/L3), Mermaid and summary
- `view/`: one bundle, built to `dist/view.html`. It's the MCP App inside hosts, and the browser page at `/`. `view/studio/` is the canvas page around Studio's shared canvas (`@eventcatalog/visualiser/studio`, in `packages/visualiser/src/studio/`: its document, levels, nodes, comments, hotspots and presence, shared with EventCatalog's Studio), `view/collab/` live sessions, and `view/og/` the social preview (`og.html`, rendered to `og.png`)
- `scripts/build-view.mjs` dedupes React, React Flow and Radix's dropdown with the visualiser's (pnpm gives a workspace package its own copies; two React Flows don't share a canvas)

Files under `view/ported/` and `src/mcp/register.ts` are copied from `packages/core` (each says where from). Studio's canvas is shared with core through the visualiser: change it there (`packages/visualiser/src/studio/`, with its tests), and rebuild the visualiser before building this.

MIT licensed (`LICENSE`), unlike `packages/core`: it mustn't depend on `@eventcatalog/core`.
