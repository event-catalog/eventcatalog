# User

A user definition for ownership and team membership.

```
user <id> {
  name "<display name>"
  avatar "<url>"
  role "<role>"
  email "<email>"
  slack "<url>"
  ms-teams "<url>"

  // Team membership
  team <team-id>

  // Ownership declarations
  owns domain <id>
  owns service <id>
  owns event <id>
  owns command <id>
  owns query <id>
}
```

## Example

```
user dboyne {
  name "David Boyne"
  avatar "https://avatars.githubusercontent.com/u/3268013"
  role "Principal Engineer"
  email "david@company.com"

  owns domain Payment
  owns service PaymentService
}
```

## EBNF

```ebnf
user_decl         = "user" identifier "{" user_props "}" ;
user_props        = "name" string_lit
                  | "avatar" string_lit
                  | "role" string_lit
                  | "email" string_lit
                  | "slack" string_lit
                  | "ms-teams" string_lit
                  | owns_stmt
                  | "team" identifier ;
owns_stmt         = "owns" resource_type_kw identifier ;
resource_type_kw  = "domain" | "service" | "event" | "command" | "query" ;
```
