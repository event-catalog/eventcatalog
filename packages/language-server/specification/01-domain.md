# Domain

Top-level bounded context. Can contain services, subdomains, data products, and flows.

```
domain <id> {
  // Required
  version <semver>
  name "<display name>"          // optional, defaults to id

  // Optional metadata
  summary "<text>"
  owner <owner-ref>              // repeatable
  deprecated true
  draft true

  // Relationships
  service <service-ref>          // repeatable (reference to external service)
  subdomain <domain-ref>         // repeatable
  data-product <dp-ref>          // repeatable
  flow <flow-ref>                // repeatable

  // Domain-level message routing
  sends <message-type> <id> [to <channel-ref>]
  receives <message-type> <id> [from <channel-ref>]

  // Inline definitions
  service <id> { ... }
  subdomain <id> { ... }

  // Annotations (see Metadata section)
  @badge(...)
  @repository(...)
}
```

## Subdomains

Domains can contain nested subdomains:

```
domain Logistics {
  version 1.0.0

  subdomain Shipping {
    version 1.0.0
    summary "Package shipping and tracking"

    service ShippingService {
      version 1.0.0
      receives event OrderCreated
      sends event ShipmentCreated
    }
  }

  subdomain Returns {
    version 1.0.0
    summary "Return merchandise authorization"

    service ReturnsService {
      version 1.0.0
      receives command InitiateReturn
      sends event ReturnApproved
    }
  }
}
```

## EBNF

```ebnf
domain_decl      = "domain" identifier "{" common_props
                   { domain_body_item } "}" ;
domain_body_item = service_decl | subdomain_decl | service_ref_stmt
                 | data_product_ref_stmt | flow_ref_stmt
                 | sends_stmt | receives_stmt
                 | annotation ;
subdomain_decl   = "subdomain" identifier "{" common_props
                   { domain_body_item } "}" ;
```
