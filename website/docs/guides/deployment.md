---
sidebar_position: 3
id: deployment
title: Deployment
---  

EventCatalog exports your catalog to static HTML which means **you can deploy your application anywhere you want!**

To build your Catalog you will need to run:

```bash
npm run build
```

This will output two directories

- `out` - Your EventCatalog as Static HTML (recommended to use)
- `.next` - If you wish to deploy to NextJS (NextJS outputs this by default, recommended to use the `out` directory)

If you intend to deploy your catalog not in root of your domain (e.g. *www.abc.com/my-catalog/*) you need to set `basePath: '/my-catalog'` property in the
[`eventcatalog.config.js`](api/eventcatalog.config.js.md) otherwise the output will not look like you would expect.

### Hosting Options

You can host EventCatalog anywhere you want, as it's just static content.

Here are some guides and places you can host static content

- [Host with Docker](#host-with-docker)
- [Host in AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [Using Netlify to host Static Content](https://www.netlify.com/blog/2016/10/27/a-step-by-step-guide-deploying-a-static-site-or-single-page-app/)
- [Deploy to NextJS](https://nextjs.org/docs/deployment)

## Host with Docker

EventCatalog comes with a [DockerFile](https://github.com/boyney123/eventcatalog/blob/master/packages/create-eventcatalog/templates/default/Dockerfile), you can build the image and deploy the container. The container exposes ports `3000`.

To build the docker container you need to run:

```bash
# Builds the container
docker build . eventcatalog

# Runs the container locally
docker run -p 3000:3000 -it eventcatalog
```

## Community blog posts

### [Using AWS CDK to Deploy EventCatalog](https://matt.martz.codes/using-aws-cdk-to-deploy-eventcatalog)

[Matt Martz](https://twitter.com/martzcodes) goes into a [very detailed blog post](https://matt.martz.codes/using-aws-cdk-to-deploy-eventcatalog) on how you can use EventCatalog and implementing **Event Driven Documentation**.

![alt](https://cdn.hashnode.com/res/hashnode/image/upload/v1666473368096/jTQ0lrEnP.png?auto=compress,format&format=webp)

### [Autonomous EventCatalog for documenting EventBridge Events](https://medium.com/@wrennkieran/autonomous-eventcatalog-for-documenting-eventbridge-events-73e6334f2400)

[Kieran Wrenn](https://www.linkedin.com/in/kieran-wrenn-215b1a12b/) gives us an example on how to listen to schema changes, and also deploy EventCatalog on AWS using EventBridge Scheduler. If you want to setup a schedule to deploy or deploy on EventBridge schema changes, then this is worth reading.

![alt](../../static/img/deploy-example.png)

### [How to create an Event Catalog?](https://www.kallemarjokorpi.fi/blog/how-to-create-and-event-catalog.html)

[Kalle Marjokorpi](https://www.kallemarjokorpi.fi/blog/how-to-create-and-event-catalog.html) gives an example of how to build an EventCataog with Azure, EventGrid and EventHub.

![!alt](https://cdn.buttercms.com/5y2OEb07T1e8i0e18PjC)

