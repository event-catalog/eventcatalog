# @eventcatalog/sdk

## 2.12.1

### Patch Changes

- aff77e3: feat: add diagrams collection support to SDK

## 2.12.0

### Minor Changes

- 53feaf4: Add CLI interface to execute SDK functions from the command line
- 0d86505: feat(sdk): added CLI interface for SDK

## 2.11.0

### Minor Changes

- 0859ebb: Add sends and receives support to domains, allowing domains to directly document event flows with addEventToDomain, addCommandToDomain, and addQueryToDomain functions

### Patch Changes

- 76482a4: feat(sdk): added data product support to sdk

## 2.10.0

### Minor Changes

- 2854c62: feat(sdk): added diagram types to base schema

## 2.9.11

### Patch Changes

- 2480c01: fix(sdk): removed jsdocs links to old documentation links

## 2.9.10

### Patch Changes

- e7bbb0a: fix(sdk): ensure directory when writing resources

## 2.9.9

### Patch Changes

- 083ec77: feat(core): writing resources allows path override

## 2.9.8

### Patch Changes

- 658d41c: feat(core): writing resources allows path override

## 2.9.7

### Patch Changes

- b4d25c4: fix(sdk): fixed path finding for windows when versioning resources

## 2.9.6

### Patch Changes

- bac2293: chore(core): updated packages

## 2.9.5

### Patch Changes

- a02abd9: chore(code): moving to npm OIDC

## 2.9.4

### Patch Changes

- 79cbb47: chore(code): moving to npm OIDC

## 2.9.3

### Patch Changes

- f208149: chore(sdk): testing release

## 2.9.2

### Patch Changes

- b6762c6: feat(sdk): added routes to channels

## 2.9.1

### Patch Changes

- 835d5f7: feat(sdk): added to and from for channels for services

## 2.9.0

### Minor Changes

- 1bf7167: fix(sdk): version checking now works with non semver versions

## 2.8.4

### Patch Changes

- ea6e8d4: feat(sdk): added new function to get folder name by resource

## 2.8.3

### Patch Changes

- dbf4816: feat(sdk): added ability to add datatore to service

## 2.8.2

### Patch Changes

- 765d008: feat(sdk): added support to write containers(data-stores) to eventcat…

## 2.8.1

### Patch Changes

- 4aa95df: feat(sdk): added support to write containers(data-stores) to eventcatalog

## 2.8.0

### Minor Changes

- 8c29fb2: fix(sdk): fixed nested versioning side effects

## 2.7.6

### Patch Changes

- 6c6fde8: feat(core): added support for graphql specs in EventCatalog

## 2.7.5

### Patch Changes

- fdf463d: feat(sdk): added attachment types to all supported resources

## 2.7.4

### Patch Changes

- 0bb05fc: chore(sdk): added detail panel types to resources

## 2.7.3

### Patch Changes

- 817998c: fix(sdk): fixed race condition with removing services and all its files

## 2.7.2

### Patch Changes

- 7417a02: fix(sdk): fixed race condition with removing services and all its files

## 2.7.1

### Patch Changes

- 7707aad: feat(sdk): added entity SDK

## 2.7.0

### Minor Changes

- 7e402f0: feat(sdk): added entity SDK

## 2.6.9

### Patch Changes

- 315ff4c: chore(sdk): added editUrl and draft properties on all resources

## 2.6.8

### Patch Changes

- 7a766aa: feat(sdk): added new functions to get producers/consumers by schema

## 2.6.7

### Patch Changes

- 42c9d85: feat(sdk): added new function to convert file to service

## 2.6.6

### Patch Changes

- c57d2f7: feat(sdk): added new function to convert file to service

## 2.6.5

### Patch Changes

- 5f64b2e: feat(sdk): added new functions to get owners of resources and service…

## 2.6.4

### Patch Changes

- a801c8a: Updates the string search split for forward or backward path separators
- 8515f90: fix(sdk): fixed issue with broken path seperators for windows/linux

## 2.6.3

### Patch Changes

- c4f661c: fix(sdk): getting producers and consumers for a message, now supports latestOnly flag

