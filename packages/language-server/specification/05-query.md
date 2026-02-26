# Query

A request for information.

```
query <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>
  schema "<path>"
  deprecated true
  draft true

  channel <channel-ref>

  // Annotations (same as event)
  @badge(...)
  @repository(...)
  @api(method: "...", path: "...", statusCodes: "...")
}
```

## EBNF

```ebnf
query_decl       = "query" identifier "{" message_props "}" ;
```
