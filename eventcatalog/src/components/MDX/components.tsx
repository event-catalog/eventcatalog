// React components
import Schema from '@components/MDX/Schema.astro';
import File from '@components/MDX/File';
import Accordion from '@components/MDX/Accordion/Accordion.astro';
import AccordionGroup from '@components/MDX/Accordion/AccordionGroup.astro';
import Flow from '@components/MDX/Flow/Flow.astro';
import Tiles from '@components/MDX/Tiles/Tiles.astro';
import Tile from '@components/MDX/Tiles/Tile.astro';
import Steps from '@components/MDX/Steps/Steps.astro';
import Step from '@components/MDX/Steps/Step.astro';
import Admonition from '@components/MDX/Admonition';
import OpenAPI from '@components/MDX/OpenAPI/OpenAPI.astro';
import AsyncAPI from '@components/MDX/AsyncAPI/AsyncAPI.astro';
import ChannelInformation from '@components/MDX/ChannelInformation/ChannelInformation';
import Tabs from '@components/MDX/Tabs/Tabs.astro';
import TabItem from '@components/MDX/Tabs/TabItem.astro';

//  Portals: required for server/client components
import NodeGraphPortal from '@components/MDX/NodeGraph/NodeGraphPortal';
import SchemaViewerPortal from '@components/MDX/SchemaViewer/SchemaViewerPortal';
import { jsx } from 'astro/jsx-runtime';

const components = (props: any) => {
  return {
    Accordion,
    AccordionGroup,
    Flow,
    OpenAPI,
    AsyncAPI,
    Tile,
    Tiles,
    Step,
    Steps,
    Tabs,
    TabItem,
    Admonition: (mdxProp: any) => <Admonition {...mdxProp} {...props} />,
    File: (mdxProp: any) => File({ ...props, ...mdxProp }),
    NodeGraph: (mdxProp: any) => NodeGraphPortal({ ...props.data, ...mdxProp }),
    ChannelInformation: (mdxProp: any) => ChannelInformation({ ...props.data, ...mdxProp }),
    SchemaViewer: (mdxProp: any) => SchemaViewerPortal({ ...props.data, ...mdxProp }),
    Schema: (mdxProp: any) => jsx(Schema, { ...props, ...mdxProp }),
  };
};

export default components;
