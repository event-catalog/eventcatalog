# Full Grammar (EBNF)

```ebnf
(* Top-level *)
program          = { top_level_decl } ;
top_level_decl   = domain_decl | service_decl | event_decl | command_decl
                 | query_decl | channel_decl | container_decl
                 | data_product_decl | flow_decl
                 | user_decl | team_decl | visualizer_decl
                 | actor_decl | external_system_decl ;

(* Identifiers and literals *)
identifier       = letter { letter | digit | "-" | "." | "_" } ;
int              = digit { digit } ;
version_lit      = int "." int "." int [ "-" prerelease ] ;
string_lit       = '"' { any_char } '"' ;
bool_lit         = "true" | "false" ;
number_lit       = digit { digit } ;

(* Common properties *)
common_props     = { version_prop | name_prop | summary_prop | owner_prop
                   | deprecated_prop | draft_prop | annotation } ;
message_props    = { version_prop | name_prop | summary_prop | owner_prop
                   | schema_prop | deprecated_prop | draft_prop | annotation } ;
version_prop     = "version" version_lit ;
name_prop        = "name" string_lit ;
summary_prop     = "summary" string_lit ;
owner_prop       = "owner" identifier ;
schema_prop      = "schema" string_lit ;
deprecated_prop  = "deprecated" bool_lit ;
draft_prop       = "draft" bool_lit ;

(* Annotations *)
annotation       = "@" ann_name [ "(" ann_args ")" ] [ ann_block ] ;
ann_name         = identifier ;
ann_args         = ann_arg { "," ann_arg } ;
ann_arg          = [ identifier ":" ] ( string_lit | bool_lit | number_lit | identifier ) ;
ann_block        = "{" { ann_body_item } "}" ;

(* Resource references *)
resource_ref     = identifier [ "@" version_lit ] ;
message_type     = "event" | "command" | "query" ;

(* Domain *)
domain_decl      = "domain" identifier "{" common_props
                   { domain_body_item } "}" ;
domain_body_item = service_decl | subdomain_decl
                 | data_product_ref_stmt | flow_ref_stmt
                 | sends_stmt | receives_stmt
                 | annotation ;
subdomain_decl   = "subdomain" identifier "{" common_props
                   { domain_body_item } "}" ;

(* Service *)
service_decl     = "service" identifier "{" common_props
                   { service_body_item } "}" ;
service_body_item= sends_stmt | receives_stmt
                 | writes_to_stmt | reads_from_stmt
                 | flow_ref_stmt
                 | annotation ;

(* Sends / Receives *)
sends_stmt       = "sends" message_type resource_ref [ channel_clause ]
                 | "sends" message_type identifier inline_block ;
receives_stmt    = "receives" message_type resource_ref [ channel_clause ]
                 | "receives" message_type identifier inline_block ;

channel_clause   = to_clause | from_clause ;
to_clause        = "to" channel_ref_list ;
from_clause      = "from" channel_ref_list ;
channel_ref_list = channel_ref { "," channel_ref } ;
channel_ref      = identifier [ "@" version_lit ] ;

(* Data relationships *)
writes_to_stmt   = "writes-to" "container" resource_ref ;
reads_from_stmt  = "reads-from" "container" resource_ref ;
flow_ref_stmt    = "flow" resource_ref ;
data_product_ref_stmt      = "data-product" resource_ref ;

(* Inline message block *)
inline_block     = "{" message_props "}" ;

(* Messages: Event, Command, Query *)
event_decl       = "event" identifier "{" message_props "}" ;
command_decl     = "command" identifier "{" message_props "}" ;
query_decl       = "query" identifier "{" message_props "}" ;

(* Channel *)
channel_decl     = "channel" identifier "{" common_props
                   { channel_body_item } "}" ;
channel_body_item= address_prop | protocol_prop | parameter_decl
                 | route_stmt | annotation ;
address_prop     = "address" string_lit ;
protocol_prop    = "protocol" string_lit ;
parameter_decl   = "parameter" identifier "{" { param_prop } "}" ;
param_prop       = "description" string_lit
                 | "default" string_lit
                 | "enum" "[" string_lit { "," string_lit } "]"
                 | "examples" "[" string_lit { "," string_lit } "]" ;
route_stmt       = "route" resource_ref ;

(* Container *)
container_decl   = "container" identifier "{" common_props
                   { container_body_item } "}" ;
container_body_item = container_type_prop | technology_prop
                    | authoritative_prop | access_mode_prop
                    | classification_prop | residency_prop
                    | retention_prop
                    | service_ref_stmt | annotation ;
container_type_prop   = "container-type" container_type_enum ;
container_type_enum   = "database" | "cache" | "objectStore" | "searchIndex"
                      | "dataWarehouse" | "dataLake" | "externalSaaS" | "other" ;
technology_prop       = "technology" string_lit ;
authoritative_prop    = "authoritative" bool_lit ;
access_mode_prop      = "access-mode" ( "read" | "write" | "readWrite" | "appendOnly" ) ;
classification_prop   = "classification" ( "public" | "internal" | "confidential" | "regulated" ) ;
residency_prop        = "residency" string_lit ;
retention_prop        = "retention" string_lit ;

(* Data Product *)
data_product_decl = "data-product" identifier "{" common_props
                    { dp_body_item } "}" ;
dp_body_item      = input_stmt | output_stmt | annotation ;
input_stmt        = "input" message_type resource_ref ;
output_stmt       = "output" message_type resource_ref [ "{" contract_block "}" ] ;
contract_block    = "contract" "{" "path" string_lit "name" string_lit
                    [ "type" string_lit ] "}" ;

(* Flow *)
flow_decl         = "flow" identifier "{" common_props
                    { flow_entry_chain | flow_when_block } "}" ;
flow_entry_chain  = flow_ref { "," flow_ref } ( "->" flow_ref )+ ;
flow_when_block   = "when" flow_ref { "and" flow_ref } flow_action+ ;
flow_action       = flow_ref { flow_output } ;
flow_output       = "->" [ string_lit ":" ] flow_ref ;
flow_ref          = identifier [ string_lit ] ;

(* Actor *)
actor_decl        = "actor" identifier [ "{" { actor_body_item } "}" ] ;
actor_body_item   = name_prop | summary_prop | annotation ;

(* External System *)
external_system_decl = "external-system" identifier [ "{" { ext_sys_body_item } "}" ] ;
ext_sys_body_item    = name_prop | summary_prop | annotation ;

(* Visualizer *)
visualizer_decl   = "visualizer" identifier "{" { visualizer_body } "}" ;
visualizer_body   = name_prop | summary_prop | annotation
                  | legend_prop | search_prop | toolbar_prop
                  | focus_mode_prop | animated_prop | style_prop
                  | domain_decl | service_decl | event_decl | command_decl
                  | query_decl | channel_decl | container_decl
                  | data_product_decl | flow_decl
                  | actor_decl | external_system_decl
                  | service_ref_stmt | domain_ref_stmt
                  | event_ref_stmt | command_ref_stmt | query_ref_stmt
                  | channel_ref_stmt | data_product_ref_stmt | flow_ref_stmt
                  | container_ref_stmt ;
legend_prop       = "legend" bool_lit ;
search_prop       = "search" bool_lit ;
toolbar_prop      = "toolbar" bool_lit ;
focus_mode_prop   = "focus-mode" bool_lit ;
animated_prop     = "animated" bool_lit ;
style_prop        = "style" ( "default" | "post-it" ) ;

(* User *)
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

(* Team *)
team_decl         = "team" identifier "{" team_props "}" ;
team_props        = "name" string_lit
                  | "summary" string_lit
                  | "email" string_lit
                  | "slack" string_lit
                  | "ms-teams" string_lit
                  | "member" identifier
                  | owns_stmt ;

(* Resource references *)
service_ref_stmt    = "service" resource_ref ;
domain_ref_stmt     = "domain" resource_ref ;
event_ref_stmt      = "event" resource_ref ;
command_ref_stmt    = "command" resource_ref ;
query_ref_stmt      = "query" resource_ref ;
channel_ref_stmt    = "channel" resource_ref ;
container_ref_stmt  = "container" resource_ref ;
```

## Reserved Keywords

```
domain     service     event       command      query
channel    container   data-product flow
user       team        sends       receives
writes-to  reads-from  owns        to           from
version    name        summary     owner        schema
deprecated draft       true        false
type       actor       external-system
parameter  route       member
input      output      contract
subdomain  visualizer  legend      search       toolbar      focus-mode
animated   style       when        and
```

## File Extension

EventCatalog DSL files use the `.ec` extension:

```
catalog.ec
orders-domain.ec
payment-service.ec
```

Multiple `.ec` files can be used and are merged during compilation. Resources can reference each other across files.

## Compilation

The DSL compiles to EventCatalog's directory structure:

```
catalog.ec  -->  domains/Orders/index.mdx
                    domains/Orders/services/OrderService/index.mdx
                    events/OrderCreated/index.mdx
                    commands/ProcessPayment/index.mdx
                    channels/orders-topic/index.mdx
                    users/dboyne.mdx
                    teams/orders-team.mdx
                    ...
```

Each resource becomes a markdown file with YAML frontmatter matching EventCatalog's content collection schemas.
