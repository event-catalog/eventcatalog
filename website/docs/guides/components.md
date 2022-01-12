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

### `<Mermaid />`

Supported in 
- event markdown files
- service markdown files

This component will render your mermaid diagrams into the document. 

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

