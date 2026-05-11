---
sidebar_position: 1
keywords:
- EventCatalog Assistant
sidebar_label: Configuration    
title: Configuration
description: Configure EventCatalog Assistant
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

**EventCatalog Assistant is turned off by default.**

To enable the assistant feature, you need to set the following:

1. Turn on the `chat` feature in your `eventcatalog.config.js` file and add 
2. Add a `eventcatalog.chat.js` file to your catalog.

### Enabling the feature

To turn on the assistant feature, you need to set the following:

```js title="eventcatalog.config.js"
module.exports = {
  // Enable the chat feature in your catalog
  chat: {
    enabled: true,
  },
  // AI integrations require you to run eventcatalog as as server
  output: 'server'
};
```

### Installing your model and configuring `eventcatalog.chat.js` file

First you have to install your model of choice ([list of models](https://ai-sdk.dev/docs/foundations/providers-and-models#ai-sdk-providers)) and configure the relevant secrets in your `.env` file.

_Example of installing the OpenAI model:_

```md
<!-- in the root of your project -->
npm install @ai-sdk/openai
```

#### Configuring `eventcatalog.chat.js`

This file will provide the model and any model configuration to EventCatalog.

In the example below we are using the OpenAI model `gpt-4.1-nano` and configuring the model with some additional parameters.

```js title="eventcatalog.chat.js"
import { openai } from '@ai-sdk/openai';

// Export your model using the default export
export default async () => {
    return openai('gpt-4.1-nano');
}

// Export the configuration for the model (optional)
export const configuration = {
    topP: 0.9,
    topK: 40,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    temperature: 0.7,
    maxTokens: 10000,
}
```

Once you have enabled the feature and configured your model, restart EventCatalog and you can start asking questions about your architecture.