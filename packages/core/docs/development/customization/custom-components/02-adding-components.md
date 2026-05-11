---
keywords:
- EventCatalog components
sidebar_label: Adding components
title: Adding components
description: Adding custom components to your catalog
---

The **components** directory is where your custom components will be created and stored.

:::tip Upgrading your catalog?
    If you don't have a `components` directory, you will need to create one in the root of your catalog (e.g `/my-catalog/components`)
:::

## Types of components

EventCatalog supports [astro components](https://docs.astro.build/en/basics/astro-components/#_top) and markdown components. 

1. Astro components - Dynamic components **(recommended)**
    - Example `/my-catalog/components/my-component.astro`
1. Markdown components - Static markdown files 
    - Example `/my-catalog/components/my-component.mdx`    

## Astro components (.astro)

### Component structure

Astro components are split into two parts the script and the template.

``` title="/components/my-component.astro"
---
// Component Script (JavaScript)
---
<!-- Component Template (HTML + JS Expressions) -->
```

- **Component script**: Define variables, data, import components and make API requests [(read more)](https://docs.astro.build/en/basics/astro-components/#the-component-script)
- **Component template**: Determines the HTML output. Also supports style and script tags. [(read more)](https://docs.astro.build/en/basics/astro-components/#the-component-template)

#### Example

1. First define your component.

```md title="/components/my-component.astro"
---
# Import data from your eventcatalog.config.js file
import config from "@config"
# Access passed-in component props, like `<MyComponent title="Hello, World" />`
const { subtitle } = Astro.props;
---

<main>
    <span>This catalog belongs to the company:{config.organizationName}</span>
    <span>Data given to this component {subtitle}</span>
</main>

```

2. Import your component inside your domain, service or message.
```md title="/events/OrderAccepted/index.mdx"
---
id: OrderAccepted
name: Order Accepted
# ... other event data
---

<!-- Import the component into your page -->
import MyComponent from '@catalog/components/my-component.astro"

# Overview 

This event represents when an order has been accepted on our system.

<!-- Render the component and pass props into it -->
<MyComponent subtitle="This is a component" />

```

Read the full [astro guide here](https://docs.astro.build/en/basics/astro-components/#the-component-script).

### Define variables inside your resources

EventCatalog allows you to define variables inside your domains, services and messages that can be used to pass through to your custom components.

```md title="/events/OrderAccepted/index.mdx"
---
id: OrderAccepted
name: Order Accepted
# ... other event data
---

<!-- Define your custom variable to use on this page -->
export const MyCustomVariable = "Hello world";

<!-- Import the component into your page -->
import MyComponent from '@catalog/components/my-component.astro"

# Overview 

This event represents when an order has been accepted on our system.

<!-- Render the component and pass custom variable to it -->
<MyComponent subtitle={MyCustomVariable} />

```

### Reference frontmatter data in your components

If you want to reference your domain, service or message data, you can reference the frontmatter information.

```md title="/events/OrderAccepted/index.mdx"
---
id: OrderAccepted
name: Order Accepted
# ... other event data
---

<!-- Import the component into your page -->
import MyComponent from '@catalog/components/my-component.astro"

# Overview 

This event represents when an order has been accepted on our system.

<!-- Reference the name defined in your frontmatter -->
<MyComponent subtitle={frontmatter.name} />

```

### Reference eventcatalog.config.js data in your components

If you want to reference your eventcatalog.config.js data you can import it within your component.

```md title="/components/my-component.astro"
---
# Import data from your eventcatalog.config.js file
import config from "@config"
---

<main>
    <span>This catalog belongs to the company: {config.organizationName}</span>
    <span>This catalog title is: {config.title}</span>
</main>

```
