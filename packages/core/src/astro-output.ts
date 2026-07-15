export const createAstroLineFilter = () => {
  return (line: string) => {
    const isIgnoredGetStaticPathsWarning = line.includes('[router]') && line.includes('getStaticPaths() ignored in dynamic page');

    return (
      line.includes('[glob-loader]') ||
      isIgnoredGetStaticPathsWarning ||
      /^\s*The collection ".*" does not exist or is empty\. Please check your content config file for errors\.\s*$/.test(line)
    );
  };
};

export const createAstroDevLineFilter = () => {
  const shouldFilterAstroLine = createAstroLineFilter();

  return (line: string) => {
    return shouldFilterAstroLine(line) || line.includes('[router]');
  };
};
