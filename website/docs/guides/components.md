---
sidebar_position: 2
id: components
title: MDX Components
---  

### `<Schema />`

Supported in 
- event markdown files

This component will render your schema to the document. To make this work you will need to add a `schema` file into your event directory.

For more information check out the [schema guide for events](/docs/events/adding-schemas).

### `<SchemaViewer />`

Supported in
- event markdown files

This component will render your schema as documentation viewer to the document. To make this work you will need to add a `schema` file into your event directory.

For more information check out the [schema guide for events](/docs/events/adding-schemas).

#### Props

<APITable>

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultExpandedDepth` | `number` | 1 | Define the expand level for displaying nested objects/properties |
| `renderRootTreeLines` | `boolean` | false | Define show/hide a visual line for the root level |
</APITable>

#### Usage

```md title="Render the default schema viewer for your event"
<SchemaViewer />
```

```md title="Render the schema viewer, with a custom expand depth of 5 levels and showing the root tree lines"
<SchemaViewer defaultExpandedDepth='5' renderRootTreeLines />
```

### `<Mermaid />`


This component will render [mermaid diagrams](https://mermaid-js.github.io/mermaid/#/) into your documents.

If you use `<Mermaid />` without any props EventCatalog will render the relationships between your consumers and producers.

If you would like to **render custom** mermaid diagrams you can use the `charts` prop on the diagram.

Read [Mermaid documentation](https://mermaid-js.github.io/mermaid/#/) if you want to learn what other graphs you can render.

#### Support

You can use this MDX component inside
- event markdown files
- service markdown files

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

### `<Admonition />`

#### Rendered Examples

Supported in 
- event markdown files
- service markdown files

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

Supported in 
- event markdown files

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

