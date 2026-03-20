<div align="center">

<img width="745" alt="EventCatalog" src="./images/example.png" />

<h1>📖 EventCatalog</h1>

<p align="center">
  <strong>The architecture catalog for distributed systems</strong>
  <br/>
  Document events, services, domains & flows with AI-powered discovery
  <br/><br/>
</p>

[![main](https://github.com/event-catalog/eventcatalog/actions/workflows/verify-build.yml/badge.svg)](https://github.com/event-catalog/eventcatalog/actions/workflows/verify-build.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/event-catalog/eventcatalog/blob/main/LICENSE)
[![npm version](https://badge.fury.io/js/@eventcatalog%2Fcore.svg)](https://badge.fury.io/js/@eventcatalog/core)
[![All Contributors](https://img.shields.io/badge/all_contributors-69-orange.svg?style=flat-square)](#contributors-)

[Documentation](https://www.eventcatalog.dev/docs) | [Demo](https://demo.eventcatalog.dev) | [Discord](https://discord.gg/3rjaZMmrAm)

</div>

---

## 🚀 Quick Start

```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog
```

Looking for help? Start with our [Getting Started](https://www.eventcatalog.dev/docs/development/getting-started/installation) guide.

---

## ✨ Features

- **🤖 AI-Native Discovery** - MCP Server integration, semantic search, auto-documentation
- **📊 Visual Documentation** - Beautiful node graphs, flows, and architecture diagrams
- **🔄 Multi-Platform** - Kafka, EventBridge, RabbitMQ, SNS/SQS, and more
- **🔐 Enterprise Ready** - OAuth2, RBAC, schema governance, breaking change detection
- **🎨 Customizable** - Themes, custom MDX components, configurable layouts
- **📦 15+ Generators** - OpenAPI, AsyncAPI, AWS, Confluent, Kafka, and more

---

## 📦 Monorepo Structure

EventCatalog is organized as a Turborepo monorepo:

- **[@eventcatalog/core](./eventcatalog)** - Main catalog application (Astro + React)
- **[@eventcatalog/sdk](./packages/sdk)** - Node.js SDK for programmatic catalog management
- **[@eventcatalog/create-eventcatalog](./packages/create-eventcatalog)** - CLI scaffolding tool

---

## 🎯 Why EventCatalog?

**vs. Generic Documentation Tools**
- ✅ Purpose-built for distributed systems and event-driven architectures
- ✅ AI-powered discovery and semantic search
- ✅ Schema governance with breaking change detection

**vs. Vendor-Specific Tools**
- ✅ Platform-agnostic (works with any broker/platform)
- ✅ Vendor-neutral (avoid lock-in)
- ✅ Open source with commercial support

**vs. Service Catalogs**
- ✅ 5 minutes to value vs 6+ months implementation
- ✅ Event-driven architecture depth, not generic breadth
- ✅ Runtime discovery from traffic analysis

---

## 🌍 Demos

See EventCatalog in action:

- [Finance System](https://eventcatalog-examples-finance.vercel.app/)
- [Healthcare System](https://eventcatalog-examples-healthcare.vercel.app/)
- [E-Commerce System](https://demo.eventcatalog.dev/)
- [SaaS System](https://eventcatalog-examples-saas.vercel.app/)

---

## 📚 Documentation

Visit our [official documentation](https://www.eventcatalog.dev/docs/development/getting-started) to learn more.

---

## 💬 Support

Having trouble? Get help in the official [EventCatalog Discord](https://discord.gg/3rjaZMmrAm).

---

## 🤝 Contributing

We welcome contributions! See our [contributing guidelines](https://eventcatalog.dev/docs/contributing/overview) to get started.

---

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
      <td align="center" valign="top" width="14.28%"><a href="https://www.jacktomlinson.co.uk/"><img src="https://avatars.githubusercontent.com/u/15871032?v=4?s=100" width="100px;" alt="Jack Tomlinson"/><br /><sub><b>Jack Tomlinson</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=jacktomlinson" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/carlosallexandre"><img src="https://avatars.githubusercontent.com/u/20143946?v=4?s=100" width="100px;" alt="Carlos Rodrigues"/><br /><sub><b>Carlos Rodrigues</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=carlosallexandre" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/XaaXaaX"><img src="https://avatars.githubusercontent.com/u/13409925?v=4?s=100" width="100px;" alt="omid eidivandi"/><br /><sub><b>omid eidivandi</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=XaaXaaX" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hpatoio"><img src="https://avatars.githubusercontent.com/u/249948?v=4?s=100" width="100px;" alt="Simone Fumagalli"/><br /><sub><b>Simone Fumagalli</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=hpatoio" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/d-o-h"><img src="https://avatars.githubusercontent.com/u/23699653?v=4?s=100" width="100px;" alt="d-o-h"/><br /><sub><b>d-o-h</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=d-o-h" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://pallares.io"><img src="https://avatars.githubusercontent.com/u/1077520?v=4?s=100" width="100px;" alt="Cristian Pallarés"/><br /><sub><b>Cristian Pallarés</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=skyrpex" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SebasRendon12"><img src="https://avatars.githubusercontent.com/u/69688183?v=4?s=100" width="100px;" alt="Sebastian Rendon"/><br /><sub><b>Sebastian Rendon</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=SebasRendon12" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://craig0990.co.uk"><img src="https://avatars.githubusercontent.com/u/461897?v=4?s=100" width="100px;" alt="Craig Roberts"/><br /><sub><b>Craig Roberts</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=craig0990" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vertygo"><img src="https://avatars.githubusercontent.com/u/1658326?v=4?s=100" width="100px;" alt="Ivan Milosavljevic"/><br /><sub><b>Ivan Milosavljevic</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=Vertygo" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Mezzle"><img src="https://avatars.githubusercontent.com/u/570639?v=4?s=100" width="100px;" alt="Martin Meredith"/><br /><sub><b>Martin Meredith</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=Mezzle" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/ruudwelling/"><img src="https://avatars.githubusercontent.com/u/4014179?v=4?s=100" width="100px;" alt="Ruud Welling"/><br /><sub><b>Ruud Welling</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=WellingR" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/vienin"><img src="https://avatars.githubusercontent.com/u/2124283?v=4?s=100" width="100px;" alt="Kevin Pouget"/><br /><sub><b>Kevin Pouget</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=vienin" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/VitaliiBalash"><img src="https://avatars.githubusercontent.com/u/4520809?v=4?s=100" width="100px;" alt="Vitalii Balash"/><br /><sub><b>Vitalii Balash</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=VitaliiBalash" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ababilone"><img src="https://avatars.githubusercontent.com/u/925013?v=4?s=100" width="100px;" alt="Arnaud Babilone"/><br /><sub><b>Arnaud Babilone</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=ababilone" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alexanderhorner"><img src="https://avatars.githubusercontent.com/u/18349361?v=4?s=100" width="100px;" alt="Alexander Horner"/><br /><sub><b>Alexander Horner</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=alexanderhorner" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/simonwfarrow"><img src="https://avatars.githubusercontent.com/u/3245908?v=4?s=100" width="100px;" alt="simonwfarrow"/><br /><sub><b>simonwfarrow</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=simonwfarrow" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/augusto-romero-arango"><img src="https://avatars.githubusercontent.com/u/142316821?v=4?s=100" width="100px;" alt="Augusto Romero Arango"/><br /><sub><b>Augusto Romero Arango</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=augusto-romero-arango" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cc-stjm"><img src="https://avatars.githubusercontent.com/u/47748595?v=4?s=100" width="100px;" alt="cc-stjm"/><br /><sub><b>cc-stjm</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=cc-stjm" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/lucianlature/"><img src="https://avatars.githubusercontent.com/u/24992?v=4?s=100" width="100px;" alt="Lucian Lature"/><br /><sub><b>Lucian Lature</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3Alucianlature" title="Bug reports">🐛</a> <a href="https://github.com/event-catalog/eventcatalog/commits?author=lucianlature" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/villAsh"><img src="https://avatars.githubusercontent.com/u/50195101?v=4?s=100" width="100px;" alt="Vilas Chauvhan"/><br /><sub><b>Vilas Chauvhan</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=villAsh" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mrerichoffman"><img src="https://avatars.githubusercontent.com/u/7565432?v=4?s=100" width="100px;" alt="Eric Hoffman"/><br /><sub><b>Eric Hoffman</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3Amrerichoffman" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wimhaesen-kine"><img src="https://avatars.githubusercontent.com/u/231914377?v=4?s=100" width="100px;" alt="wimhaesen-kine"/><br /><sub><b>wimhaesen-kine</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=wimhaesen-kine" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.ondrejmusil.cz"><img src="https://avatars.githubusercontent.com/u/959390?v=4?s=100" width="100px;" alt="Ondrej Musil"/><br /><sub><b>Ondrej Musil</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3Afreaz" title="Bug reports">🐛</a> <a href="#ideas-freaz" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anatolybolshakov"><img src="https://avatars.githubusercontent.com/u/8779682?v=4?s=100" width="100px;" alt="Anatoly Bolshakov"/><br /><sub><b>Anatoly Bolshakov</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=anatolybolshakov" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/reisingerf"><img src="https://avatars.githubusercontent.com/u/31906163?v=4?s=100" width="100px;" alt="reisingerf"/><br /><sub><b>reisingerf</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=reisingerf" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jbarette-rossel"><img src="https://avatars.githubusercontent.com/u/162966566?v=4?s=100" width="100px;" alt="Jonathan Barette"/><br /><sub><b>Jonathan Barette</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=jbarette-rossel" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mumundum"><img src="https://avatars.githubusercontent.com/u/196062898?v=4?s=100" width="100px;" alt="mumundum"/><br /><sub><b>mumundum</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=mumundum" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.argonus.tech"><img src="https://avatars.githubusercontent.com/u/9743549?v=4?s=100" width="100px;" alt="Piotr Rybarczyk"/><br /><sub><b>Piotr Rybarczyk</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3AArgonus" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ZakaryaCH"><img src="https://avatars.githubusercontent.com/u/45012800?v=4?s=100" width="100px;" alt="ZakaryaCH"/><br /><sub><b>ZakaryaCH</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3AZakaryaCH" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jboeijenga"><img src="https://avatars.githubusercontent.com/u/1516438?v=4?s=100" width="100px;" alt="Jasper Boeijenga"/><br /><sub><b>Jasper Boeijenga</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=jboeijenga" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://kirkdesigns.co.uk"><img src="https://avatars.githubusercontent.com/u/200251?v=4?s=100" width="100px;" alt="Tom Kirkpatrick"/><br /><sub><b>Tom Kirkpatrick</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=mrfelton" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Machul84126"><img src="https://avatars.githubusercontent.com/u/128227109?v=4?s=100" width="100px;" alt="Machul"/><br /><sub><b>Machul</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/issues?q=author%3AMachul84126" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ugostack"><img src="https://avatars.githubusercontent.com/u/81093728?v=4?s=100" width="100px;" alt="ugostack"/><br /><sub><b>ugostack</b></sub></a><br /><a href="https://github.com/event-catalog/eventcatalog/commits?author=ugostack" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

---

## 📄 License

MIT.
