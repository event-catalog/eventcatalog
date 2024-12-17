## Big catalog 

Generating a big catalog for local testing and mesuring the performance

Run the script
> node ./scripts/big-system/generator.js

This will force the following steps

- Generating N unique Services asyncapi spec
- Generating eventcatalog.config.js containing all service configs
- Creating a new test purpose empty Catalog 
- Installing asycnapi generator
- Generating Catalog
- Building catalog

## Tests and Observations

- During Testing the latancy related to generator was not take in account, But the generator is sequential and takes a lot of time.

- The build of Static routing takes a lot of time
- build concurrency doesn not seem as an optimizer for small ctalaog

- to test concurrency for large catalogs