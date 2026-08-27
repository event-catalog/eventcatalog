---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Ubiquitous language
title: Ubiquitous language
description: Creating a Ubiquitous-language dictionary for your domain
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Ubiquitous Language is a shared language that is used by all stakeholders in a project/domain to improve communication and reduce misunderstandings.

In EventCatalog you can define a dictionary of ubiquitous language terms for your domain, this can help your teams understand the language used in your domain and models used in your architecture.

## Using ubiquitous language in EventCatalog

To add a ubiquitous language dictionary, create a new file within your domain folder with the name `ubiquitous-language.mdx`.

- `/domains/{Domain Name}/ubiquitous-language.mdx`

The contents of the file should be a list of terms used in your domain. 

Each term should have a name, summary, description and icon. The icon is optional and can be used to visually represent the term. You can find a list of icons [here](https://lucide.dev/). Use the PascalCase React component name for Lucide icons, for example `file-text` should be configured as `FileText`.

```md title="/domains/Orders/ubiquitous-language.md"
---
dictionary:
  - id: Purchase Order
    name: Purchase Order
    summary: "A mystical document issued by a buyer to a seller, here indicating the types, quantities, and agreed prices for enchanted products or services."
    description: |
      A purchase order (PO) is a magical document that initiates the buying process between mystical entities. It protects both buyer and seller by clearly documenting the transaction details. Key components include:

      - Unique PO number for tracking
      - Detailed item specifications and quantities
      - Agreed prices and payment terms
      - Delivery requirements and timelines
      - Terms and conditions of the purchase

      POs are essential for budget control, audit trails, and inventory management. They help prevent unauthorized purchases and provide a clear record for accounting and reconciliation purposes.
    icon: FileText 
  - id: Order Line
    name: Order Line
    summary: "An individual enchanted item within a purchase order, representing a specific magical product or service being ordered."
    description: |
      Order lines are the fundamental building blocks of any purchase order. Each line represents a distinct item or service and contains critical information for order fulfillment:

      - Product identifier (SKU or part number)
      - Quantity ordered
      - Unit price and total line value
      - Special handling instructions
      - Required delivery date

      Order lines drive warehouse picking operations, shipping processes, and financial calculations. They are essential for tracking partial shipments and managing order modifications.
    icon: ListOrdered
---

```

### Viewing the ubiquitous language in EventCatalog

When you add a ubiquitous language dictionary to your domain, it will automatically appear in the sidebar of the domain.

![Example](../../img/domains/ubiquitous-lang-sidebar.png)
<a class="block" href="https://demo.eventcatalog.dev/docs/domains/Orders/language">View demo</a>

Clicking on a term in the Domain Language explorer will open that term in a new page. 



