---
sidebar_position: 6
keywords:
- snippets
sidebar_label: Reusable snippets
title: Reusable snippets
description: Understanding how to use snippets with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.48.0" />

Keep your documentation consistent and maintainable with reusable snippets.

In EventCatalog, staying DRY (Don't Repeat Yourself) isn't just for code—it's for documentation too. If you're repeating the same content across multiple pages, consider using a snippet to centralize it. This makes your docs easier to manage and keeps everything in sync.

## Creating a Snippet

:::important
Snippets must live in the `/snippets` directory to be recognized by EventCatalog. Files in this folder won’t generate standalone pages—they’re designed to be imported wherever needed.
:::

## Basic Usage

1. Create your snippet

```md title="snippets/my-snippet.mdx"
Hello world! This is my content I want to reuse across pages. 
```

2. Import and use in any page:

```markdown title="/domains/my-domain/index.mdx"
---
id: E-Commerce
name: E-Commerce
version: 1.0.0
---

<!-- Import the snippet from the snippets directory -->
import MySnippet from '@eventcatalog/snippets/my-snippet.mdx';

<!-- Use the snippet anywhere on your page -->
<MySnippet />

```


## Passing Variables to Snippets

Snippets can accept props for dynamic content. Here's how:

1. Create a snippet with props:

```md title="snippets/my-snippet.mdx"
Hello {props.name}! This is my content I want to reuse across pages. 
```

2. Import and use with props:

```md title="/domains/my-domain/index.mdx"
---
id: E-Commerce
name: E-Commerce
version: 1.0.0
---

<!-- Import the snippet from the snippets directory -->
import MySnippet from '@eventcatalog/snippets/my-snippet.mdx';

<!-- Use the snippet with props -->
<MySnippet name="John" />

```

## Exporting Variables

You can also export constants or objects from a snippet for use elsewhere.

1. Export a variable from the snippet:

```md title="snippets/my-snippet.mdx"
export const platformName = 'EventCatalog';
export const colors = { primary: '#000000' };
```

2. Import the variable in your page:

```md title="/domains/my-domain/index.mdx"
---
id: E-Commerce
name: E-Commerce
version: 1.0.0
---

<!-- Import the snippet from the snippets directory -->
import { platformName, colors } from '/snippets/constants.mdx';

<!-- Use the variable -->
<p>Hello {platformName}!</p>
<p>The primary color is {colors.primary}.</p>

```

## JSX-Based Snippets

Need something more dynamic? Use a snippet as a JSX component:

```md title="snippets/my-snippet.mdx"
export default function MySnippet({ name }) {
  return <div>Hello {name}!</div>;
}
```

Then import and use it like this:

```md title="/domains/my-domain/index.mdx"
---
id: E-Commerce
name: E-Commerce
version: 1.0.0
---

<!-- Import the snippet from the snippets directory -->
import MySnippet from '@eventcatalog/snippets/my-snippet.mdx';

<!-- Use the snippet as a JSX component -->
<MySnippet name="John" />

```



