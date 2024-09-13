# @eventcatalog/core

## 2.7.8

### Patch Changes

- c67052f: fix(core): fixed generate command

## 2.7.7

### Patch Changes

- f699aed: feat(core): added utils to read and write catalog files

## 2.7.6

### Patch Changes

- bb7333d: feat(core): added protobuf support for auto diffs

## 2.7.5

### Patch Changes

- fde6544: chore(core): updated astro versions

## 2.7.4

### Patch Changes

- 0189ebb: fix(core): ignore trailing slash for icons

## 2.7.3

### Patch Changes

- 1c56b8d: feat(core): added automatic diffs for changelogs for json, yml and avro files

## 2.7.2

### Patch Changes

- ac64dc4: fix(core): only generate discover page for each collection

## 2.7.1

### Patch Changes

- 29ccffc: fix(core): fixed changelogs path matching

## 2.7.0

### Minor Changes

- 515b01f: feat(core): added ability to full screen visuals, new icons for messages and new landing page

## 2.6.4

### Patch Changes

- 0459eec: chore(core): fixed styled for openapi pages

## 2.6.3

### Patch Changes

- d35846b: chore(core): refactored the way pages are rendered reducing code

## 2.6.2

### Patch Changes

- 498f58c: fix(core): generate command now removes any tmp files required for ge…

## 2.6.1

### Patch Changes

- 4aecf6a: fix(core): fixed broken images for specifications on the service page

## 2.6.0

### Minor Changes

- 76bebd7: feat(core): added AsyncAPI pages and new specifications frontmatter api. Deprecated the AsyncAPI and OpenAPI MDX components

## 2.5.5

### Patch Changes

- 2b84b47: fix(core): moved node graphs to only load on client fixing the invalid hook call warning

## 2.5.4

### Patch Changes

- b6052d9: fix(core): added client side url builder

## 2.5.3

### Patch Changes

- a7f1bd0: fix(core): fixed generate script for plugins

## 2.5.2

### Patch Changes

- deacd55: fix(core): can now add producers/consumers without required version number or latest or undefined
- 2d8ef10: fix(core): homepage redirect status code from permanent to temporary

## 2.5.1

### Patch Changes

- 2bbccf8: feat(core): added new MDX component for Flows

## 2.5.0

### Minor Changes

- 067fd89: feat(core): added flows to eventcatalog
- c336807: feat(core): only latest versions are now shown in visualizer
- 20c2cba: fix(core): fixing search not working after builds
- 7476fa6: fix(core): nodegraphs for domains now work with semver versions
- 737380a: feat(core): added ability to see how many domains a team and users own
- a1490d3: chore(core): updated astro versions
  feat(core): visuzlier arrows stroke width increased
- 58d6a2d: chore(core): fixing default for flows

## 2.4.0

### Minor Changes

- 3a4b8ec: feat(c0re): add semantic version support, referencing services or messages can now be done with semver

## 2.3.4

### Patch Changes

- a99057e: feat(core): added ability to drag nodes in visualizer

## 2.3.3

### Patch Changes

- dad4df7: fix(core): visualiser now truncates labels on sidebar

## 2.3.2

### Patch Changes

