## @eventcatalog/sdk

SDK to interact with your EventCatalog programmatically in JavaScript/TypeScript.

### Motivation

EventCatalog vision is to integrate with any broker or technology in the world. As its powered by Markdown and contents are built at build time, you can use the SDK
to generate these resources. For example you can integrate with your systems, create domains, services and messages for EventCatalog using this SDK.

The SDK supports standard CRUD operations for domains, service and messages in EventCatalog.

The SDK is useful for creating your own EventCatalog plugins and integrations.

**Features**

- Create, read and delete resources in EventCatalog
- Version any resource in EventCatalog using the `version` SDK api.
- Add files or schemas to resources in EventCatalog
- and more...

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
const service = await getService('PaymentService');
```

### CLI

Looking for command-line usage? See [@eventcatalog/cli](../cli).

See the [SDK docs](https://www.eventcatalog.dev/docs/sdk) for more information and examples.

# Enterprise support

Interested in collaborating with us? Our offerings include dedicated support, priority assistance, feature development, custom integrations, and more.

Find more details on our [services page](https://eventcatalog.dev/services).
