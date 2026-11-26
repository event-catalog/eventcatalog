// Method returns MDX components and there props in markdown files
// rarely used, but useful for components that need to know how many times
// the user wants to render a component in a markdown file
export const getMDXComponentsByName = (document: string, componentName: string) => {
  // Define regex pattern to match self-closing MDX components with or without props.
  const pattern = new RegExp(`<${componentName}(\\s+[^>]*)?\\s*\\/>`, 'g');

  // Find all matches of the pattern
  const matches = [...document.matchAll(pattern)];

  // Extract the properties of each SchemaViewer
  const components = matches.map((match) => {
    const propsString = match[1] || '';
    const props = {};

    // Use regex to extract key-value pairs from propsString
    const propsPattern = /(\w+)=["']([^"']+)["']/g;
    let propMatch;
    while ((propMatch = propsPattern.exec(propsString)) !== null) {
      const key = propMatch[1];
      const value = propMatch[2];
      // @ts-ignore
      props[key] = value;
    }

    // Boolean JSX expressions, e.g. legend={true}
    const booleanPropsPattern = /(\w+)=\{\s*(true|false)\s*\}/g;
    while ((propMatch = booleanPropsPattern.exec(propsString)) !== null) {
      // @ts-ignore
      props[propMatch[1]] = propMatch[2] === 'true';
    }

    return props;
  });

  return components;
};

export const parseMdxBooleanProp = (value: unknown, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return value === true || value === 'true';
};
