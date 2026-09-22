import { isIntentionalEmptyCollectionLine } from '../eventcatalog/src/plugins/empty-collection-warning.mjs';

export const createAstroLineFilter = () => {
  return (line: string) => {
    const isIgnoredGetStaticPathsWarning = line.includes('[router]') && line.includes('getStaticPaths() ignored in dynamic page');

    return line.includes('[glob-loader]') || isIgnoredGetStaticPathsWarning || isIntentionalEmptyCollectionLine(line);
  };
};

export const createAstroDevLineFilter = () => {
  const shouldFilterAstroLine = createAstroLineFilter();

  return (line: string) => {
    return shouldFilterAstroLine(line) || line.includes('[router]');
  };
};
