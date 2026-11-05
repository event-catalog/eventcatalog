---
sidebar_position: 8
keywords:
- ubiquitous language
- glossary
- AI
- LLM
sidebar_label: ubiquitous-language.txt
title: ubiquitous-language.txt
description: Give AI tools the ubiquitous language of your organization
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="5.9.0" />

Give AI tools one file with the ubiquitous language of your whole organization.

### What is ubiquitous-language.txt?

The file lists the terms of every domain and subdomain, with subdomains under their parent domain. It is generated from your [`ubiquitous-language.mdx`](/docs/development/guides/domains/ownership-and-language/adding-ubiquitous-language) files, so there is nothing to configure.

Terms are never merged, because a word can mean different things in different domains. Terms defined in more than one domain are listed together at the top of the file, with the meaning in each domain.

```txt
## Terms defined in more than one domain
- Reservation
  - Fulfilment: A temporary hold on stock for a specific order, taken during checkout.
  - Ordering: A temporary hold on stock for the items in a cart, taken during checkout.
```

Each term is one line with its summary (or its description, flattened to one line, when it has no summary). Each domain section links to that domain's `/docs/domains/{id}/language.mdx` for the full definitions.

### Access the file

 - `https://<your-catalog-url>/docs/llm/ubiquitous-language.txt`

The file is turned on and off with the `llmsTxt` setting, the same as [llms.txt](/docs/development/developer-tools/llms.txt). When it is disabled the file returns a 404. It is linked from the LLM access settings page, and from the Ubiquitous Language section of `llms.txt`.

### Use with the MCP server

The [EventCatalog MCP server](/docs/development/ask-your-architecture/mcp-server/getting-started#available-tools) exposes the same language through the `explainUbiquitousLanguageTerms` tool.
