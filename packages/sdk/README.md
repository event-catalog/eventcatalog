## @eventcatalog/sdk

SDK and CLI tool to interact with your EventCatalog. Use programmatically in JavaScript/TypeScript or directly from the command line to automate your EventCatalog.

### Motivation

EventCatalog vision is to integrate with any broker or technlogy in the world. As its powered by Markdown and contents are built at build time, you can use the SDK
to generate these resources. For example you can integrate with your systems, create domains, services and messages for EventCatalog using this SDK.

The SDK supports standard CRUD operations for domains, service and messages in EventCatalog.

The SDK is useful for creating your own EventCatalog plugins and integrations (open source plugins coming in July 2024)

**Features**

- Create, read and delete resources in EventCatalog
- Version any resource in EventCatalog using the `version` SDK api.
- Add files or schemas to resources in EventCatalog
- and more more...

### Installation

```sh
npm i @eventcatalog/sdk
```

### Example usage

```typescript
import utils from '@eventcatalog/sdk';

const { getEvent, versionEvent, getService } = utils(PATH_TO_CATALOG);

// Gets event by id
const event = await getEvent('InventoryEvent');

// Gets event by id and version
const event2 = await getEvent('InventoryEvent', '1.0.0');

// Version the event InventoryEvent (e.g goes to /versioned/{version}/InventoryEvent)
await versionEvent('InventoryEvent');

// Returns the service /services/PaymentService
const service await getService('PaymentService');
```

### CLI Usage

The SDK includes a command-line interface for executing SDK functions directly from your terminal.

#### Running with npx (no installation required)

You can run the CLI directly using `npx` without installing the package:

```bash
npx @eventcatalog/sdk --dir <catalog-path> <function-name> [args...]
```

#### Running after installation

If you've installed the package, the `eventcatalog` command is available:

```bash
eventcatalog --dir <catalog-path> <function-name> [args...]
```

#### Common Operations

**List all available functions:**

```bash
npx @eventcatalog/sdk list
```

**Get an event:**

```bash
npx @eventcatalog/sdk --dir ./my-catalog getEvent "OrderCreated"
npx @eventcatalog/sdk --dir ./my-catalog getEvent "OrderCreated" "1.0.0"
```

**Get all events:**

```bash
npx @eventcatalog/sdk --dir ./my-catalog getEvents
npx @eventcatalog/sdk --dir ./my-catalog getEvents '{"latestOnly":true}'
```

**Write an event:**

```bash
npx @eventcatalog/sdk --dir ./my-catalog writeEvent '{"id":"OrderCreated","name":"Order Created","version":"1.0.0","markdown":"# Order Created Event"}'
```

**Get a service:**

```bash
npx @eventcatalog/sdk --dir ./my-catalog getService "InventoryService"
```

**Add an event to a service:**

```bash
npx @eventcatalog/sdk --dir ./my-catalog addEventToService "InventoryService" "sends" '{"id":"OrderCreated","version":"1.0.0"}'
```

#### Piping to Other Tools

Output is JSON by default, making it easy to pipe to tools like `jq`:

```bash
# Get all events and filter by version
npx @eventcatalog/sdk --dir ./my-catalog getEvents | jq '.[] | select(.version == "1.0.0")'

# Count total events
npx @eventcatalog/sdk --dir ./my-catalog getEvents | jq 'length'

# Extract event IDs
npx @eventcatalog/sdk --dir ./my-catalog getEvents | jq '.[].id'
```

#### Arguments Format

Arguments are automatically parsed:

- **JSON objects:** `'{"key":"value"}'` - parsed as object
- **JSON arrays:** `'["item1","item2"]'` - parsed as array
- **Booleans:** `true` or `false` - parsed as boolean
- **Numbers:** `42` or `3.14` - parsed as number
- **Strings:** anything else - kept as string

See the [SDK docs](https://www.eventcatalog.dev/docs/sdk) for more information and examples

# Enterprise support

Interested in collaborating with us? Our offerings include dedicated support, priority assistance, feature development, custom integrations, and more.

Find more details on our [services page](https://eventcatalog.dev/services).
