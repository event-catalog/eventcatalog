# Event

A domain event — something that happened.

```
event <id> {
  // Required
  version <semver>
  name "<display name>"

  // Optional metadata
  summary "<text>"
  owner <owner-ref>
  schema "<path>"
  deprecated true
  draft true

  // Annotations
  @badge(...)
  @repository(...)
  @api(method: "...", path: "...", statusCodes: "...")
}
```

## EBNF

```ebnf
event_decl       = "event" identifier "{" message_props "}" ;
```
