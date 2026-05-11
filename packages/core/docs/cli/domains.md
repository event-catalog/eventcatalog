---
id: cli-domains
title: Domains
sidebar_label: Domains
sidebar_position: 6
---

# Domains CLI Commands

Manage domains in your EventCatalog from the command line.

## getDomain

Returns a domain from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the domain to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest domain
npx @eventcatalog/cli getDomain "Orders"

# Get a specific version
npx @eventcatalog/cli getDomain "Orders" "1.0.0"
```

---

## getDomains

Returns all domains from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?&#125; |

**Examples:**

```bash
# Get all domains
npx @eventcatalog/cli getDomains
```

---

## writeDomain

Writes a domain to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domain | json | Yes | Domain object with id, name, version, and markdown |
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## rmDomain

Removes a domain by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the domain |

**Examples:**

```bash
# Remove a domain
npx @eventcatalog/cli rmDomain "/Orders"
```

---

## rmDomainById

Removes a domain by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the domain to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a domain
npx @eventcatalog/cli rmDomainById "Orders"
```

---

## versionDomain

Moves the current domain to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the domain to version |

**Examples:**

```bash
# Version a domain
npx @eventcatalog/cli versionDomain "Orders"
```

---

## addFileToDomain

Adds a file to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the domain |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version |



---

## addServiceToDomain

Adds a service to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| service | json | Yes | Service reference: &#123;id, version&#125; |
| domainVersion | string | No | Specific domain version |



---

## addSubDomainToDomain

Adds a subdomain to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the parent domain |
| subDomain | json | Yes | Subdomain reference: &#123;id, version&#125; |
| domainVersion | string | No | Specific domain version |



---

## addEntityToDomain

Adds an entity to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| entity | json | Yes | Entity reference: &#123;id, version&#125; |
| domainVersion | string | No | Specific domain version |



---

## addEventToDomain

Adds an event relationship to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| direction | string | Yes | Direction: "sends" or "receives" |
| event | json | Yes | Event reference: &#123;id, version&#125; |
| domainVersion | string | No | Specific domain version |



---

## addCommandToDomain

Adds a command relationship to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| direction | string | Yes | Direction: "sends" or "receives" |
| command | json | Yes | Command reference: &#123;id, version&#125; |
| domainVersion | string | No | Specific domain version |



---

## addQueryToDomain

Adds a query relationship to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| direction | string | Yes | Direction: "sends" or "receives" |
| query | json | Yes | Query reference: &#123;id, version&#125; |
| domainVersion | string | No | Specific domain version |



---

## addUbiquitousLanguageToDomain

Adds ubiquitous language definitions to a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| dictionary | json | Yes | Array of &#123;term, definition&#125; objects |
| domainVersion | string | No | Specific domain version |



---

## getUbiquitousLanguageFromDomain

Gets ubiquitous language definitions from a domain

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| domainId | string | Yes | The ID of the domain |
| domainVersion | string | No | Specific domain version |

**Examples:**

```bash
# Get ubiquitous language
npx @eventcatalog/cli getUbiquitousLanguageFromDomain "Orders"
```

---

## domainHasVersion

Checks if a specific version of a domain exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the domain |
| version | string | Yes | Version to check |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli domainHasVersion "Orders" "1.0.0"
```

---
