<div align="center">

<h1>📖 EventCatalog</h1>


<!-- [![Star on GitHub][github-star-badge]][github-star] -->
<!-- <h3>Bring discoverability to your -->
<!-- event-driven architectures</h3> -->
<!-- <p>Discover, Explore and Document your Event Driven Architectures.</p> -->

<!-- [![MIT License][license-badge]][license] -->
<!-- [![PRs Welcome][prs-badge]][prs] -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-39-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

<!-- [![Watch on GitHub][github-watch-badge]][github-watch] -->
<!-- [![Star on GitHub][github-star-badge]][github-star] -->

<!-- <hr /> -->

<img alt="header" src="./images/example.png" />

<h4>Features: Documentation generator for Event Driven Architectures, Markdown driven, Document Domains/Services/Messages/Schemas and more, Content versioning, Assign Owners, Schemas, OpenAPI, MDX Components and more...</h4>

[![MIT License][license-badge]][license]
[![PRs Welcome][prs-badge]][prs]
[![All Contributors](https://img.shields.io/badge/all_contributors-37-orange.svg?style=flat-square)](#contributors-)

[Read the Docs](https://eventcatalog.dev/) | [Edit the Docs](https://github.com/event-catalog/docs) | [View Demo](https://demo.eventcatalog.dev/docs)

</div>

<hr/>

# Core Features

- 📃 Document domains, services and messages ([demo](https://demo.eventcatalog.dev/docs))
- 📊 Visualise your architecture ([demo](https://demo.eventcatalog.dev/visualiser))
- ⭐ Supports any Schema format (e.g Avro, JSON) ([demo](https://demo.eventcatalog.dev/docs/events/InventoryAdjusted/0.0.4))
- 🗂️ Document any code examples (Any code snippet)
- 💅 Custom MDX components ([read more](https://eventcatalog.dev/docs/development/components/using-components))
- 🗄️ Version domains, services and messages
- ⭐ Discoverability feature (search, filter and more) ([demo](https://demo.eventcatalog.dev/discover/events))
- ⭐ Document teams and users ([demo](https://demo.eventcatalog.dev/docs/teams/full-stack))
- ⭐ And much more...


# The problem

Event-driven architectures are becoming more popular, giving us the ability to write decoupled architectures and use messages as away to communicate between domains/teams.

When starting with event-driven architectures you may have a handful of services and messages. As this scales with your team and organization it becomes very hard to manage and govern this.

Over a period of time more events are added to our domain, requirements change, and our architecture scales.

As more domains, services or messages get added to our architecture they can be hard for teams to discover and explore.

Many teams ignore documentation and governance and end up in a [sea of complexity (watch the talk here)](https://www.youtube.com/watch?v=VLUvfIm9wnQ&t=1s) .

**EventCatalog was built to help document your event-driven architectures and help your teams explore and understand events, schemas and much more.**

Read more on these blogposts and videos:

- [Introducing EventCatalog v2 (2024)](https://eventcatalog.dev/blog/eventcatalog-v2)
- [Introducing EventCatalog v1 (2022)](https://www.boyney.io/blog/2022-01-11-introducing-eventcatalog)
- [Event-Driven Architecture: Beyond the Schema Registry (blog)](https://www.boyney.io/blog/2021-12-05-documenting-events)
- [Complexity is the Gotcha of Event-driven Architecture (VIDEO) by David Boyne](https://www.youtube.com/watch?v=VLUvfIm9wnQ&t=1s)

# This solution

Think of EventCatalog as a website generator that allows you to document your event architectures powered by markdown.

EventCatalog is focused on discovery and documentation and allows you to:

- Document Domains/Services/Messages/Schemas/Code Examples and more...
- Visually shows relationships between upstream/downstream services using your Events
- Allows you to version your documentation and supports changelogs
- Add owners to domains,services and messages so your teams know who owns which parts of your domain
- And much more...

EventCatalog is technology agnostic, which means you can integrate your Catalog with any EDA technology of your choice and any schema formats.

EventCatalog supports a [Plugin Architecture](https://eventcatalog-website-v2.vercel.app/docs/development/plugins/plugin-overview) which will let you generate documentation from your systems.

You can read more on [how it works on the website](https://eventcatalog.dev)

# Getting Started

You should be able to get setup within minutes if you head over to our documentation to get started 👇

➡️ [Get Started](https://eventcatalog-website-v2.vercel.app/docs/development/getting-started/installation)

Or run this command to build a new catalog

```
npx @eventcatalog/create-eventcatalog@latest my-catalog
```

# Demo

Here is an example of a Retail system using domains, services and messages.

[demo.eventcatalog.dev](https://demo.eventcatalog.dev)

You can see the markdown files that generated the website in the GitHub repo under [examples](/examples).

# Enterprise support

Interested in collaborating with us? Our offerings include dedicated support, priority assistance, feature development, custom integrations, and more.

Find more details on our [enterprise plan](https://eventcatalog.dev/enterprise).

# Looking for v1?

- Documentation: https://v1.eventcatalog.dev
- Code: https://github.com/event-catalog/eventcatalog/tree/v1

_Still using v1 of EventCatalog? We recommnded upgrading to the latest version. [Read more in the migration guide](https://eventcatalog.dev/docs/development/guides/upgrading-from-version-1)._


# Contributing

If you have any questions, features or issues please raise any issue or pull requests you like. We will try my best to get back to you.

You can find the [contributing guidelines here](https://eventcatalog.dev/docs/contributing/overview).

[license-badge]: https://img.shields.io/github/license/event-catalog/eventcatalog.svg?color=yellow
[license]: https://github.com/event-catalog/eventcatalog/blob/main/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[github-watch-badge]: https://img.shields.io/github/watchers/event-catalog/eventcatalog.svg?style=social
[github-watch]: https://github.com/event-catalog/eventcatalog/watchers
[github-star-badge]: https://img.shields.io/github/stars/event-catalog/eventcatalog.svg?style=social
[github-star]: https://github.com/event-catalog/eventcatalog/stargazers

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://boyney.io/"><img src="https://avatars.githubusercontent.com/u/3268013?v=4?s=100" width="100px;" alt="David Boyne"/><br /><sub><b>David Boyne</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=boyney123" title="Code">💻</a> <a href="#content-boyney123" title="Content">🖋</a> <a href="#design-boyney123" title="Design">🎨</a> <a href="#example-boyney123" title="Examples">💡</a> <a href="#ideas-boyney123" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/event-catalog/eventcatalog/commits?author=boyney123" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://otbe.io"><img src="https://avatars.githubusercontent.com/u/3391052?v=4?s=100" width="100px;" alt="Benjamin Otto"/><br /><sub><b>Benjamin Otto</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=otbe" title="Code">💻</a> <a href="#ideas-otbe" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/event-catalog/eventcatalog/commits?author=otbe" title="Documentation">📖</a> <a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3Aotbe" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pongz79"><img src="https://avatars.githubusercontent.com/u/250872?v=4?s=100" width="100px;" alt="Tiago Oliveira"/><br /><sub><b>Tiago Oliveira</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=pongz79" title="Documentation">📖</a> <a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3Apongz79" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.bigjump.com/"><img src="https://avatars.githubusercontent.com/u/11387911?v=4?s=100" width="100px;" alt="Jay McGuinness"/><br /><sub><b>Jay McGuinness</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=jaymcguinness" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/davidkpiano"><img src="https://avatars.githubusercontent.com/u/1093738?v=4?s=100" width="100px;" alt="David Khourshid"/><br /><sub><b>David Khourshid</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=davidkpiano" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/thim81"><img src="https://avatars.githubusercontent.com/u/952446?v=4?s=100" width="100px;" alt="thim81"/><br /><sub><b>thim81</b></sub></a><br /><a href="#ideas-thim81" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3Athim81" title="Bug reports">🐛</a> <a href="https://github.com/event-catalog/eventcatalog/commits?author=thim81" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Muthuveerappanv"><img src="https://avatars.githubusercontent.com/u/33663725?v=4?s=100" width="100px;" alt="Muthu"/><br /><sub><b>Muthu</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3AMuthuveerappanv" title="Bug reports">🐛</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tavelli"><img src="https://avatars.githubusercontent.com/u/484951?v=4?s=100" width="100px;" alt="Dan Tavelli"/><br /><sub><b>Dan Tavelli</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=tavelli" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/steppi91"><img src="https://avatars.githubusercontent.com/u/25939641?v=4?s=100" width="100px;" alt="steppi91"/><br /><sub><b>steppi91</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=steppi91" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/PipoPeperoni"><img src="https://avatars.githubusercontent.com/u/1152805?v=4?s=100" width="100px;" alt="Donald Pipowitch"/><br /><sub><b>Donald Pipowitch</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3Adonaldpipowitch" title="Bug reports">🐛</a> <a href="https://github.com/event-catalog/eventcatalog/commits?author=donaldpipowitch" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://unravelled.dev"><img src="https://avatars.githubusercontent.com/u/2233210?v=4?s=100" width="100px;" alt="Ken"/><br /><sub><b>Ken</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=kzhen" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://rtoro.cl"><img src="https://avatars.githubusercontent.com/u/5186897?v=4?s=100" width="100px;" alt="Rodolfo Toro"/><br /><sub><b>Rodolfo Toro</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=rtoro" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://blog.hackedbrain.com"><img src="https://avatars.githubusercontent.com/u/284152?v=4?s=100" width="100px;" alt="Drew Marsh"/><br /><sub><b>Drew Marsh</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=drub0y" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dpwdec"><img src="https://avatars.githubusercontent.com/u/51292634?v=4?s=100" width="100px;" alt="Dec Kolakowski"/><br /><sub><b>Dec Kolakowski</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=dpwdec" title="Code">💻</a> <a href="https://github.com/event-catalog/eventcatalog/commits?author=dpwdec" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dytyniuk"><img src="https://avatars.githubusercontent.com/u/1890615?v=4?s=100" width="100px;" alt="Yevhenii Dytyniuk"/><br /><sub><b>Yevhenii Dytyniuk</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=dytyniuk" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lcsbltm"><img src="https://avatars.githubusercontent.com/u/25868958?v=4?s=100" width="100px;" alt="lcsbltm"/><br /><sub><b>lcsbltm</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=lcsbltm" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://matt.martz.codes"><img src="https://avatars.githubusercontent.com/u/978362?v=4?s=100" width="100px;" alt="Matt Martz"/><br /><sub><b>Matt Martz</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=martzcodes" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/michelgrootjans"><img src="https://avatars.githubusercontent.com/u/345770?v=4?s=100" width="100px;" alt="Michel Grootjans"/><br /><sub><b>Michel Grootjans</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=michelgrootjans" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/arturoabruzzini"><img src="https://avatars.githubusercontent.com/u/17528406?v=4?s=100" width="100px;" alt="Arturo Abruzzini"/><br /><sub><b>Arturo Abruzzini</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=arturoabruzzini" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/adlecluse"><img src="https://avatars.githubusercontent.com/u/13390934?v=4?s=100" width="100px;" alt="Ad L'Ecluse"/><br /><sub><b>Ad L'Ecluse</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=adlecluse" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rafaelrenanpacheco"><img src="https://avatars.githubusercontent.com/u/12160864?v=4?s=100" width="100px;" alt="Rafael Renan Pacheco"/><br /><sub><b>Rafael Renan Pacheco</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=rafaelrenanpacheco" title="Code">💻</a> <a href="https://github.com/event-catalog/eventcatalog/commits?author=rafaelrenanpacheco" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://ldiego73.github.io/"><img src="https://avatars.githubusercontent.com/u/394222?v=4?s=100" width="100px;" alt="Luis Diego"/><br /><sub><b>Luis Diego</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=ldiego73" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/danielruf/"><img src="https://avatars.githubusercontent.com/u/827205?v=4?s=100" width="100px;" alt="Daniel Ruf"/><br /><sub><b>Daniel Ruf</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=DanielRuf" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/frenkan"><img src="https://avatars.githubusercontent.com/u/859840?v=4?s=100" width="100px;" alt="Fredrik Johansson"/><br /><sub><b>Fredrik Johansson</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=frenkan" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://gaddam1987.github.io/"><img src="https://avatars.githubusercontent.com/u/2576375?v=4?s=100" width="100px;" alt="Naresh Kumar Reddy Gaddam"/><br /><sub><b>Naresh Kumar Reddy Gaddam</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=gaddam1987" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dremonkey"><img src="https://avatars.githubusercontent.com/u/480159?v=4?s=100" width="100px;" alt="Andre Deutmeyer"/><br /><sub><b>Andre Deutmeyer</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=dremonkey" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pebbz"><img src="https://avatars.githubusercontent.com/u/1685464?v=4?s=100" width="100px;" alt="Pebbz"/><br /><sub><b>Pebbz</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=pebbz" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://alexander.holbreich.org/"><img src="https://avatars.githubusercontent.com/u/16252784?v=4?s=100" width="100px;" alt="Alexander Holbreich"/><br /><sub><b>Alexander Holbreich</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=aholbreich" title="Documentation">📖</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.josedelgadoing.com/"><img src="https://avatars.githubusercontent.com/u/30370263?v=4?s=100" width="100px;" alt="José Delgado"/><br /><sub><b>José Delgado</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=jslim" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jlee-spt"><img src="https://avatars.githubusercontent.com/u/135801616?v=4?s=100" width="100px;" alt="jlee-spt"/><br /><sub><b>jlee-spt</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=jlee-spt" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kimrejstrom"><img src="https://avatars.githubusercontent.com/u/26428365?v=4?s=100" width="100px;" alt="Kim Rejström"/><br /><sub><b>Kim Rejström</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=kimrejstrom" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cgabard"><img src="https://avatars.githubusercontent.com/u/6103932?v=4?s=100" width="100px;" alt="Christophe Gabard"/><br /><sub><b>Christophe Gabard</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=cgabard" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.waydotnet.com"><img src="https://avatars.githubusercontent.com/u/197466?v=4?s=100" width="100px;" alt="Carlo Bertini"/><br /><sub><b>Carlo Bertini</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=WaYdotNET" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dreglad"><img src="https://avatars.githubusercontent.com/u/50302?v=4?s=100" width="100px;" alt="David Regla"/><br /><sub><b>David Regla</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=dreglad" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blogdomarcioweb.wordpress.com/"><img src="https://avatars.githubusercontent.com/u/6377735?v=4?s=100" width="100px;" alt="Marcio Vinicius"/><br /><sub><b>Marcio Vinicius</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=marciovmartins" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/danielcastill0"><img src="https://avatars.githubusercontent.com/u/40574235?v=4?s=100" width="100px;" alt="Daniel Andres Castillo Ardila"/><br /><sub><b>Daniel Andres Castillo Ardila</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=danielcastill0" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.ennovative-solutions.be"><img src="https://avatars.githubusercontent.com/u/2007116?v=4?s=100" width="100px;" alt="Baerten Dennis"/><br /><sub><b>Baerten Dennis</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=debae" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ryancormack"><img src="https://avatars.githubusercontent.com/u/1962883?v=4?s=100" width="100px;" alt="Ryan Cormack"/><br /><sub><b>Ryan Cormack</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=ryancormack" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://natee.biz"><img src="https://avatars.githubusercontent.com/u/4300215?v=4?s=100" width="100px;" alt="Nathan Birrell"/><br /><sub><b>Nathan Birrell</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=nathanbirrell" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

# Sponsor

Using EventCatalog and want to give back? We would love your support.

You can find more [details on our website](https://eventcatalog.dev/support).



# License

MIT.