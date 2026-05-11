---
sidebar_position: 3
keywords:
- mermaid
sidebar_label: llms.txt
title: LLMS.txt
description: Understanding how to use LLMS.txt with EventCatalog and your LLMs
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.20.0" />

Enable tools like Claude, ChatGPT, GitHub Copilot, and Cursor to quickly understand your EventCatalog.

### What is LLMS.txt?

[LLMS.txt](https://llmstxt.org/) is a proposed standard that helps AI-powered development tools better understand and interact with your documentation. Similar to how robots.txt guides web crawlers, LLMS.txt provides structured information that makes it easier for AI assistants like Claude, ChatGPT, and GitHub Copilot to process your EventCatalog documentation.

The file is automatically generated and maintained as part of your documentation pipeline, requiring no manual configuration. It organizes your documentation's key concepts, structures, and relationships in a format optimized for machine reading.

### llms.txt and llms-full.txt

The `llms.txt` file includes your EventCatalog resources in a simple format. Lists your resources with a summary for each of them.

The `llms-full.txt` file includes your EventCatalog resources in a more detailed format. All the contents of your Catalog resources are included in the file.

### Enable in EventCatalog

**`llms.txt` is enabled by default in EventCatalog.**

You can disable it by turning it off in your `eventcatalog.config.js` file.

```js title="eventcatalog.config.js"
llmsTxt: {
    enabled: false,
},
```

Once you enable llms.txt you can query both the urls:
 - `https://<your-catalog-url>/docs/llm/llms.txt`
    - Demo: https://demo.eventcatalog.dev/docs/llm/llms.txt
 - `https://<your-catalog-url>/docs/llm/llms-full.txt`
    - Demo: https://demo.eventcatalog.dev/docs/llm/llms-full.txt

### How to use LLMS.txt?

Once you deploy your EventCatalog you can use your tools to ask questions about your Catalog.

![LLMS.txt](./img/ai-example.png)





