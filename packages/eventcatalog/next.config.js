// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require('./eventcatalog.config');

module.exports = {  
  staticPageGenerationTimeout: parseInt(process.env.STATIC_PAGE_GENERATION_TIMEOUT || '60', 10), // Use an environment variable or use the default to 60 seconds.
  reactStrictMode: true,
  basePath: config.basePath,
  trailingSlash: config.trailingSlash,
  publicRuntimeConfig: {
    basePath: config.basePath,
  },
};
