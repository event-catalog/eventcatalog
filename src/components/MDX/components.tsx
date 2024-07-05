// Astro components

// React components
import Schema from '@components/MDX/Schema';
import File from '@components/MDX/File';
import Accordion from '@components/MDX/Accordion/Accordion.astro';
import AccordionGroup from '@components/MDX/Accordion/AccordionGroup.astro';
import Admonition from '@components/MDX/Admonition';
import NodeGraphPortal from '@components/MDX/NodeGraph/NodeGraphPortal';
import OpenAPI from '@components/MDX/OpenAPI/OpenAPI';

const components = (props: any) => {
  return {
    AccordionGroup,
    Accordion,
    OpenAPI: (mdxProp: any) => <OpenAPI {...mdxProp} {...props} />,
    Admonition: (mdxProp: any) => <Admonition {...mdxProp} {...props} />,
    File: (mdxProp: any) => File({ ...props, ...mdxProp }),
    Schema: (mdxProp: any) => Schema({ ...props, ...mdxProp }),
    NodeGraph: (mdxProp: any) => NodeGraphPortal({ ...props.data, ...mdxProp }),
  };
};

export default components;
