---
sidebar_position: 1
id: components-overview
title: Component List
slug: /components/overview
---  

### `<Schema />`

This component will render your schema to the document. To make this work you will need to add a `schema` file into your event directory.

For more information check out the [schema guide for events](/docs/events/adding-schemas).

### `<SchemaViewer />`

This component will render your schema as documentation viewer to the document. To make this work you will need to add a `schema` file into your event directory.

For more information check out the [schema guide for events](/docs/events/adding-schemas).

#### Props

<APITable>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | '' | Title to render above your schema viewer |
| `maxHeight` | `number` | '' | The max height of the schema viewer |
| `defaultExpandedDepth` | `number` | 1 | Define the expand level for displaying nested objects/properties |
| `renderRootTreeLines` | `boolean` | false | Define show/hide a visual line for the root level |
</APITable>

#### Usage

```md title="Render the default schema viewer for your event"
<SchemaViewer />
```

```md title="Render the schema viewer, with a custom title, expanded the depth of the properties to level 5 and showing the root tree lines"
<SchemaViewer title="Event properties" defaultExpandedDepth='5' renderRootTreeLines maxHeight="500" />
```

### `<Mermaid />`

This component will render [mermaid diagrams](https://mermaid-js.github.io/mermaid/#/) into your documents.

If you use `<Mermaid />` without any props EventCatalog will render the relationships between your consumers and producers.

If you would like to **render custom** mermaid diagrams you can use the `charts` prop on the diagram.

Read [Mermaid documentation](https://mermaid-js.github.io/mermaid/#/) if you want to learn what other graphs you can render.

#### Props 

<APITable>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | '' | Title to render above your chart |
| `charts` | `string[]` | [] | An array of [mermaid charts](https://mermaid-js.github.io/mermaid/#/) to render to the your document |

</APITable>

#### Usage

```md title="Render the default graphs for your events and services"
<Mermaid />
```

```md title="Render any Mermaid Graph"
<Mermaid title="Event Rules & Targets" charts={[`flowchart LR 
Start --> Stop`]} />
```

:::tip
Remember the relationship between events and services is stored within the event itself through the `producer` and `consumer` frontmatter properties.
:::

For more information check out the [mermaid guide for events](/docs/events/consumers-and-producers) and [mermaid guide for services](/docs/services/producers-consumers).

### `<NodeGraph />`

This component will render [ReactFlow diagrams](https://reactflow.dev/) into your documents.
Clicking a node will navigate to the event or service page.

EventCatalog will render the relationships between your consumers and producers.

#### Props

<APITable>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | '' | Title to render above your node graph |
| `maxHeight` | `number` | '' | Set the max height of the node graph |
| `maxZoom` | `number` | '10' | Set the max zoom level of the node graph |
| `fitView` | `boolean` | true | Fit all elements on the view size |
| `isAnimated` | `boolean` | true | Toggle if the node connections should be animating |
| `isDraggable` | `boolean` | false | Toggle if the nodes are draggable |
</APITable>

#### Usage

```md title="Render the default node graphsfor your events and services"
<NodeGraph />
```

```md title="Render the customized node graphs in the "
<NodeGraph maxHeight={400} isDraggable={true} isAnimated={true} fitView={false} />
```

### `<Admonition />`

#### Rendered Examples

#### Rendered Example 
![Admonition Example](/img/guides/mdx/admonition-examples.png)

#### Usage

```md title=Info example
<Admonition type="info">Example of information</Admonition>
```

```md title=Warning example
<Admonition type="warning">Example of warning</Admonition>
```

```md title=Alert example
<Admonition type="alert">Example of alert</Admonition>
```


### `<EventExamples />`

This component will allow you share code examples for any event. Reasons why you might do this:

- Help the onboarding of the event with code
- Show developers how to trigger the event
- Show developers how to consume the events

**Any language is supported!**

#### Rendered Example 
![UserSignedUp with Code Example](/img/guides/events/UserSignedUpExampleWithExamples.png)


#### Usage

```md title=EventExamples Component
<EventExamples title="How to trigger event" />
```

EventCatalog will look inside your `examples` directory and every example will be rendered in it's own  tab.

If you want to learn more you can read the [code examples guide](/docs/events/adding-examples).

### `<OpenAPI />`

This component will render any `openapi.yaml` or `openapi.json` file inside your `service folder`.

EventCatalog uses [Swagger UI](https://petstore.swagger.io/?_ga=2.53430379.2146201950.1646656985-1065913731.1646656985) to render your OpenAPI document within EventCatalog.

To understand how it works and use OpenAPI with your Services checkout the [schema guide for openapi](/docs/services/adding-service-openapi).

#### Props

<APITable>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `showTitle` | `boolean` | `true` | Show or hide the title rendered by Swagger UI |
| `url` | `string` | `` | Optional URL to load your OpenAPI file. If you provide a URL to load this will be used over the local file system and the file will be loaded from external URL. |
</APITable>

#### Rendered Example 
![OpenAPI Example](/img/guides/mdx/openapi.png)


#### Usage

```md title="Render your OpenAPI File"
<OpenAPI />
```

:::tip
Make sure you have your `openapi.yaml` or `openapi.json` file inside your service.

e.g `/services/Payment Service/openapi.yaml`

**The `<OpenAPI />` will only work with a valid openapi file inside your service directory.**
:::

### `<AsyncAPI />`

This component will render any `asyncapi.yaml` file inside your `service folder`.

EventCatalog uses [asyncapi-react](https://github.com/asyncapi/asyncapi-react) to render your AsyncAPI document within EventCatalog.

To understand how it works and use AsyncAPI with your Services checkout the [schema guide for asyncapi](/docs/services/adding-service-asyncapi).

#### Props

#### Rendered Example 
![AsyncAPI Example](/img/guides/mdx/asyncapi.gif)

#### Usage

```md title="Render your AsyncAPI File"
<AsyncAPI />
```

:::tip
Make sure you have your `asyncapi.yaml` file inside your service.

e.g `/services/Payment Service/asyncapi.yaml`

**The `<AsyncAPI />` will only work with a valid asyncapi file inside your service directory.**
:::
