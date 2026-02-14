# Service

A microservice or application.

```
service <id> {
  // Required
  version <semver>
  name "<display name>"

  // Optional metadata
  summary "<text>"
  owner <owner-ref>              // repeatable
  deprecated true
  draft true

  // Message relationships
  sends <message-type> <id>[@<version>] [to <channel-list>]
  receives <message-type> <id>[@<version>] [from <channel-list>]

  // Data relationships
  writes-to container <container-ref>      // repeatable
  reads-from container <container-ref>     // repeatable

  // Flow relationships
  flow <flow-ref>                // repeatable

  // Inline message definitions
  sends event <id> { ... }
  sends command <id> { ... }
  receives query <id> { ... }

  // Annotations
  @badge(...)
  @repository(...)
}
```

**Message types:** `event`, `command`, `query`

## EBNF

```ebnf
service_decl     = "service" identifier "{" common_props
                   { service_body_item } "}" ;
service_body_item= sends_stmt | receives_stmt
                 | writes_to_stmt | reads_from_stmt
                 | flow_ref_stmt
                 | annotation ;
```
