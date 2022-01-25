---
title: EventCatalog & Static Generation
authors: [dboyne]
tags: [release, feature]
image: /img/blog/deployment/cover.png
---


![cover](/img/blog/deployment/cover.png)

Previously EventCatalog was using parts of NextJS that required a server to run (getServerSideProps) and [NextJS API Route](https://nextjs.org/docs/api-routes/introduction).

One of the top requests from the community was the ability to render EventCatalog as static content rather than having to run a server to host the catalog...


We are happy to announce that EventCatalog now exports static HTML an no longer requires a server to run!

## What does this mean?

When your run `npm run build` on EventCatalog it now bundles your content into static HTML using [NextJS export feature](https://nextjs.org/docs/advanced-features/static-html-export#next-export).

This now means that EventCatalog can be hosted **anywhere** and no longer needs a server to run 🤩.

If you want to learn more you can read [the deployment guide](/docs/guides/deployment).

## What about future features that require a server?

We will see how EventCatalog code evolves, but if we need any features that require a server in the future, we can explore using feature switches and APIs to enable further enrichment of EventCatalog.


## Thanks

Shout out to [@timhaselaars](https://twitter.com/timhaselaars) and [@_otbe_](https://twitter.com/_otbe_) for the ideas and code to help make this possible 🙏.

If you have any problems or further ideas for EventCatalog feel free to [raise an issue](https://github.com/boyney123/eventcatalog/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) or [join our community on discord](https://discord.gg/3rjaZMmrAm).


Enjoy!