## 2.6.2

### Patch Changes

- 450d2b3: fix(sdk): fixed issue getting producers and consumers for messages

## 2.6.1

### Patch Changes

- 96bafa2: fix(sdk): getting messages by path now uses catalog directory

## 2.6.0

### Minor Changes

- cbe2e80: feat(sdk): added new functions for messages

## 2.5.5

### Patch Changes

- cb82968: fix(sdk): searching resources by id now escapes special characters

## 2.5.4

### Patch Changes

- 05f5156: fix(sdk): when dumping catalog resources are defaulted empty

## 2.5.3

### Patch Changes

- 6f6a38e: chore(sdk): now export eventcatalog type

## 2.5.2

### Patch Changes

- 13aee9d: fix(sdk): get domains no longer returns entities

## 2.5.1

### Patch Changes

- a0dc38c: feat(sdk): added new function to get eventcatalog config file

## 2.5.0

### Minor Changes

- ec3bebb: chore(sdk): export types

## 2.4.0

### Minor Changes

- 099fcd8: feat(sdk): added ability to fetch schemas

## 2.3.7

### Patch Changes

- d977d24: feat(sdk): added util function to get a path to a resource

## 2.3.6

### Patch Changes

- f1ad57f: chore(sdk): sdk now formats JSON files before writing them

## 2.3.5

### Patch Changes

- 90c6897: chore(sdk): sdk now formats JSON files before writing them

## 2.3.4

### Patch Changes

- 5427184: feat(sdk): when adding services to domains you can override the service

## 2.3.3

### Patch Changes

- c99feda: feat(sdk): added override flag for writing messages to services

## 2.3.2

### Patch Changes

- 86cd6c4: feat(sdk): added missing docs for addSubDomainToDomain

## 2.3.1

### Patch Changes

- cd4cfdd: feat(sdk): introduced subdomain sdk functions

## 2.3.0

### Minor Changes

- aef0e28: chore(sdk): fix(sdk): fix SDK on windows, also added window tests

## 2.2.10

### Patch Changes

- d2bc29c: feat(sdk): added backwards compatibility for md files

## 2.2.9

### Patch Changes

- 574b95e: feat(sdk): added backwards compatibility for md files

## 2.2.8

### Patch Changes

- 57a4f19: feat(sdk): added backwards compatibility for md files

## 2.2.7

### Patch Changes

- 43d9243: fix(sdk): fixed small bug when getting resources could return resources it should not

## 2.2.6

### Patch Changes

- e2f7a36: feat(sdk): deprecation field now supports booleans

## 2.2.5

### Patch Changes

- eed1aa7: feat(sdk): added support for deprecated fields

## 2.2.4

### Patch Changes

- b5ad42d: chore(sdk): updated types for new styles on resources

## 2.2.3

### Patch Changes

- 03539b9: fix(sdk): eventcatalog version ignored if not found on dump

## 2.2.2

### Patch Changes

- 66dbc09: fix(sdk): new build

## 2.2.1

### Patch Changes

- dac1e6e: fix(sdk): teams and users now use mdx file formats

## 2.2.0

### Minor Changes

- 8ea729b: fix(core): fixed problem adding messages to services when in domains

### Patch Changes

- 16d5c4b: fix(sdk): Allow nullable version for xxxHasVersion methods

## 2.1.2

### Patch Changes

- 869968b: feat(core): added ability to get ubiquitous lang from domain

## 2.1.1

### Patch Changes

- b9b32d6: feat(core): added custom docs sdk support

## 2.1.0

### Minor Changes

- 8412445: feat(core): added custom docs sdk support

## 2.0.1

### Patch Changes

- fd0327a: feat(sdk): added ability to add sidebar badges

## 2.0.0

### Major Changes

- d3c428a: chore(sdk): moving to mdx files

## 1.4.9

### Patch Changes

- dbd4fd4: fix(sdk): getDomains no longer returns flows

## 1.4.8

### Patch Changes

- a443869: chore(fix): fixed async issues when writing services

## 1.4.7

### Patch Changes

