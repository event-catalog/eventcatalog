# Overview

The EventCatalog DSL (ECDSL) is a human-readable, declarative language for defining event-driven architectures. It compiles to EventCatalog's frontmatter/markdown format, enabling teams to define domains, services, messages, channels, and their relationships in a single coherent source.

```
domain Payment {
  version 1.0.0
  owner payment-team

  service PaymentService {
    version 1.0.0

    sends event PaymentProcessed {
      version 1.0.0
      summary "Emitted when a payment completes successfully"
    }

    receives command ProcessPayment
    receives event OrderCreated
  }
}
```

## Design Principles

1. **Readable** — Reads like English; minimal punctuation
2. **Hierarchical** — Nesting reflects domain ownership and relationships
3. **Concise** — Sane defaults; only specify what you need
4. **Complete** — Can express everything EventCatalog supports
5. **Composable** — Resources can be defined inline or referenced by ID

## Lexical Structure

### Comments

```
// Single-line comment

/* Multi-line
   comment */
```

### Strings

```
"double-quoted string"
```

Strings are required for values containing spaces, special characters, or multi-word text. Bare identifiers (no spaces, alphanumeric + hyphens + dots) can be unquoted. Strings follow JSON-style escaping (`\"`, `\\`, `\n`, etc.); raw `"` inside a string is not allowed.

### Identifiers

Identifiers are bare words used for resource IDs and type names. Keywords are reserved and cannot be used as identifiers.

```
OrderCreated          // simple
Payment.OrderCreated  // namespaced
my-service-name       // kebab-case
```

### Version Literals

Semantic versions are bare (unquoted):

```
version 1.0.0
version 2.1.0-beta.1
```

### Blocks

Curly braces delimit blocks. Properties inside blocks are newline-separated (no commas).

```
resource Foo {
  property value
  property "value with spaces"
}
```

### Property Multiplicity

The grammar allows any property to appear multiple times inside a block. The semantic rules are:

**Single-value properties** — if repeated, the last occurrence wins:

`version`, `name`, `summary`, `address`, `protocol`, `deprecated`, `draft`, `container-type`, `technology`, `authoritative`, `access-mode`, `classification`, `residency`, `retention`

`schema` is also single-value but only valid on messages (`event`, `command`, `query`, and inline message definitions).

**Repeatable properties** — each occurrence appends a value:

`owner`, `sends`, `receives`, `writes-to`, `reads-from`, `flow`, `service` (ref), `subdomain`, `data-product`, `route`, `input`, `output`, `member`, `parameter`

`parameter` names must be unique within a channel; duplicate names are an error.

Annotations are repeatable by default (see Metadata & Annotations).

Unknown properties are parse errors — only the properties listed in each resource's grammar are valid. Duplicate single-value properties are syntactically valid (last wins) but tooling may warn.
