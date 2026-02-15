# Data Product

An analytical data product.

```
data-product <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>
  deprecated true
  draft true

  // Data lineage
  input <message-type> <resource-ref>      // repeatable
  output <message-type> <resource-ref> {   // repeatable, with optional contract
    contract {
      path "<path>"
      name "<name>"
      type "<type>"
    }
  }

  // Annotations
  @badge(...)
}
```

## EBNF

```ebnf
data_product_decl = "data-product" identifier "{" common_props
                    { dp_body_item } "}" ;
dp_body_item      = input_stmt | output_stmt | annotation ;
input_stmt        = "input" message_type resource_ref ;
output_stmt       = "output" message_type resource_ref [ "{" contract_block "}" ] ;
contract_block    = "contract" "{" "path" string_lit "name" string_lit
                    [ "type" string_lit ] "}" ;
```
