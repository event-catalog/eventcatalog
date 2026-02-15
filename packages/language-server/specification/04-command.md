# Command

An instruction to perform an action.

```
command <id> {
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
command_decl     = "command" identifier "{" message_props "}" ;
```
