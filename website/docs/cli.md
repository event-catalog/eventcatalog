---
id: cli
---

# CLI

EventCatalog provides a set of scripts to help you generate, serve, and deploy your website.

Once your catalog is bootstrapped, the source will contain the EventCatalog scripts that you can invoke with your package manager:

```json title="package.json"
{
  // ...
  "scripts": {
    "dev": "eventcatalog dev",
    "start": "eventcatalog start",
    "build": "eventcatalog build",
    "generate": "eventcatalog generate",
  }
}
```

## Index {#index}

import TOCInline from "@theme/TOCInline"

<TOCInline toc={toc[1].children}/>

## Docusaurus CLI commands {#docusaurus-cli-commands}

Below is a list of Docusaurus CLI commands and their usages:

### `docusaurus start [siteDir]` {#docusaurus-start-sitedir}

Builds and serves a preview of your site locally with [Webpack Dev Server](https://webpack.js.org/configuration/dev-server).

#### Options {#options}

| Name | Default | Description |
| --- | --- | --- |
| `--port` | `3000` | Specifies the port of the dev server. |
| `--host` | `localhost` | Specify a host to use. For example, if you want your server to be accessible externally, you can use `--host 0.0.0.0`. |
| `--hot-only` | `false` | Enables Hot Module Replacement without page refresh as fallback in case of build failures. More information [here](https://webpack.js.org/configuration/dev-server/#devserverhotonly). |
| `--no-open` | `false` | Do not open automatically the page in the browser. |
| `--config` | `undefined` | Path to docusaurus config file, default to `[siteDir]/docusaurus.config.js` |
| `--poll [optionalIntervalMs]` | `false` | Use polling of files rather than watching for live reload as a fallback in environments where watching doesn't work. More information [here](https://webpack.js.org/configuration/watch/#watchoptionspoll). |

:::important

Please note that some functionality (for example, anchor links) will not work in development. The functionality will work as expected in production.

:::

#### Enabling HTTPS {#enabling-https}

There are multiple ways to obtain a certificate. We will use [mkcert](https://github.com/FiloSottile/mkcert) as an example.

1. Run `mkcert localhost` to generate `localhost.pem` + `localhost-key.pem`

2. Run `mkcert -install` to install the cert in your trust store, and restart your browser

3. Start the app with Docusaurus HTTPS env variables:

```shell
HTTPS=true SSL_CRT_FILE=localhost.pem SSL_KEY_FILE=localhost-key.pem yarn start
```

4. Open `https://localhost:3000/`

### `docusaurus build [siteDir]` {#docusaurus-build-sitedir}

Compiles your site for production.

#### Options {#options-1}

| Name | Default | Description |
| --- | --- | --- |
| `--bundle-analyzer` | `false` | Analyze your bundle with the [webpack bundle analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer). |
| `--out-dir` | `build` | The full path for the new output directory, relative to the current workspace. |
| `--config` | `undefined` | Path to docusaurus config file, default to `[siteDir]/docusaurus.config.js` |
| `--no-minify` | `false` | Build website without minimizing JS/CSS bundles. |
