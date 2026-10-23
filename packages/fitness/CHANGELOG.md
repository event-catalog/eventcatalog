# @eventcatalog/fitness

## 0.1.1

### Patch Changes

- Updated dependencies [de4a87a]
  - @eventcatalog/sdk@2.32.0

## 0.1.0

### Minor Changes

- 20f3ed3: feat: architecture fitness functions. Write your architecture rules as `*.fitness.ts` files in a `fitness/` folder (or next to a domain, system, service, message or data store), and run them with `npx eventcatalog fitness check` (or `npx @eventcatalog/cli fitness check`). Each function gets the resource it sits alongside and read-only access to the catalog through the SDK, returns the violations it finds, and the check prints the results, writes them to `.eventcatalog/fitness/results.json` and exits with 1 when a rule fails, so it can gate pull requests. New catalogs come with two starter fitness functions and an `npm run fitness` script.

### Patch Changes

- Updated dependencies [20f3ed3]
  - @eventcatalog/sdk@2.31.2
