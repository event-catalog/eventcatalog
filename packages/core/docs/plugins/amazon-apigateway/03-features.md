---
sidebar_position: 1
keywords:
- components
sidebar_label: Features
title: Features
description: Features of AsyncAPI with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

### Customize the output directory

The plugin will output the OpenAPI specification to the directory you specify in the `output` property.

```js title="eventcatalog.config.js"  
output: 'amazon-api-gateway-output',
```

By default the plugin will output to `amazon-api-gateway-output` in the root of your project.

Remember to add the output directory to your `.gitignore` file so it's not checked into your repository.

### Map routes to messages in EventCatalog

The API Gateway plugin maps routes to messages in EventCatalog. You can map your routes to queries, commands or events.

To map routes you can use the `apis` property in the plugin configuration.

```js title="eventcatalog.config.js"  
generators: [
    [
      "@eventcatalog/generator-amazon-apigateway",
      {
        output: 'amazon-api-gateway-output',
        apis: [
          {
            // The name of the API we want to process
            name: 'EcommerceApi',
            // Assume it's deployed to us-east-1, change this if you deployed somewhere else
            region: 'us-east-1',
            // The API stage name
            stageName: 'prod',
            version: '2',
            // Optional routes, we can map routes to message types
            // give them descriptions and unique ids in eventcatalog
            routes: {
              'post /cart/checkout': {
                type: 'command',
                id: 'CheckoutCart',
                description: 'Request to checkout the cart',
              },
              'post /cart/clear': {
                type: 'command',
                id: 'ClearCart',
                description: 'Request to clear the cart',
              },
            }
          }
        ]
      },
    ],
  ],
```

In the example above we are mapping the `post /cart/checkout` and `post /cart/clear` routes to commands in EventCatalog. When we run the plugin new messages called `CheckoutCart` and `ClearCart` will be created in EventCatalog.

We can also specify the `id` and `description` for the message if we choose to override the default values. The values are taken from the operationId in the OpenAPI specification.



