const components = {
  a: (mdxProp: any) => <a className="text-primary" {...mdxProp} />,
  h1: (mdxProp: any) => <h1 className="mb-4" {...mdxProp} />,
  h3: (mdxProp: any) => <h3 className="mb-2" {...mdxProp} />,
  p: (mdxProp: any) => <p className="my-3" {...mdxProp} />,
};

export default components;
