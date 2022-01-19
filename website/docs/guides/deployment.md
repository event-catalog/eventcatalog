---
sidebar_position: 3
id: deployment
title: Deployment
---  

EventCatalog uses NextJS under the hood and requires a server to run.

To build the static files of your website for production, run:

```sh
npm run build
```

:::info
EventCatalog uses NextJS and a server to support some enriched features. In the future we hope to add features like the ability to dispatch events from the Catalog (for testing), APIS and much more.

If you want to see your build output it will be in the `.next` directory.

Use `npm start` once you build to start your application.
:::

#### Where does the build output go?

EventCatalog uses NextJS under the hood. When you run `npm run build` your output will go to **`.next`** directory.

Use `npm run start` to start the application.


### Building and Deploying with Docker (recommended)

Out the box EventCatalog will provide you with a `Dockerfile` which is already setup and good to go.

To build your container run:

```sh
docker build -t eventcatalog .
```

Then you can proceed as normal to host your new image/container anywhere you want!


### Other Hosting Options

In your own hosting provider, run the build script once, which builds the production application.

```sh
npm run build
```

After building, the start script starts a Node.js server that supports hybrid pages, serving both statically generated and server-side rendered pages, and API Routes

```sh
npm start
```

Your application will start on port `3000`.
