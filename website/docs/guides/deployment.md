---
sidebar_position: 3
id: deployment
title: Deployment
---  

EventCatalog exports your catalog to static HTML which means **you can deploy your application anywhere you want!**

To build your Catalog you will need to run:

```sh
npm run build
```

This will output two directories

- `out` - Your EventCatalog as Static HTML (recommended to use)
- `.next` - If you wish to deploy to NextJS (NextJS outputs this by default, recommended to use the `out` directory)


### Hosting Options

You can host EventCatalog anywhere you want, as it's just static content.

Here are some guides and places you can host static content

- [Host in AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [Using Netlify to host Static Content](https://www.netlify.com/blog/2016/10/27/a-step-by-step-guide-deploying-a-static-site-or-single-page-app/)
- [Deploy to NextJS](https://nextjs.org/docs/deployment)