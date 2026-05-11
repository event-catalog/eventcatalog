---
id: cli-data-products
title: Data Products
sidebar_label: Data Products
sidebar_position: 13
---

# Data Products CLI Commands

Manage data products in your EventCatalog from the command line.

## getDataProduct

Returns a data product from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data product to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest data product
npx @eventcatalog/cli getDataProduct "customer-360"

# Get a specific version
npx @eventcatalog/cli getDataProduct "customer-360" "1.0.0"
```

---

## getDataProducts

Returns all data products from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?&#125; |

**Examples:**

```bash
# Get all data products
npx @eventcatalog/cli getDataProducts
```

---

## writeDataProduct

Writes a data product to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## writeDataProductToDomain

Writes a data product to a specific domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| dataProduct | json | Yes | Data product object |
| domain | json | Yes | Domain reference: &#123;id, version?&#125; |
| options | json | No | Options |



---

## rmDataProduct

Removes a data product by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the data product |

**Examples:**

```bash
# Remove a data product
npx @eventcatalog/cli rmDataProduct "/customer-360"
```

---

## rmDataProductById

Removes a data product by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data product to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a data product
npx @eventcatalog/cli rmDataProductById "customer-360"
```

---

## versionDataProduct

Moves the current data product to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data product to version |

**Examples:**

```bash
# Version a data product
npx @eventcatalog/cli versionDataProduct "customer-360"
```

---

## addFileToDataProduct

Adds a file to a data product

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data product |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version |



---

## addDataProductToDomain

Adds a data product reference to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| dataProduct | json | Yes | Data product reference: &#123;id, version&#125; |
| domainVersion | string | No | Specific domain version |



---

## dataProductHasVersion

Checks if a specific version of a data product exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data product |
| version | string | Yes | Version to check |



---
