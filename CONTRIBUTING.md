# Contributing to EventCatalog

[EventCatalog](https://eventcatalog.dev) is our way to hopefully help people document Event Driven Architectures. If you're interested in contributing to EventCatalog, hopefully, this document makes the process for contributing clear.

The [Open Source Guides](https://opensource.guide/) website has a collection of resources for individuals, communities, and companies who want to learn how to run and contribute to an open source project. Contributors and people new to open source alike will find the following guides especially useful:

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Building Welcoming Communities](https://opensource.guide/building-community/)

## Get Involved

There are many ways to contribute to EventCatalog, and many of them do not involve writing any code. Here's a few ideas to get started:

- Simply start using EventCatalog. Go through the [Getting Started](https://eventcatalog.dev/docs/installation) guide. Does everything work as expected? If not, we're always looking for improvements. Let us know by [opening an issue](#reporting-new-issues).
- Look through the [open issues](https://github.com/boyney123/eventcatalog/issues). Provide workarounds, ask for clarification, or suggest labels. Help [triage issues](#triaging-issues-and-pull-requests).
- If you find an issue you would like to fix, [open a pull request](#your-first-pull-request). Issues tagged as [_Good first issue_](https://github.com/boyney123/eventcatalog/labels/Good%20first%20issue) are a good place to get started.
- Read through the [EventCatalog docs](https://eventcatalog.dev/docs/installation). If you find anything that is confusing or can be improved, you can click "Edit this page" at the bottom of most docs, which takes you to the GitHub interface to make and propose changes.
- Take a look at the [features requested](https://github.com/boyney123/eventcatalog/labels/feature) by others in the community and consider opening a pull request if you see something you want to work on.

Contributions are very welcome. If you think you need help planning your contribution, please ping on Twitter at [@boyney123](https://twitter.com/boyney123) and let us know you are looking for a bit of help.

### Join our Discord Channel

We have the [`#contributors`](https://discord.gg/3rjaZMmrAm) channel on [Discord](https://discord.gg/3rjaZMmrAm) to discuss all things about EventCatalog development. You can also be of great help by helping other users in the help channel.

### Triaging Issues and Pull Requests

One great way you can contribute to the project without writing any code is to help triage issues and pull requests as they come in.

- Ask for more information if you believe the issue does not provide all the details required to solve it.
- Suggest [labels](https://github.com/boyney123/eventcatalog/labels) that can help categorize issues.
- Flag issues that are stale or that should be closed.
- Ask for test plans and review code.

## Our Development Process

EventCatalog uses [GitHub](https://github.com/boyney123/eventcatalog) as its source of truth. All changes will be public from the beginning.

All pull requests will be checked by the continuous integration system, GitHub actions.

### Branch Organization

EventCatalog has one primary branch `main` and we use feature branches to deliver new features with pull requests.

## Proposing a Change

If you would like to request a new feature or enhancement but are not yet thinking about opening a pull request, you can also file an issue with the [feature template](https://github.com/boyney123/eventcatalog/issues/new?assignees=&labels=feature%2Cneeds+triage&template=feature.yml).

If you're only fixing a bug, it's fine to submit a pull request right away but we still recommend [filing an issue](https://github.com/boyney123/eventcatalog/issues/new?assignees=&labels=bug%2Cneeds+triage&template=bug.yml) detailing what you're fixing. This is helpful in case we don't accept that specific fix but want to keep track of the issue.

### Reporting New Issues

When [opening a new issue](https://github.com/boyney123/eventcatalog/issues/new/choose), always make sure to fill out the issue template. **This step is very important!** Not doing so may result in your issue not being managed in a timely fashion. Don't take this personally if this happens, and feel free to open a new issue once you've gathered all the information required by the template.

- **One issue, one bug:** Please report a single bug per issue.
- **Provide reproduction steps:** List all the steps necessary to reproduce the issue. The person reading your bug report should be able to follow these steps to reproduce your issue with minimal effort.

### Bugs

We use [GitHub Issues](https://github.com/boyney123/eventcatalog/issues) for our public bugs. If you would like to report a problem, take a look around and see if someone already opened an issue about it. If you are certain this is a new, unreported bug, you can submit a [bug report](#reporting-new-issues).

### Feature requests

You can also file issues as [feature requests or enhancements](https://github.com/boyney123/eventcatalog/labels/feature%20request). If you see anything you'd like to be implemented, create an issue with [feature template](https://raw.githubusercontent.com/boyney123/eventcatalog/master/.github/ISSUE_TEMPLATE/feature.md)

### Questions

If you have questions about using EventCatalog, ask in [Discord](https://discord.gg/3rjaZMmrAm) or contact on [Twitter](https://twitter.com/boyney123) and we will do our best to answer your questions.

## Pull Requests

### Your First Pull Request

So you have decided to contribute code back to upstream by opening a pull request. You've invested a good chunk of time, and we appreciate it. We will do our best to work with you and get the PR looked at.

Working on your first Pull Request? You can learn how from this free video series:

[**How to Contribute to an Open Source Project on GitHub**](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

We have a list of [beginner-friendly issues](https://github.com/boyney123/eventcatalog/labels/good%20first%20issue) to help you get your feet wet in the EventCatalog codebase and familiar with our contribution process. This is a great place to get started.

### Installation

1. Ensure you have [Yarn](https://yarnpkg.com/) installed.
1. After cloning the repository, run `yarn install` in the root of the repository.
1. To start the Catalog locally run `yarn run start:catalog`
1. To start the documentation website, run `yarn run start:website`.

### Sending a Pull Request

Small pull requests are much easier to review and more likely to get merged. Make sure the PR does only one thing, otherwise please split it. It is recommended to follow this [commit message style](#semantic-commit-messages).

Please make sure the following is done when submitting a pull request:

1. Fork [the repository](https://github.com/boyney123/eventcatalog) and create your branch from `main`.
1. Make sure your code lints (`yarn format && yarn lint`).
1. Make sure your Jest tests pass (`yarn test`).

All pull requests should be opened against the `main` branch.

#### Breaking Changes

When adding a new breaking change, follow this template in your pull request:

```md
### New breaking change here

- **Who does this affect**:
- **How to migrate**:
- **Why make this breaking change**:
- **Severity (number of people affected x effort)**:
```

### What Happens Next?

We will be monitoring for pull requests. Do help us by keeping pull requests consistent by following the guidelines above.

## Style Guide

[Prettier](https://prettier.io) will catch most styling issues that may exist in your code. You can check the status of your code styling by simply running `yarn prettier`.

However, there are still some styles that Prettier cannot pick up.

## Semantic Commit Messages

See how a minor change to your commit message style can make you a better programmer.

Format: `<type>(<scope>): <subject>`

`<scope>` is optional. If your change is specific to one/two packages, consider adding the scope. Scopes should be brief but recognizable, e.g. `content-docs`, `theme-classic`, `core`

The various types of commits:

- `feat`: a new API or behavior **for the end user**.
- `fix`: a bug fix **for the end user**.
- `docs`: a change to the website or other Markdown documents in our repo.
- `refactor`: a change to production code that leads to no behavior difference, e.g. splitting files, renaming internal variables, improving code style...
- `test`: adding missing tests, refactoring tests; no production code change.
- `chore`: upgrading dependencies, releasing new versions... Chores that are **regularly done** for maintenance purposes.
- `misc`: anything else that doesn't change production code, yet is not `test` or `chore`. e.g. updating GitHub actions workflow.

Do not get too stressed about PR titles, however. The maintainers will help you get them right, and we also have a PR label system that doesn't equate with the commit message types. Your code is more important than conventions!

### Example

```
feat(core): allow overriding of webpack config
^--^^----^  ^------------^
|   |       |
|   |       +-> Summary in present tense.
|   |
|   +-> The package(s) that this change affected.
|
+-------> Type: see below for the list we use.
```

Use lower case not title case!

## Code Conventions

### General

- **Most important: Look around.** Match the style you see used in the rest of the project. This includes formatting, naming files, naming things in code, naming things in documentation, etc.
- "Attractive"
- We do have Prettier (a formatter) and ESLint (a syntax linter) to catch most stylistic problems. If you are working locally, they should automatically fix some issues during every git commit.

## License

By contributing to EventCatalog, you agree that your contributions will be licensed under its MIT license.