---
sidebar_position: 6
keywords:
  - EventCatalog data products
sidebar_label: Adding to domains
title: Adding to domains
description: Organize data products within domains
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.8.0" />

Data products can be placed anywhere in your catalog, but we recommend organizing them within domain folders for better clarity and ownership.

## Adding data products to domains

You can create data products in any directory structure you prefer. We recommend placing them in your domain folder:

```
/domains
  /E-Commerce
    index.mdx
    /data-products
      /OrderAnalytics
        index.mdx
      /PaymentAnalytics
        index.mdx
```

Then reference them in your domain's frontmatter:

```md title="/domains/E-Commerce/index.mdx"
---
id: e-commerce
name: E-Commerce
version: 1.0.0

data-products:
  - id: order-analytics
  - id: payment-analytics
    # version is optional for all data products
    version: 1.0.0
---
```

This associates the data products with your domain and displays them on the domain page.

## Next steps

- [Domain documentation](/docs/development/guides/domains/introduction)
- [Data product API reference](/docs/api/data-product-api)
