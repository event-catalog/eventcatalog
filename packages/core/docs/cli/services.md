---
id: cli-services
title: Services
sidebar_label: Services
sidebar_position: 5
---

# Services CLI Commands

Manage services in your EventCatalog from the command line.

## getService

Returns a service from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the service to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest service
npx @eventcatalog/cli getService "OrderService"

# Get a specific version
npx @eventcatalog/cli getService "OrderService" "1.0.0"
```

---

## getServices

Returns all services from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?&#125; |

**Examples:**

```bash
# Get all services
npx @eventcatalog/cli getServices
```

---

## writeService

Writes a service to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| service | json | Yes | Service object with id, name, version, and markdown |
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## writeServiceToDomain

Writes a service to a specific domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| service | json | Yes | Service object |
| domain | json | Yes | Domain reference: &#123;id, version?&#125; |
| options | json | No | Options |



---

## rmService

Removes a service by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the service |

**Examples:**

```bash
# Remove a service
npx @eventcatalog/cli rmService "/OrderService"
```

---

## rmServiceById

Removes a service by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the service to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a service
npx @eventcatalog/cli rmServiceById "OrderService"
```

---

## versionService

Moves the current service to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the service to version |

**Examples:**

```bash
# Version a service
npx @eventcatalog/cli versionService "OrderService"
```

---

## addFileToService

Adds a file to a service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the service |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version |



---

## addEventToService

Adds an event relationship to a service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| serviceId | string | Yes | The ID of the service |
| direction | string | Yes | Direction: "sends" or "receives" |
| event | json | Yes | Event reference: &#123;id, version&#125; |
| serviceVersion | string | No | Specific service version |



---

## addCommandToService

Adds a command relationship to a service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| serviceId | string | Yes | The ID of the service |
| direction | string | Yes | Direction: "sends" or "receives" |
| command | json | Yes | Command reference: &#123;id, version&#125; |
| serviceVersion | string | No | Specific service version |



---

## addQueryToService

Adds a query relationship to a service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| serviceId | string | Yes | The ID of the service |
| direction | string | Yes | Direction: "sends" or "receives" |
| query | json | Yes | Query reference: &#123;id, version&#125; |
| serviceVersion | string | No | Specific service version |



---

## addEntityToService

Adds an entity to a service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| serviceId | string | Yes | The ID of the service |
| entity | json | Yes | Entity reference: &#123;id, version&#125; |
| serviceVersion | string | No | Specific service version |



---

## addDataStoreToService

Adds a data store relationship to a service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| serviceId | string | Yes | The ID of the service |
| relationship | string | Yes | Relationship: "writesTo" or "readsFrom" |
| dataStore | json | Yes | Data store reference: &#123;id, version&#125; |
| serviceVersion | string | No | Specific service version |



---

## serviceHasVersion

Checks if a specific version of a service exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the service |
| version | string | Yes | Version to check |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli serviceHasVersion "OrderService" "1.0.0"
```

---

## getSpecificationFilesForService

Returns specification files (OpenAPI, AsyncAPI) for a service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the service |
| version | string | No | Specific version |

**Examples:**

```bash
# Get spec files
npx @eventcatalog/cli getSpecificationFilesForService "OrderService"
```

---