- 90c9219: feat(core): added page redirect to latest version when going to /{resource/{id}

## 2.3.1

### Patch Changes

- 0de35d9: fix(core): vitest no longer added to the npm package

## 2.3.0

### Minor Changes

- d662cb1: feat(core): added custom component support for eventcatalog

## 2.2.7

### Patch Changes

- d7148fa: chore(core): fixed long labels on the documentation sidebar

## 2.2.6

### Patch Changes

- 50a43e0: core(fix): removed forward slash before # to prevent double trailing slash
- 8104078: chore(core): added windows tests and fixed watcher to work with changelogs files on windows

## 2.2.5

### Patch Changes

- edd58a6: fix(core): enforce the leading slash to the logo
- 269aef9: fix(core): fixed url paths for EC assets

## 2.2.4

### Patch Changes

- 34fa215: fix(core): now word wrapping code blocks by default in markdown files so not to break the layout of the page

## 2.2.3

### Patch Changes

- ea7302b: fix(core): fixed changelog urls on resource pages

## 2.2.2

### Patch Changes

- 5ec8513: chore(core): added new footer component to tidy up code
- 7a0e839: fix(core): added defaults for no pages in catalog

## 2.2.1

### Patch Changes

- abac0a7: fix(core): fixed urls on changelogs

## 2.2.0

### Minor Changes

- 9b92648: feat(core): added changelog support for domains, services and messages

## 2.1.0

### Minor Changes

- 35fa4a3: feat(core): added ability to customize the landing page

## 2.0.31

### Patch Changes

- c4f6f40: fix(core): discover table width now fixed on long summarys

## 2.0.30

### Patch Changes

- 32f93a9: fix(core): running eventcatalog on windows (cross-compatibility between operational systems)
- 956dd32: fix(core): updated service list to render with with name rather than id
- 6580ff2: fix(core): fixed missing base in redirect target

## 2.0.29

### Patch Changes

- 83d76b7: fix(core): fixed the json schema viewer require issues

## 2.0.28

### Patch Changes

- 0bad036: feat(core): added beta version of generators

## 2.0.27

### Patch Changes

- c6da224: feat(core): added ability to configure landing page

## 2.0.26

### Patch Changes

- 3dc05d8: fix(core): fixed search, now set output path on build

## 2.0.25

### Patch Changes

- 109ce19: feat(core): added optimize flag to make eventcatalog work with large catalogs

## 2.0.24

### Patch Changes

- db66733: fix(core): favicon having invalid url with default base url configuration
- 26a4a37: fix perf issues for discover pages in build step
- f29d718: fix(core): sidebar configuration for section visibility is now optional
- 3426ea8: fix(core): temp fix for domains for users

## 2.0.23

### Patch Changes

- 66a764c: fix(core: fixed additional ts errors)

## 2.0.22

### Patch Changes

- 58a02a1: chore(core): removed console logs

## 2.0.21

### Patch Changes

- 22e4b6d: fix(core): fixed issues with styling

## 2.0.20

### Patch Changes

- 5de772b: fix(core): fixed typescript errors

## 2.0.19

### Patch Changes

- 4be2512: feat(core): added ability to configure port on EventCatlog

## 2.0.18

### Patch Changes

- 209e428: fix(core): fixed domain nav bar in discovery page

## 2.0.17

### Patch Changes

- 6337769: feat(core): added ability to customise header text and logo

## 2.0.16

### Patch Changes

- cae7c0a: fix(core): added missing urls for slash support

## 2.0.15

### Patch Changes

- 73a40b4: fix(core): added support for trailingSlash in the EventCatalog types.

## 2.0.14

### Patch Changes

- 9d61581: feat(core): added support for base url and slashes

## 2.0.13

### Patch Changes

- 1e4c805: feat(core): Adding <SchemaViewer /> component

## 2.0.12

### Patch Changes

- 18f1c3d: fix(core): fixed start and preview commands

## 2.0.11

### Patch Changes

- 45ea9f6: feat(core): added types file for eventcatalog.config.js

## 2.0.10

### Patch Changes

- 62422dd: fix to build
- 1c42b9f: feat(core): added ability to hide resources in sidebar

## 2.0.9

### Patch Changes

- d4916a0: fix(core): configure width for nodes in visualiser (#560)

## 2.0.8

### Patch Changes

- 5bde1d4: feat(core): versions now show as a dropdown

## 2.0.7

### Patch Changes

- b82d79e: feat(core): Renders names for services side bars and also links to services from domains fixed

## 2.0.6

### Patch Changes

- c098f12: fix(core): hydrate content before building

## 2.0.5

### Patch Changes

- 4410826: feat(core): adding preview and start commands to eventcatalog

## 2.0.4

### Patch Changes

- 00def6d: bug(core): now loads /docs when going to /

## 2.0.3

### Patch Changes

- dc89208: fix(core): core folder now copied on buld

## 2.0.2

### Patch Changes

- a4bfa8b: chore(core): update the project url to the github org

## 2.0.1

### Patch Changes

- 20aa425: chore(misc): Testing the release of EventCatalog

## 2.0.0

New version launched of EventCatalog with major changes.

## 1.2.7

### Patch Changes

- [`65aa33d`](https://github.com/boyney123/eventcatalog/commit/65aa33d618b9f415768554bb85a926c1f1913698) [#510](https://github.com/boyney123/eventcatalog/pull/510) Thanks [@boyney123](https://github.com/boyney123)! - Update mermaid version to latest

## 1.2.6

### Patch Changes

- [`1fce9a2`](https://github.com/boyney123/eventcatalog/commit/1fce9a298ff1820056fcbc4dc75cfd6f18535f60) [#499](https://github.com/boyney123/eventcatalog/pull/499) Thanks [@marciovmartins](https://github.com/marciovmartins)! - feat: add search via query parameter for events, services and domains (#498)

## 1.2.5

### Patch Changes

- [`56b9f0d`](https://github.com/boyney123/eventcatalog/commit/56b9f0daefde6cba75b68c4a5a33742376b540dd) [#485](https://github.com/boyney123/eventcatalog/pull/485) Thanks [@dreglad](https://github.com/dreglad)! - fix: (#484) ensure link exists before opening link in visualizer

- [`56b9f0d`](https://github.com/boyney123/eventcatalog/commit/56b9f0daefde6cba75b68c4a5a33742376b540dd) [#485](https://github.com/boyney123/eventcatalog/pull/485) Thanks [@dreglad](https://github.com/dreglad)! - fix: (#484) ensure link exists before opening link in visualizer.

## 1.2.4

### Patch Changes

- [`821a1a7`](https://github.com/boyney123/eventcatalog/commit/821a1a7553dbfebb6793923d1e49a81fee27826d) [#482](https://github.com/boyney123/eventcatalog/pull/482) Thanks [@WaYdotNET](https://github.com/WaYdotNET)! - fix: visualization of asyncapi: 3.0.0 file

## 1.2.3

### Patch Changes

- [`c2faad3`](https://github.com/boyney123/eventcatalog/commit/c2faad32c756589f4e11e82b7a5b659257e6b98b) [#480](https://github.com/boyney123/eventcatalog/pull/480) Thanks [@boyney123](https://github.com/boyney123)! - fix: bug when copy styles over

## 1.2.2

### Patch Changes

- [`e8846cb`](https://github.com/boyney123/eventcatalog/commit/e8846cb66620581e6cc33a0c8d36ddac912c78b9) [#477](https://github.com/boyney123/eventcatalog/pull/477) Thanks [@boyney123](https://github.com/boyney123)! - feat - fixing copy over

## 1.2.1

### Patch Changes

- [`65a46b1`](https://github.com/boyney123/eventcatalog/commit/65a46b1ecea14837f9cbfa5e66ba3b369f36646a) [#475](https://github.com/boyney123/eventcatalog/pull/475) Thanks [@boyney123](https://github.com/boyney123)! - feat - copy over styles on dev and build

## 1.2.0

### Minor Changes

- [`59fc853`](https://github.com/boyney123/eventcatalog/commit/59fc853878b1e3c5413f7c6fd5bf982b30165693) [#473](https://github.com/boyney123/eventcatalog/pull/473) Thanks [@boyney123](https://github.com/boyney123)! - feat - added ability to add css overrides

## 1.1.2

### Patch Changes

- [`b08f273`](https://github.com/boyney123/eventcatalog/commit/b08f2733b8f6cfea8b89e0708f3ad88bc2e9903f) [#470](https://github.com/boyney123/eventcatalog/pull/470) Thanks [@boyney123](https://github.com/boyney123)! - fix - fixed build with swagger version

## 1.1.1

### Patch Changes

- [`7eb8c93`](https://github.com/boyney123/eventcatalog/commit/7eb8c93a2f13088e45c725dc18699e4f66bdf2c5) [#462](https://github.com/boyney123/eventcatalog/pull/462) Thanks [@boyney123](https://github.com/boyney123)! - fix - copy config file on build

## 1.1.0

### Minor Changes

- [`4b34273`](https://github.com/boyney123/eventcatalog/commit/4b34273931e141a651c0a56e1bc6fba5543869eb) [#447](https://github.com/boyney123/eventcatalog/pull/447) Thanks [@rberger](https://github.com/rberger)! - Force the dependency trim to be version 0.0.3 with a resolution to eliminate a high vulnerability

## 1.0.7

### Patch Changes

- [`63abb59`](https://github.com/boyney123/eventcatalog/commit/63abb596bb2a63caad6349d93b201bac01434f79) [#445](https://github.com/boyney123/eventcatalog/pull/445) Thanks [@boyney123](https://github.com/boyney123)! - fix- build for typescript and react types

## 1.0.6

### Patch Changes

- [`fc2dcd5`](https://github.com/boyney123/eventcatalog/commit/fc2dcd5acc09ea8e03e796537e6b8597f08d5546) [#440](https://github.com/boyney123/eventcatalog/pull/440) Thanks [@rtoro](https://github.com/rtoro)! - feat - added new page for users

## 1.0.5

### Patch Changes

- [`4834e9f`](https://github.com/boyney123/eventcatalog/commit/4834e9f4d1761615e7e5d4740e98c66c00fdc99e) [#438](https://github.com/boyney123/eventcatalog/pull/438) Thanks [@boyney123](https://github.com/boyney123)! - fix: set key on rendered serices, no longer duplicates them

## 1.0.4

### Patch Changes

- [`40a6221`](https://github.com/boyney123/eventcatalog/commit/40a62216f4d9a2d4bfba525bd1f9c92cbd63ecdb) [#414](https://github.com/boyney123/eventcatalog/pull/414) Thanks [@pebbz](https://github.com/pebbz)! - chore(core) - FIX-408 - upgrade typescript

## 1.0.3

### Patch Changes

- [`9476d74`](https://github.com/boyney123/eventcatalog/commit/9476d74af8fc3af8f1aaceb4e6def77e61c5e17f) [#428](https://github.com/boyney123/eventcatalog/pull/428) Thanks [@jlee-spt](https://github.com/jlee-spt)! - feat: Allow fetching of remote asyncapi docs

## 1.0.2

### Patch Changes

- [`69298ce`](https://github.com/boyney123/eventcatalog/commit/69298ce8b46b77c2662ab789af7c00295cb7fe06) [#432](https://github.com/boyney123/eventcatalog/pull/432) Thanks [@boyney123](https://github.com/boyney123)! - chore - locking down Asyncapi version

- [`bfdd189`](https://github.com/boyney123/eventcatalog/commit/bfdd18917d3ec4e51a78dd6c4c93c445e6430e67) [#431](https://github.com/boyney123/eventcatalog/pull/431) Thanks [@jslim](https://github.com/jslim)! - Chore: including fs false by default

## 1.0.1

### Patch Changes

- [`a83e9e5`](https://github.com/boyney123/eventcatalog/commit/a83e9e5e7922689b6ac3326c680a84b9ce582c2a) [#415](https://github.com/boyney123/eventcatalog/pull/415) Thanks [@rafaelrenanpacheco](https://github.com/rafaelrenanpacheco)! - feat: sort sidebar filters

## 1.0.0

### Major Changes

- [`24634aa`](https://github.com/boyney123/eventcatalog/commit/24634aa00d14c05b56cf9fd6e5e7e7dcdd943b07) [#409](https://github.com/boyney123/eventcatalog/pull/409) Thanks [@pebbz](https://github.com/pebbz)! - FIX-276 - Fix bug 276 by upgrading packages

## 0.6.12

### Patch Changes

- [`3bf1979`](https://github.com/boyney123/eventcatalog/commit/3bf19799880cb379e8fbea1bf4cdc40b0c7be7b1) [#400](https://github.com/boyney123/eventcatalog/pull/400) Thanks [@boyney123](https://github.com/boyney123)! - feat- allow props to be used in openAPI components

## 0.6.11

### Patch Changes

- [`21c6260`](https://github.com/boyney123/eventcatalog/commit/21c6260b04bd849f93c11a571c6a6c9b55501911) [#397](https://github.com/boyney123/eventcatalog/pull/397) Thanks [@boyney123](https://github.com/boyney123)! - feta - Adding support for OpenAPI files in events.

## 0.6.10

### Patch Changes

- [`97c0da5`](https://github.com/boyney123/eventcatalog/commit/97c0da5c2976f024286f7760cd688e93b9c53701) [#340](https://github.com/boyney123/eventcatalog/pull/340) Thanks [@michelgrootjans](https://github.com/michelgrootjans)! - - feat - added ability to show node graphs on the event and service overview pages.

## 0.6.9

### Patch Changes

- [`264b6c8`](https://github.com/boyney123/eventcatalog/commit/264b6c8525e59c76bc28bec11d093c5740cf73bf) [#328](https://github.com/boyney123/eventcatalog/pull/328) Thanks [@dremonkey](https://github.com/dremonkey)! - fix: support spaces in projectDIR path

## 0.6.8

### Patch Changes

- [`78945be`](https://github.com/boyney123/eventcatalog/commit/78945be651c48e9194794eff4a73566cb8a045b4) [#360](https://github.com/boyney123/eventcatalog/pull/360) Thanks [@boyney123](https://github.com/boyney123)! - (fix) - fixing 404 issues with domain page

## 0.6.7

### Patch Changes

- [`a93ab13`](https://github.com/boyney123/eventcatalog/commit/a93ab13bf939d8ebdfc771cc6fff23167420a403) [#350](https://github.com/boyney123/eventcatalog/pull/350) Thanks [@ldiego73](https://github.com/ldiego73)! - fix to correctly display the user when there are no events associated with a domain.

- [`a93ab13`](https://github.com/boyney123/eventcatalog/commit/a93ab13bf939d8ebdfc771cc6fff23167420a403) [#350](https://github.com/boyney123/eventcatalog/pull/350) Thanks [@ldiego73](https://github.com/ldiego73)! - fix: correct display of users in domain

## 0.6.6

### Patch Changes

- [`c8b765b`](https://github.com/boyney123/eventcatalog/commit/c8b765b62446097781fd650675b04fe1d4daa287) [#354](https://github.com/boyney123/eventcatalog/pull/354) Thanks [@rafaelrenanpacheco](https://github.com/rafaelrenanpacheco)! - feat: add event tags

## 0.6.5

### Patch Changes

- [`b63773b`](https://github.com/boyney123/eventcatalog/commit/b63773bbb774a1bbf518f3dd0195bba6c09687cd) [#348](https://github.com/boyney123/eventcatalog/pull/348) Thanks [@boyney123](https://github.com/boyney123)! - fix for 260 - nodegraphs used over mermaid graphs when writing to eve…

## 0.6.4

### Patch Changes

- [`adeda51`](https://github.com/boyney123/eventcatalog/commit/adeda51f7f1f5c375e0b54248ac33d4dd2476054) Thanks [@boyney123](https://github.com/boyney123)! - OpenAPI component now supports remote spec files.

## 0.6.3

### Patch Changes

- [`16e792e`](https://github.com/boyney123/eventcatalog/commit/16e792ea72ed524ac80108754a16f655ec6a2a91) [#336](https://github.com/boyney123/eventcatalog/pull/336) Thanks [@boyney123](https://github.com/boyney123)! - adding fix for 324 - domains with services edit link now correct

## 0.6.2

### Patch Changes

- [`8f72480`](https://github.com/boyney123/eventcatalog/commit/8f724804873317940d62b2887aa8f54ced430260) [#330](https://github.com/boyney123/eventcatalog/pull/330) Thanks [@michelgrootjans](https://github.com/michelgrootjans)! - Fix to the 3D node graph

## 0.6.1

### Patch Changes

- [`9315416`](https://github.com/boyney123/eventcatalog/commit/931541626315a753d630593083e2f1f87c7c51cc) [#320](https://github.com/boyney123/eventcatalog/pull/320) Thanks [@mikaelvesavuori](https://github.com/mikaelvesavuori)! - Mermaid component not working

## 0.6.0

### Minor Changes

- [`34358f5`](https://github.com/boyney123/eventcatalog/commit/34358f5b55fa58a8502a81ed44fb9c4b1901bdd2) [#314](https://github.com/boyney123/eventcatalog/pull/314) Thanks [@martzcodes](https://github.com/martzcodes)! - Feature: Add Badge Filtering to Domains, Events, and Services

## 0.5.2

### Patch Changes

- [`7372407`](https://github.com/boyney123/eventcatalog/commit/73724077d528d48d16bfffaa97231e7f63e3903f) [#312](https://github.com/boyney123/eventcatalog/pull/312) Thanks [@boyney123](https://github.com/boyney123)! - fix version for spotlight

## 0.5.1

### Patch Changes

- [`8419a50`](https://github.com/boyney123/eventcatalog/commit/8419a506c7ffa686fb474235474261462949f888) [#308](https://github.com/boyney123/eventcatalog/pull/308) Thanks [@boyney123](https://github.com/boyney123)! - chore: updating to minify files and change cdn for font-awesome

## 0.5.0

### Minor Changes

- [`a790134`](https://github.com/boyney123/eventcatalog/commit/a7901349fc12efce430f5aeda87d5befb03bd628) [#303](https://github.com/boyney123/eventcatalog/pull/303) Thanks [@dpwdec](https://github.com/dpwdec)! - feat: added new badges for event, services and domains

## 0.4.0

### Minor Changes

- [`cda7105`](https://github.com/boyney123/eventcatalog/commit/cda7105b03e5d5aa6fc9451552cc89c1e88e8859) [#304](https://github.com/boyney123/eventcatalog/pull/304) Thanks [@lcsbltm](https://github.com/lcsbltm)! - feat: added support for asyncapi file in service directory. Now supports new AsyncAPI MDX component.

## 0.3.4

### Patch Changes

- [`390f0a1`](https://github.com/boyney123/eventcatalog/commit/390f0a103ca011afbb7611f88f69daf06a930bd5) [#297](https://github.com/boyney123/eventcatalog/pull/297) Thanks [@boyney123](https://github.com/boyney123)! - fix - autoprefix warning in console

## 0.3.3

### Patch Changes

- [`1e30f43`](https://github.com/boyney123/eventcatalog/commit/1e30f439364143022bac7094e06bfbed11e51af9) [#295](https://github.com/boyney123/eventcatalog/pull/295) Thanks [@boyney123](https://github.com/boyney123)! - chore - update mermaid package

## 0.3.2

### Patch Changes

- [`d7368d0`](https://github.com/boyney123/eventcatalog/commit/d7368d0a5dec261e99b3f556af4c90572d4bb38c) [#293](https://github.com/boyney123/eventcatalog/pull/293) Thanks [@boyney123](https://github.com/boyney123)! - fix - allow button configuration on the homescreen

## 0.3.1

### Patch Changes

- [`8ccc733`](https://github.com/boyney123/eventcatalog/commit/8ccc733c69b7b262c6d1d9751d331a101719de42) [#291](https://github.com/boyney123/eventcatalog/pull/291) Thanks [@boyney123](https://github.com/boyney123)! - fix - overflow issues with too many examples in the Examples MDX comp…

## 0.3.0

### Minor Changes

- [`93db111`](https://github.com/boyney123/eventcatalog/commit/93db11169279435a762a8098c2f50014a5698504) [#286](https://github.com/boyney123/eventcatalog/pull/286) Thanks [@boyney123](https://github.com/boyney123)! - feat - users can now edit header links

## 0.2.20

### Patch Changes

- [`3ca978a`](https://github.com/boyney123/eventcatalog/commit/3ca978a5fd16267f3479d67c54fa0f8007f94dc9) [#281](https://github.com/boyney123/eventcatalog/pull/281) Thanks [@dytyniuk](https://github.com/dytyniuk)! - Fix a broken link behind View in Visualiser button on the Event Details page

## 0.2.19

### Patch Changes

- [`6848067`](https://github.com/boyney123/eventcatalog/commit/68480677ed079bb73c0b8e19f60e15abb3aff707) [#264](https://github.com/boyney123/eventcatalog/pull/264) Thanks [@rtoro](https://github.com/rtoro)! - feat: adding search box into service page

## 0.2.18

### Patch Changes

- [`602f726`](https://github.com/boyney123/eventcatalog/commit/602f72693f9b4f3f9dd9838dd8cad2da6c4ff6a2) [#254](https://github.com/boyney123/eventcatalog/pull/254) Thanks [@drub0y](https://github.com/drub0y)! - fix(core): Fixes getEditUrl to build URLs w/URL vs just path.join

## 0.2.17

### Patch Changes

- [`c5330cd`](https://github.com/boyney123/eventcatalog/commit/c5330cd9776de26389271a2bd7b0c589a59b0982) [#265](https://github.com/boyney123/eventcatalog/pull/265) Thanks [@boyney123](https://github.com/boyney123)! - fix: fixing small padding issues on various pages

## 0.2.16

### Patch Changes

- [`6ffc4af`](https://github.com/boyney123/eventcatalog/commit/6ffc4afe7059b98c02b496349ca624c9b672dbcb) [#261](https://github.com/boyney123/eventcatalog/pull/261) Thanks [@boyney123](https://github.com/boyney123)! - fix(core): Fixes node domain service/event linking

## 0.2.15

### Patch Changes

- [`c5cb51f`](https://github.com/boyney123/eventcatalog/commit/c5cb51f60926d2edad806de59873aadab61e0d9d) [#258](https://github.com/boyney123/eventcatalog/pull/258) Thanks [@boyney123](https://github.com/boyney123)! - fix: now checks events folder in domains before moving them to public…

## 0.2.14

### Patch Changes

- [`17a5883`](https://github.com/boyney123/eventcatalog/commit/17a5883bcc15480872c2944296fcac503bfab8c4) [#251](https://github.com/boyney123/eventcatalog/pull/251) Thanks [@boyney123](https://github.com/boyney123)! - fix: build issues with eventcatalog core

## 0.2.13

### Patch Changes

- [`5211140`](https://github.com/boyney123/eventcatalog/commit/5211140b254353b7aa1c5baead6be416a853cc9d) [#240](https://github.com/boyney123/eventcatalog/pull/240) Thanks [@thim81](https://github.com/thim81)! - feat: Analytics - Added Google Analytics option

## 0.2.12

### Patch Changes

- [`4269b19`](https://github.com/boyney123/eventcatalog/commit/4269b199809807bd08968ce4f9c6e025c5d14794) [#241](https://github.com/boyney123/eventcatalog/pull/241) Thanks [@donaldpipowitch](https://github.com/donaldpipowitch)! - chore: improve typings

## 0.2.11

### Patch Changes

- [`8c3c719`](https://github.com/boyney123/eventcatalog/commit/8c3c719b94e005921f6caec16106466da3f86992) [#244](https://github.com/boyney123/eventcatalog/pull/244) Thanks [@otbe](https://github.com/otbe)! - Fix broken links for services that have no domain on events detail page

## 0.2.10

### Patch Changes

- [`41f6b5a`](https://github.com/boyney123/eventcatalog/commit/41f6b5a03645bfac2006f80c013ed7315cbe3add) [#229](https://github.com/boyney123/eventcatalog/pull/229) Thanks [@rtoro](https://github.com/rtoro)! - feat(core): allow the use of swagger ui in service pages

## 0.2.9

### Patch Changes

- [`3740427`](https://github.com/boyney123/eventcatalog/commit/37404275e021c4d55ae43f5efbf12e321bf65025) [#230](https://github.com/boyney123/eventcatalog/pull/230) Thanks [@boyney123](https://github.com/boyney123)! - fix: visualiser now supports long names in diagram (again)

## 0.2.8

### Patch Changes

- [`2985a14`](https://github.com/boyney123/eventcatalog/commit/2985a14ecdebb5f15ea0ff6512ee88f8863e676f) [#227](https://github.com/boyney123/eventcatalog/pull/227) Thanks [@boyney123](https://github.com/boyney123)! - feat: adding new node in visualiser to show all events and services

## 0.2.7

### Patch Changes

- [`4e03a95`](https://github.com/boyney123/eventcatalog/commit/4e03a95f1420c36169232723f277e88b12c3d5f7) [#224](https://github.com/boyney123/eventcatalog/pull/224) Thanks [@boyney123](https://github.com/boyney123)! - feat: visualiser on click now sets query params

## 0.2.6

### Patch Changes

- [`ccb524a`](https://github.com/boyney123/eventcatalog/commit/ccb524abc97ec7c58b66fd8b1fcb34b0f9a7bd02) [#217](https://github.com/boyney123/eventcatalog/pull/217) Thanks [@otbe](https://github.com/otbe)! - fix: add a stable render key for events/services in visualizer

## 0.2.5

### Patch Changes

- [`65ee3da`](https://github.com/boyney123/eventcatalog/commit/65ee3daab667c0f8b960733c738e3fb12f683144) [#215](https://github.com/boyney123/eventcatalog/pull/215) Thanks [@otbe](https://github.com/otbe)! - add a stable render key for events

## 0.2.4

### Patch Changes

- [`c833a2a`](https://github.com/boyney123/eventcatalog/commit/c833a2a74b049e231c804504550b942d4dc33e70) [#213](https://github.com/boyney123/eventcatalog/pull/213) Thanks [@boyney123](https://github.com/boyney123)! - chore: update to new nextjs version

## 0.2.3

### Patch Changes

- [`a0b90f9`](https://github.com/boyney123/eventcatalog/commit/a0b90f9a4ce9bfd0409b2dff44da5f00bafdfa87) [#211](https://github.com/boyney123/eventcatalog/pull/211) Thanks [@boyney123](https://github.com/boyney123)! - fix: fixing domain mappings and change log issues with domains

## 0.2.2

### Patch Changes

- [`7dcdd9e`](https://github.com/boyney123/eventcatalog/commit/7dcdd9efa077ab9beafcb92bf4789359f9eed02c) [#209](https://github.com/boyney123/eventcatalog/pull/209) Thanks [@boyney123](https://github.com/boyney123)! - fix: now check for events dir before moving schemas

## 0.2.1

### Patch Changes

- [`ccefeee`](https://github.com/boyney123/eventcatalog/commit/ccefeeee93e80620c1c3755676bd0dbe448b4a8a) [#206](https://github.com/boyney123/eventcatalog/pull/206) Thanks [@boyney123](https://github.com/boyney123)! - feat: fixing domains and adding them to create package

## 0.2.0

### Minor Changes

- [`8352416`](https://github.com/boyney123/eventcatalog/commit/835241609aa03cb8158b7a5a1c662c57f8e22505) [#204](https://github.com/boyney123/eventcatalog/pull/204) Thanks [@boyney123](https://github.com/boyney123)! - feat: adding domain support to eventcatalog

## 0.1.19

### Patch Changes

- [`a6f5ae3`](https://github.com/boyney123/eventcatalog/commit/a6f5ae3684279b57cbb4c337e98a5373a2facabb) [#195](https://github.com/boyney123/eventcatalog/pull/195) Thanks [@donaldpipowitch](https://github.com/donaldpipowitch)! - fix(logs): break line in diff view

* [`f48322a`](https://github.com/boyney123/eventcatalog/commit/f48322ab96be22a65baa4cbd5b5ce6d7a0fadd8b) [#167](https://github.com/boyney123/eventcatalog/pull/167) Thanks [@thim81](https://github.com/thim81)! - feat: set page title, description, favicon and og metadata

## 0.1.18

### Patch Changes

- [`3eb7f3b`](https://github.com/boyney123/eventcatalog/commit/3eb7f3b98ef5061beaff4d1ebfac3874cab33c95) [#190](https://github.com/boyney123/eventcatalog/pull/190) Thanks [@boyney123](https://github.com/boyney123)! - chore: added new footer link for visualiser

## 0.1.17

### Patch Changes

- [`d57e67b`](https://github.com/boyney123/eventcatalog/commit/d57e67bf38be9391841b3c6dee6ab360b2eb1325) [#188](https://github.com/boyney123/eventcatalog/pull/188) Thanks [@boyney123](https://github.com/boyney123)! - fixing visualiser for mobile devices

## 0.1.16

### Patch Changes

- [`2d10847`](https://github.com/boyney123/eventcatalog/commit/2d108470af945e1cec59c114627878c56d7385dd) [#186](https://github.com/boyney123/eventcatalog/pull/186) Thanks [@boyney123](https://github.com/boyney123)! - feat: added new visualiser feature

## 0.1.15

### Patch Changes

- [`60bea4d`](https://github.com/boyney123/eventcatalog/commit/60bea4db471bf3c63a936b86ce7ee549e73972a6) [#182](https://github.com/boyney123/eventcatalog/pull/182) Thanks [@thim81](https://github.com/thim81)! - fix: optional title for all MDX components

* [`bf5bab4`](https://github.com/boyney123/eventcatalog/commit/bf5bab44b9be92c5888c6548694c42d1fa83a678) [#184](https://github.com/boyney123/eventcatalog/pull/184) Thanks [@thim81](https://github.com/thim81)! - fix: increase node width for NodeGraph

## 0.1.14

### Patch Changes

- [`1558d17`](https://github.com/boyney123/eventcatalog/commit/1558d17b1c9f925c8e74d22b57edbfc4195a73a6) [#178](https://github.com/boyney123/eventcatalog/pull/178) Thanks [@boyney123](https://github.com/boyney123)! - feat: added better code example component

## 0.1.13

### Patch Changes

- [`ca01bef`](https://github.com/boyney123/eventcatalog/commit/ca01bef1659b2c364210a86e0f9e916f6c1fbaa4) [#166](https://github.com/boyney123/eventcatalog/pull/166) Thanks [@thim81](https://github.com/thim81)! - feat: new nodegraph component to render services and events

## 0.1.12

### Patch Changes

- [`5dcc188`](https://github.com/boyney123/eventcatalog/commit/5dcc188dbd68f70b867e38df91211ba077f14189) [#175](https://github.com/boyney123/eventcatalog/pull/175) Thanks [@thim81](https://github.com/thim81)! - fix: mermaid diagram with pub/sub of same service now shows correctly

## 0.1.11

### Patch Changes

- [`0976201`](https://github.com/boyney123/eventcatalog/commit/0976201a6949f4a78934a4ddfb75e7ea4598caae) [#172](https://github.com/boyney123/eventcatalog/pull/172) Thanks [@boyney123](https://github.com/boyney123)! - fix: header logo now reads from config

## 0.1.10

### Patch Changes

- [`b44bd6c`](https://github.com/boyney123/eventcatalog/commit/b44bd6ca73194165e6448abebd020e3d6f3007a2) [#169](https://github.com/boyney123/eventcatalog/pull/169) Thanks [@thim81](https://github.com/thim81)! - fix: logic for services publish & subscribe nodes

## 0.1.9

### Patch Changes

- [`c4d78c7`](https://github.com/boyney123/eventcatalog/commit/c4d78c77da6bc18638c6612e865c2c8cdd596e0b) [#139](https://github.com/boyney123/eventcatalog/pull/139) Thanks [@thim81](https://github.com/thim81)! - feat: add new eventcatalog config property to set homepage url

## 0.1.8

### Patch Changes

- [`fd9b26a`](https://github.com/boyney123/eventcatalog/commit/fd9b26a24fd94e298b79b59777f148988a7c89b1) [#151](https://github.com/boyney123/eventcatalog/pull/151) Thanks [@thim81](https://github.com/thim81)! - feat: new mdx component json schema viewer

## 0.1.7

### Patch Changes

- [`740c504`](https://github.com/boyney123/eventcatalog/commit/740c5041f033aff975a7ce89e99b3722b271e2b3) [#154](https://github.com/boyney123/eventcatalog/pull/154) Thanks [@boyney123](https://github.com/boyney123)! - fix: trying to fix npm versions problem

## 0.1.6

### Patch Changes

- [`00e3c89`](https://github.com/boyney123/eventcatalog/commit/00e3c898ca8bf72bd563d246d6a2ee8620dd8284) [#143](https://github.com/boyney123/eventcatalog/pull/143) Thanks [@thim81](https://github.com/thim81)! - feat: mermaid name and link

* [`b4774fb`](https://github.com/boyney123/eventcatalog/commit/b4774fbf9773e66e1f85d71e99992e699833bf99) [#141](https://github.com/boyney123/eventcatalog/pull/141) Thanks [@thim81](https://github.com/thim81)! - bug: use title when setting page title

## 0.1.5

### Patch Changes

- [`1975995`](https://github.com/boyney123/eventcatalog/commit/1975995e2a77662742e8f7d95b827ff3cb0e4ac2) [#136](https://github.com/boyney123/eventcatalog/pull/136) Thanks [@boyney123](https://github.com/boyney123)! - fix: header link now goes to landing page

## 0.1.4

### Patch Changes

- [`71d0b85`](https://github.com/boyney123/eventcatalog/commit/71d0b85139cb057db718c10bf5f5aa6017cfe43c) [#132](https://github.com/boyney123/eventcatalog/pull/132) Thanks [@boyney123](https://github.com/boyney123)! - fix: build directory is now copied over to the users proejct dir

## 0.1.3

### Patch Changes

- [`904c4df`](https://github.com/boyney123/eventcatalog/commit/904c4dff59bfdac681d8c18879a5840862aeb616) [#127](https://github.com/boyney123/eventcatalog/pull/127) Thanks [@boyney123](https://github.com/boyney123)! - bug: fixed issue with purging css from the admonition component

## 0.1.2

### Patch Changes

- [`cc8eb2f`](https://github.com/boyney123/eventcatalog/commit/cc8eb2fe14501447206bdb8fe141a0575c753636) [#121](https://github.com/boyney123/eventcatalog/pull/121) Thanks [@otbe](https://github.com/otbe)! - Allow to configure "trailingSlash"

* [`dacd9eb`](https://github.com/boyney123/eventcatalog/commit/dacd9eb41e3f519341f32e60c4de27df5a9137b7) [#120](https://github.com/boyney123/eventcatalog/pull/120) Thanks [@thim81](https://github.com/thim81)! - feat: Hide owners section if the events has owners defined

## 0.1.1

### Patch Changes

- [`23930c8`](https://github.com/boyney123/eventcatalog/commit/23930c8f4f4a9234e037473aaeccae3dafdfe385) [#114](https://github.com/boyney123/eventcatalog/pull/114) Thanks [@boyney123](https://github.com/boyney123)! - feat: adding search to events page

* [`e37ff4b`](https://github.com/boyney123/eventcatalog/commit/e37ff4b31c06779ae89f2b17beb14cb409d464e3) [#113](https://github.com/boyney123/eventcatalog/pull/113) Thanks [@otbe](https://github.com/otbe)! - Configure base path

## 0.1.0

### Minor Changes

- [`688e2da`](https://github.com/boyney123/eventcatalog/commit/688e2da9ade503e4276c6710c77e45f4652e19a1) [#111](https://github.com/boyney123/eventcatalog/pull/111) Thanks [@boyney123](https://github.com/boyney123)! - feat: catalog now staticlly exports rather than using server code

## 0.0.14

### Patch Changes

- [`7c23703`](https://github.com/boyney123/eventcatalog/commit/7c237039535d7f5d6f229396cf59eb5cbf5b0645) [#109](https://github.com/boyney123/eventcatalog/pull/109) Thanks [@boyney123](https://github.com/boyney123)! - fix: issue with long names for services and events rendering incorrectly

## 0.0.13

### Patch Changes

- [`732dac2`](https://github.com/boyney123/eventcatalog/commit/732dac24c1de62537732083a53c2218c2794773a) [#102](https://github.com/boyney123/eventcatalog/pull/102) Thanks [@boyney123](https://github.com/boyney123)! - feat: allow default frontmatter when creating events

## 0.0.12

### Patch Changes

- [`dd1b29f`](https://github.com/boyney123/eventcatalog/commit/dd1b29f81658a3c5bea9ed92c1cf54265c7feb0b) [#98](https://github.com/boyney123/eventcatalog/pull/98) Thanks [@boyney123](https://github.com/boyney123)! - feat: adding more mermaid support in mdx

## 0.0.11

### Patch Changes

- [`97e447a`](https://github.com/boyney123/eventcatalog/commit/97e447aa0ec255b2c879eac7fa83d7b705230790) [#95](https://github.com/boyney123/eventcatalog/pull/95) Thanks [@boyney123](https://github.com/boyney123)! - fix: edit url is now optional in not found pages and no longer fetche…

## 0.0.10

### Patch Changes

- [`df372c6`](https://github.com/boyney123/eventcatalog/commit/df372c675e76a4a5980740222ccf8268c0c71540) [#91](https://github.com/boyney123/eventcatalog/pull/91) Thanks [@boyney123](https://github.com/boyney123)! - feat: fix-generator

## 0.0.9

### Patch Changes

- [`b7202dc`](https://github.com/boyney123/eventcatalog/commit/b7202dcd7548d1d0f406ce9d979182cd4c09232a) [#82](https://github.com/boyney123/eventcatalog/pull/82) Thanks [@boyney123](https://github.com/boyney123)! - fix: event log page now displays correct name

## 0.0.8

### Patch Changes

- [`534bec1`](https://github.com/boyney123/eventcatalog/commit/534bec11f57bcabe7f79f40338ae02bef134efc2) [#78](https://github.com/boyney123/eventcatalog/pull/78) Thanks [@thim81](https://github.com/thim81)! - feat: externalLinks for services

* [`b557ff8`](https://github.com/boyney123/eventcatalog/commit/b557ff8f7186b939cbe1e23f2c0e1e9a7254c907) [#79](https://github.com/boyney123/eventcatalog/pull/79) Thanks [@boyney123](https://github.com/boyney123)! - fix: adding keys on maps in react

- [`407d9e0`](https://github.com/boyney123/eventcatalog/commit/407d9e0d7f8d5eab4747ce0af6d5079204b53d21) [#75](https://github.com/boyney123/eventcatalog/pull/75) Thanks [@thim81](https://github.com/thim81)! - feat: optional editUrl config

* [`9eb7463`](https://github.com/boyney123/eventcatalog/commit/9eb7463b32baa09a6dd693e7f0eede63e33cd39c) [#71](https://github.com/boyney123/eventcatalog/pull/71) Thanks [@thim81](https://github.com/thim81)! - feat: link to external event documentation added

## 0.0.7

### Patch Changes

- [`ee17db8`](https://github.com/boyney123/eventcatalog/commit/ee17db8958ac6368f7d833f0d3ebec2604722e42) [#56](https://github.com/boyney123/eventcatalog/pull/56) Thanks [@boyney123](https://github.com/boyney123)! - feat: changelog.md files now belong inside the versioned folders

## 0.0.6

### Patch Changes

- [`ad66a66`](https://github.com/boyney123/eventcatalog/commit/ad66a66b526a167cc8da43dd2371642c9f9029f2) [#49](https://github.com/boyney123/eventcatalog/pull/49) Thanks [@boyney123](https://github.com/boyney123)! - fix: now supports any extension for event examples also added missing docs

## 0.0.5

### Patch Changes

- [`576debd`](https://github.com/boyney123/eventcatalog/commit/576debdfc5dbc2fbbf98e2b3f4d78b84f9a07669) [#46](https://github.com/boyney123/eventcatalog/pull/46) Thanks [@boyney123](https://github.com/boyney123)! - fix: using cross-env to fix issues with windows OS

## 0.0.4

### Patch Changes

- [`1eb4572`](https://github.com/boyney123/eventcatalog/commit/1eb4572918ac06afb64554fef2fc1a3877fbf06d) [#44](https://github.com/boyney123/eventcatalog/pull/44) Thanks [@boyney123](https://github.com/boyney123)! - feat: added more customise options and documentation for them

## 0.0.3

### Patch Changes

- [`23a96fc`](https://github.com/boyney123/eventcatalog/commit/23a96fc651907517cee937657be14cbf9fe95fb9) [#42](https://github.com/boyney123/eventcatalog/pull/42) Thanks [@boyney123](https://github.com/boyney123)! - fix: now remove the .next folder before we start the dev server foric…

## 0.0.2

### Patch Changes

- [`53b27cb`](https://github.com/boyney123/eventcatalog/commit/53b27cb5bb5ab7fa8d526309c6dd50e1f17f3db1) [#39](https://github.com/boyney123/eventcatalog/pull/39) Thanks [@boyney123](https://github.com/boyney123)! - feat: removed ids from services
