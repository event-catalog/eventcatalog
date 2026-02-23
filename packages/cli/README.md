## @eventcatalog/cli

Command-line interface for [EventCatalog](https://eventcatalog.dev). Import and export catalogs using the [EventCatalog DSL](https://www.eventcatalog.dev/docs/development/dsl/introduction), run SDK functions directly from your terminal, and automate your EventCatalog workflows.

### Installation

```sh
npm i @eventcatalog/cli
```

### Running with npx (no installation required)

```bash
npx @eventcatalog/cli --dir <catalog-path> <command> [args...]
```

### Running after installation

If you've installed the package, the `eventcatalog` command is available:

```bash
eventcatalog --dir <catalog-path> <command> [args...]
```

### Global Options

| Option             | Description                    | Default                 |
| ------------------ | ------------------------------ | ----------------------- |
| `-d, --dir <path>` | Path to your catalog directory | `.` (current directory) |

---

### Commands

#### `import` — Import DSL files into your catalog

Parse `.ec` (EventCatalog DSL) files and write them as catalog resources (markdown + frontmatter).

```bash
eventcatalog import [files...] [options]
```

**Options:**

| Option      | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `--stdin`   | Read DSL from stdin instead of files                         |
| `--dry-run` | Preview changes without writing to disk                      |
| `--flat`    | Write all resources at the top level (no nested directories) |
| `--no-init` | Skip the interactive catalog scaffolding prompt              |

**Examples:**

```bash
# Import a single DSL file
eventcatalog import architecture.ec

# Import multiple files
eventcatalog import services.ec events.ec domains.ec

# Pipe DSL from another tool
cat architecture.ec | eventcatalog import --stdin

# Preview what would change
eventcatalog import architecture.ec --dry-run

# Import without nesting services inside domains
eventcatalog import architecture.ec --flat
```

**Behaviors:**

- If no `eventcatalog.config.js` exists, you'll be prompted to scaffold a new catalog (skip with `--no-init`).
- Importing a newer version of an existing resource automatically versions the old one.
- Re-importing the same version overwrites the existing resource.
- Referenced resources that aren't defined in the DSL (e.g., `sends event OrderCreated` without an inline body) are created as stubs at version `0.0.1`.
- Existing resource locations are preserved — updates go to where the resource already lives.

---

#### `export` — Export catalog resources to DSL

Convert catalog resources back into EventCatalog DSL (`.ec`) format.

```bash
eventcatalog export [options]
```

**Options:**

| Option                | Description                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `--all`               | Export the entire catalog                                                                    |
| `--resource <type>`   | Resource type to export (`event`, `command`, `query`, `service`, `domain`, `channel`)        |
| `--id <id>`           | Export a specific resource by ID (requires `--resource`)                                     |
| `--version <version>` | Export a specific version (requires `--resource` and `--id`)                                 |
| `--hydrate`           | Include referenced resources (e.g., messages referenced by a service)                        |
| `--stdout`            | Print to stdout instead of writing a file                                                    |
| `--playground`        | Open the exported DSL in the [EventCatalog Playground](https://playground.eventcatalog.dev/) |
| `--output <path>`     | Custom output file path                                                                      |

**Examples:**

```bash
# Export a single event
eventcatalog export --resource event --id OrderCreated --stdout

# Export all services with their referenced messages
eventcatalog export --resource service --hydrate --stdout

# Export the entire catalog to a file
eventcatalog export --all --output catalog.ec

# Export and open in the playground
eventcatalog export --all --playground
```

---

#### `list` — List available SDK functions

Display all SDK functions organized by category (Events, Commands, Queries, Services, Domains, etc.).

```bash
eventcatalog list
```

---

#### `<function>` — Run any SDK function

Any unrecognized command is treated as an SDK function call. Output is JSON.

```bash
eventcatalog <function-name> [args...]
```

**Examples:**

```bash
# Get an event (latest version)
eventcatalog --dir ./my-catalog getEvent "OrderCreated"

# Get a specific version
eventcatalog --dir ./my-catalog getEvent "OrderCreated" "1.0.0"

# Get all events with options
eventcatalog --dir ./my-catalog getEvents '{"latestOnly":true}'

# Write an event
eventcatalog --dir ./my-catalog writeEvent '{"id":"OrderCreated","name":"Order Created","version":"1.0.0","markdown":"# Order Created"}'

# Get a service
eventcatalog --dir ./my-catalog getService "InventoryService"

# Add an event to a service
eventcatalog --dir ./my-catalog addEventToService "InventoryService" "sends" '{"id":"OrderCreated","version":"1.0.0"}'
```

Run `eventcatalog list` to see all available functions.

---

### Piping and Composing

Output from SDK functions is JSON, making it easy to pipe to tools like `jq`:

```bash
# Filter events by version
eventcatalog --dir ./my-catalog getEvents | jq '.[] | select(.version == "1.0.0")'

# Count total events
eventcatalog --dir ./my-catalog getEvents | jq 'length'

# Extract event IDs
eventcatalog --dir ./my-catalog getEvents | jq '.[].id'
```

### Arguments Format

Arguments are automatically parsed:

- **JSON objects:** `'{"key":"value"}'` — parsed as object
- **JSON arrays:** `'["item1","item2"]'` — parsed as array
- **Booleans:** `true` or `false` — parsed as boolean
- **Numbers:** `42` or `3.14` — parsed as number
- **Strings:** anything else — kept as string

### Documentation

- [EventCatalog DSL](https://www.eventcatalog.dev/docs/development/dsl/introduction)
- [SDK reference](https://www.eventcatalog.dev/docs/sdk)
- [CLI documentation](https://www.eventcatalog.dev/docs/development/cli)

## Enterprise support

Interested in collaborating with us? Our offerings include dedicated support, priority assistance, feature development, custom integrations, and more.

Find more details on our [services page](https://eventcatalog.dev/services).
