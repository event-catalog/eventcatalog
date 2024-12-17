## Generate a large catalog in the examples folder

This script will generate a large catalog in the examples folder.
This can be used to test the performance of EventCatalog, generators and builds.

Run the script
> node ./scripts/catalog-generator/generate-large-catalog.js

This will force the following steps

- Generating N unique Services asyncapi spec
- Generating eventcatalog.config.js containing all service configs
- Creating a new test purpose empty Catalog 
- Installing AsyncAPI generator
- Generating Catalog
- Building catalog