# Versioning

## Declaring Versions

Every versioned resource requires a version:

```
event OrderCreated {
  version 1.0.0
}
```

## Referencing Versions

```
// Latest (default - no version specified)
receives event OrderCreated

// Specific version using @ syntax
receives event OrderCreated@2.0.0

// Channel with version
sends event OrderProcessed to payments-channel@1.0.0

// Multiple channels with versions
receives event PaymentFailed from channel-a@1.0.0, channel-b@2.1.0
```

## Version Defaults

When no version is specified in a reference, it resolves to `latest`.

## EBNF

```ebnf
int              = digit { digit } ;
version_lit      = int "." int "." int [ "-" prerelease ] ;
version_prop     = "version" version_lit ;
version_ref      = "@" version_lit ;
resource_ref     = identifier [ version_ref ] ;
```
