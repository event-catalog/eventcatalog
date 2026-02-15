# Team

A team definition for ownership and membership.

```
team <id> {
  name "<display name>"
  summary "<text>"
  email "<email>"
  slack "<url>"
  ms-teams "<url>"

  // Members
  member <user-id>               // repeatable

  // Ownership declarations
  owns domain <id>
  owns service <id>
  owns event <id>
  owns command <id>
  owns query <id>
}
```

## Owner References

Owners are referenced by team or user ID:

```
service OrderService {
  version 1.0.0
  owner payment-team              // team reference
  owner dboyne                   // user reference
}
```

## Example

```
team orders-team {
  name "Orders Team"
  summary "Responsible for order lifecycle"
  email "orders@company.com"
  slack "https://company.slack.com/channels/orders"

  member dboyne
  member jane-doe
}
```

## EBNF

```ebnf
team_decl         = "team" identifier "{" team_props "}" ;
team_props        = "name" string_lit
                  | "summary" string_lit
                  | "email" string_lit
                  | "slack" string_lit
                  | "ms-teams" string_lit
                  | "member" identifier
                  | owns_stmt ;
```
