// React components
import Schema from '@components/MDX/Schema';
import File from '@components/MDX/File';
import Accordion from '@components/MDX/Accordion/Accordion.astro';
import AccordionGroup from '@components/MDX/Accordion/AccordionGroup.astro';
import Flow from '@components/MDX/Flow/Flow.astro';
import Admonition from '@components/MDX/Admonition';
import OpenAPI from '@components/MDX/OpenAPI/OpenAPI.astro';
import AsyncAPI from '@components/MDX/AsyncAPI/AsyncAPI.astro';

//  Portals: required for server/client components
import NodeGraphPortal from '@components/MDX/NodeGraph/NodeGraphPortal';
import SchemaViewerPortal from '@components/MDX/SchemaViewer/SchemaViewerPortal';

const components = (props: any) => {
  return {
    Accordion,
    AccordionGroup,
    Flow,
    OpenAPI,
    AsyncAPI,
    Admonition: (mdxProp: any) => <Admonition {...mdxProp} {...props} />,
    File: (mdxProp: any) => File({ ...props, ...mdxProp }),
    NodeGraph: (mdxProp: any) => NodeGraphPortal({ ...props.data, ...mdxProp }),
    SchemaViewer: (mdxProp: any) => SchemaViewerPortal({ ...props.data, ...mdxProp }),
    Schema: (mdxProp: any) => Schema({ ...props, ...mdxProp }),
  };
};

export default components;
