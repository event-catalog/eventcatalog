// Should really only be used on the server side
// If users are using path or fs in the eventcatalog.config.js file, it will break the build (for now)

import config from '@config';

export const getConfigurationForGivenGenerator = (generator: string) => {
  const generators = config.generators ?? [];
  const generatorConfig = generators.find((g: any) => g[0] === generator);
  return generatorConfig?.[1];
};