- 24f7848: chore(fix): fixed async issues when writing services (trying lock files)

## 1.4.6

### Patch Changes

- 5494a42: chore(fix): fixed async issues when writing files

## 1.4.5

### Patch Changes

- ae82880: chore(fix): fixed async issues when writing services

## 1.4.4

### Patch Changes

- 212023e: fix(sdk): fixed issue with persisting files between versioning for do…

## 1.4.3

### Patch Changes

- d9b7d03: chore(sdk): added repoistory on base schema for resources

## 1.4.2

### Patch Changes

- e125e38: fix(sdk): removing resources now deletes file within that resource

## 1.4.1

### Patch Changes

- 7ce9ae2: fix(sdk): issue getting resources in nested folder structures

## 1.4.0

### Minor Changes

- 30822e8: feat(sdk): adding team and user sdk functions

## 1.3.2

### Patch Changes

- 8f30457: feat(sdk): added ability to override resources whilst trying to versi…

## 1.3.1

### Patch Changes

- c71efa6: fix(plugin): fixed issue when writing messages to services and folder…

## 1.3.0

### Minor Changes

- 82e0b55: feat(sdk): added functions to get all resources in the catalog

## 1.2.3

### Patch Changes

- 3cfb549: feat(sdk): added ability to version existing content when writing resources

## 1.2.2

### Patch Changes

- 8dbc1ff: feat(sdk): added ability to override content when writing to catalog

## 1.2.1

### Patch Changes

- 71d200d: chore(docs): add channel sdk to docs

## 1.2.0

### Minor Changes

- a3cb474: feat(sdk): added channel support to sdk

## 1.1.4

### Patch Changes

- 5e6a691: chore(sdk): added better logging for write failures

## 1.1.3

### Patch Changes

- 0882286: fix(sdk): services are now unique when writing domains

## 1.1.2

### Patch Changes

- d996a58: feat(sdk): added writeVersionedService function that writes a service to the versioned directory

## 1.1.1

### Patch Changes

- ac00967: fix(sdk): added docs for query SDK

## 1.1.0

### Minor Changes

- 95e9d70: feat(sdk): adding query sdk functions

## 1.0.0

### Major Changes

- 7abb3d8: feat(sdk): added support for folder structures

## 0.1.4

### Patch Changes

- b9d2073: feat(sdk): writing messages to services are now unique
- 6a76b8d: feat(sdk): writing messages to services are now unique

## 0.1.3

### Patch Changes

- 287912f: chore(sdk): changed the return type for getting specs for a service

## 0.1.2

### Patch Changes

- 6d125ca: feat(sdk) added ability to get specification files for a service by it's id
- fe4c480: fix(sdk) fixed regex to handle large names for service ids

## 0.1.1

### Patch Changes

- c8b9d31: fix(sdk): fixed types for specifications on the service type

## 0.1.0

### Minor Changes

- 7291e10: Adding the specification attribute to the service type letting to integrate asyncapi, openapi and other specifications in the future

## 0.0.12

### Patch Changes

- 24ac499: feat(sdk): added ability to add services to domains

## 0.0.11

### Patch Changes

- 177093c: feat(sdk): added methods to check if versions exist or not

## 0.0.10

### Patch Changes

- 9129a08: feat(sdk): added support for semver matching when getting resources f…

## 0.0.9

### Patch Changes

- 104ca2a: feat(sdk): added specific function to register an event or command to a service

## 0.0.8

### Patch Changes

- 615d665: fix(sdk): fixed issue when getting resources by id and version

## 0.0.7

### Patch Changes

- dd2f78e: feat(sdk): added domains to sdk

## 0.0.6

### Patch Changes

- e925200: feat(sdk): added commands to sdk

## 0.0.5

### Patch Changes

- e060c21: chore(sdk): refactored code to new resource internal lib

## 0.0.4

### Patch Changes

- fcd03f6: feat(sdk): added support for services

## 0.0.3

### Patch Changes

- e41c8af: docs(sdk): adding docs to events

## 0.0.2

### Patch Changes

- 323eb10: fix(sdk): fixing build on github
