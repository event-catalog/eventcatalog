# User

A user definition for team members.

```
user <id> {
  name "<display name>"
  avatar "<url>"
  role "<role>"
  email "<email>"
  slack "<url>"
  ms-teams "<url>"
}
```

## Example

```
user dboyne {
  name "David Boyne"
  avatar "https://avatars.githubusercontent.com/u/3268013"
  role "Principal Engineer"
  email "david@company.com"
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
                  | "ms-teams" string_lit ;
```
