---
sidebar_position: 17
keywords:
- components
- remote schema
- fetch
- runtime
sidebar_label: RemoteSchema
title: RemoteSchema
description: Component for fetching and rendering remote schemas in EventCatalog
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';
import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.52.0" />

The **RemoteSchema** component fetches and renders schemas from remote URLs at runtime, keeping your documentation automatically synchronized with external schema sources.

**Schemas can be fetched from any accessible URL and support authentication headers for private APIs.**

:::tip
**The `<RemoteSchema/>` component fetches schemas at runtime.**

This ensures your documentation stays up-to-date with the latest schema versions without manual updates.
:::

:::info SSR Mode Required
The `<RemoteSchema/>` component only works in Server-Side Rendering (SSR) mode. Make sure your EventCatalog is configured to run in SSR mode to use this component. You can read more about how to configure your EventCatalog to run in SSR mode [here](/docs/development/deployment/build-ssr-mode).
:::

### Usage

**Basic Example**

```jsx /events/MyEvent/index.mdx
<RemoteSchema url="https://api.example.com/schemas/user-registered.json" />
```

**With Custom Title and Height**

```jsx /events/MyEvent/index.mdx
<RemoteSchema
  url="https://api.example.com/schemas/payment.json"
  title="Payment Schema"
  maxHeight="600"
/>
```

### Fetching from Private APIs

<PlanBanner plan="Scale" />

For private APIs requiring authentication, you can provide headers:

```jsx /events/MyEvent/index.mdx
<RemoteSchema 
  url="https://private-api.example.com/schemas/order.json"
  headers={{
    "Authorization": "Bearer ${API_TOKEN}",
    "X-API-Key": "${API_KEY}"
  }}
  title="Order Schema"
/>
```

:::tip Loading environment variables

Add your environment variables to the `.env` file in the root of your EventCatalog project.

The RemoteSchema component will automatically map the environment variables to the template string.
:::

**Using JSONPath to Extract Specific Schema Parts**

When your API returns nested schemas, use JSONPath to extract specific parts:

```jsx /events/MyEvent/index.mdx
<RemoteSchema 
  url="https://api.example.com/openapi.json"
  jsonPath="$.components.schemas.UserEvent"
  title="User Event Schema"
/>
```

**Rendering as Raw JSON**

Force rendering as raw JSON instead of the schema viewer:

```jsx /events/MyEvent/index.mdx
<RemoteSchema 
  url="https://api.example.com/schemas/config.json"
  renderAs="raw"
  title="Configuration Schema"
/>
```

### Output
The component automatically detects JSON Schema format and renders an interactive [Schema Viewer](/docs/development/components/components/schema-viewer), or displays raw content for other formats.

### Props

| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `url` (required)        | `string`  | (empty)           | The URL to fetch the schema from. Supports environment variable templating with `${VAR_NAME}` syntax. |
| `title` (optional)      | `string`  | "Remote Schema"   | Title to display above the schema                                 |
| `maxHeight` (optional)  | `string`  | "400"             | Maximum height of the schema viewer in pixels                    |
| `headers` (optional)    | `object`  | `{}`              | HTTP headers for authentication (requires EventCatalog Scale plan) |
| `jsonPath` (optional)   | `string`  | (empty)           | [JSONPath expression](https://github.com/dchester/jsonpath) to extract specific parts of the response    |
| `renderAs` (optional)   | `string`  | "auto"            | Rendering mode: "auto", "schema", or "raw"                      |

### Environment Variable Support

The `url` and `headers` props support environment variable templating using `${VARIABLE_NAME}` syntax:

```md
<RemoteSchema 
  url="https://${API_HOST}/schemas/user.json"
  headers={{
    "Authorization": "Bearer ${API_TOKEN}"
  }}
/>
```

:::tip Loading environment variables
Add your environment variables to the `.env` file in the root of your EventCatalog project.

The RemoteSchema component will automatically map the environment variables to the template string.
:::

### JSONPath Examples

Extract specific schema definitions from complex API responses using [JSONPath](https://github.com/dchester/jsonpath).

```md
<!-- Extract a specific component schema from OpenAPI -->
<RemoteSchema 
  url="https://api.example.com/openapi.json"
  jsonPath="$.components.schemas.User"
/>

<!-- Extract from AsyncAPI -->
<RemoteSchema 
  url="https://api.example.com/asyncapi.json"
  jsonPath="$.components.messages.UserCreated.payload"
/>

<!-- Extract from nested arrays -->
<RemoteSchema 
  url="https://api.example.com/schemas.json"
  jsonPath="$.definitions[0].schema"
/>
```

### Error Handling

The component provides clear error messages for common issues:

- **Network errors**: Connection timeouts, DNS resolution failures
- **Authentication errors**: Invalid credentials or missing headers
- **JSONPath errors**: Invalid JSONPath expressions
- **Format errors**: Unsupported schema formats

### Benefits for Teams

- **Always up-to-date**: Schemas are fetched at runtime, ensuring documentation reflects the latest API changes
- **Reduced maintenance**: No need to manually update schema files when APIs change
- **Single source of truth**: Documentation pulls directly from your API definitions
- **Private API support**: Secure access to internal schemas with authentication headers
- **Flexible extraction**: Use JSONPath to document specific parts of large API specifications

This component bridges the gap between your live APIs and documentation, ensuring your EventCatalog always reflects the current state of your systems.

### Support

The `<RemoteSchema/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
