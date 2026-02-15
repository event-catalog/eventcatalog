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

  // Same annotations as event
}
```

## EBNF

```ebnf
query_decl       = "query" identifier "{" message_props "}" ;
```
