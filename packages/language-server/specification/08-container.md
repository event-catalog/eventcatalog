# Container

A data store, cache, or external system.

```
container <id> {
  version <semver>
  name "<display name>"
  summary "<text>"
  owner <owner-ref>

  // Required
  container-type <database | cache | objectStore | searchIndex
                 | dataWarehouse | dataLake | externalSaaS | other>

  // Optional
  deprecated true
  draft true
  technology "<tech-string>"     // e.g., "postgres@15", "redis@7"
  authoritative true
  access-mode <read | write | readWrite | appendOnly>
  classification <public | internal | confidential | regulated>
  residency "<location>"
  retention "<duration>"         // e.g., "90d", "10y"

  // Relationships
  service <service-ref>          // repeatable

  // Annotations
  @badge(...)
  @repository(...)
}
```

## EBNF

```ebnf
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
```
