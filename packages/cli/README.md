## @eventcatalog/cli

Command-line interface for [EventCatalog](https://eventcatalog.dev). Execute catalog operations directly from your terminal to automate your EventCatalog.

### Installation

```sh
npm i @eventcatalog/cli
```

### Running with npx (no installation required)

```bash
npx @eventcatalog/cli --dir <catalog-path> <function-name> [args...]
```

### Running after installation

If you've installed the package, the `eventcatalog` command is available:

```bash
eventcatalog --dir <catalog-path> <function-name> [args...]
```

### Common Operations

**List all available functions:**

```bash
npx @eventcatalog/cli list
```

**Get an event:**

```bash
npx @eventcatalog/cli --dir ./my-catalog getEvent "OrderCreated"
npx @eventcatalog/cli --dir ./my-catalog getEvent "OrderCreated" "1.0.0"
```

**Get all events:**

```bash
npx @eventcatalog/cli --dir ./my-catalog getEvents
npx @eventcatalog/cli --dir ./my-catalog getEvents '{"latestOnly":true}'
```

**Write an event:**

```bash
npx @eventcatalog/cli --dir ./my-catalog writeEvent '{"id":"OrderCreated","name":"Order Created","version":"1.0.0","markdown":"# Order Created Event"}'
```

**Get a service:**

```bash
npx @eventcatalog/cli --dir ./my-catalog getService "InventoryService"
```

**Add an event to a service:**

```bash
npx @eventcatalog/cli --dir ./my-catalog addEventToService "InventoryService" "sends" '{"id":"OrderCreated","version":"1.0.0"}'
```

### Piping to Other Tools

Output is JSON by default, making it easy to pipe to tools like `jq`:

```bash
# Get all events and filter by version
npx @eventcatalog/cli --dir ./my-catalog getEvents | jq '.[] | select(.version == "1.0.0")'

# Count total events
npx @eventcatalog/cli --dir ./my-catalog getEvents | jq 'length'

# Extract event IDs
npx @eventcatalog/cli --dir ./my-catalog getEvents | jq '.[].id'
```

### Arguments Format

Arguments are automatically parsed:

- **JSON objects:** `'{"key":"value"}'` - parsed as object
- **JSON arrays:** `'["item1","item2"]'` - parsed as array
- **Booleans:** `true` or `false` - parsed as boolean
- **Numbers:** `42` or `3.14` - parsed as number
- **Strings:** anything else - kept as string

See the [SDK docs](https://www.eventcatalog.dev/docs/sdk) for more information and examples.

# Enterprise support

Interested in collaborating with us? Our offerings include dedicated support, priority assistance, feature development, custom integrations, and more.

Find more details on our [services page](https://eventcatalog.dev/services).
