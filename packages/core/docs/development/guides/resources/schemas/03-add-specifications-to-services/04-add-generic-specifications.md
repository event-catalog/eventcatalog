---
keywords:
- EventCatalog schemas
- WSDL
- XML Schema
- XSD
- generic specifications
sidebar_position: 4
sidebar_label: Other formats (XML, JSON, YAML)
title: Add other specifications (XML, JSON, YAML)
description: Attach any specification file, such as a WSDL, an XML Schema, or a JSON or YAML contract, to a service or domain
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="5.6.0" />

Not every API is described with OpenAPI, AsyncAPI or GraphQL. A SOAP service has a WSDL, a partner integration may share an XML Schema, and a team may keep its contract in its own JSON or YAML format.

Use `type: generic` to attach any of these files to a service or domain. EventCatalog adds a page for the file and lists it with your other specifications.

Generic specifications are shown as source code. EventCatalog doesn't parse them, so any file works. These files get syntax highlighting:

| Format | File extensions |
| ------ | --------------- |
| XML | `.xml`, `.xsd`, `.wsdl`, `.xsl`, `.xslt` |
| JSON | `.json` |
| YAML | `.yaml`, `.yml` |

Other files are shown as plain text.

## Add a generic specification

Put the file inside the service (or domain) folder.

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'CarrierAdapter',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'specs',
              type: 'folder',
              defaultOpen: true,
              children: [
                { name: 'carrier-shipping.wsdl', highlight: true },
                { name: 'shipment.xsd', highlight: true },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

Then reference the file in the frontmatter.

```md title="example: /services/CarrierAdapter/index.mdx"
---
specifications:
  - type: generic
    # Path to the file, relative to the service folder
    path: specs/carrier-shipping.wsdl
    # Friendly name for the specification (defaults to "Specification")
    name: Carrier Shipping API (WSDL)
  - type: generic
    path: specs/shipment.xsd
    name: Shipment XML Schema
---
```

Each generic specification gets a page at `/docs/services/{id}/{version}/generic/{filename}`, where `{filename}` is the file name without its extension. It is also listed:

- under **API & Contracts** in the sidebar
- in the badges on the service or domain page
- in the [Schema Explorer](/docs/development/guides/resources/schemas/explore-schemas/schema-explorer), where you can filter by the **Specs** type and by format (XML, JSON, YAML)
- in the node's menu in the visualiser

:::info
The page URL uses the file name without its extension, so give each specification on a resource its own file name (for example, don't use both `contract.json` and `contract.yaml`).
:::

## Use a custom icon

Generic specifications use a default specification icon. Use `icon` to set your own. It can be a path to a file in your catalog's `public` folder, or a URL.

```md title="example: /services/CarrierAdapter/index.mdx"
---
specifications:
  - type: generic
    path: specs/carrier-shipping.wsdl
    name: Carrier Shipping API (WSDL)
    # /public/icons/soap.svg in your catalog
    icon: /icons/soap.svg
---
```

The icon shows on the specification page, in the sidebar, on the resource page and in the Schema Explorer. `icon` only applies to generic specifications.

## Reference a file from a remote URL

You can also use a URL as the `path`. EventCatalog fetches the file when it builds your catalog, so the URL must be reachable from the build machine. Rebuild your catalog to show changes to the file.

```md title="example: /services/CarrierAdapter/index.mdx"
---
specifications:
  - type: generic
    path: https://raw.githubusercontent.com/acme/carrier-contracts/main/carrier-shipping.wsdl
    name: Carrier Shipping API (WSDL)
    # Optional: headers for private files. Only variables that start with EVENTCATALOG_ or EC_ are used.
    headers:
      Authorization: 'Bearer ${EC_GITHUB_TOKEN}'
---
```

Remote files are shown on their specification page. The Schema Explorer only lists files in your catalog.

## Add generic specifications to a domain

Domains support generic specifications in the same way. Put the file in the domain folder and add it to the domain's `specifications`.

```md title="example: /domains/Fulfilment/index.mdx"
---
specifications:
  - type: generic
    path: carrier-sla.yaml
    name: Carrier Service Levels
---
```
