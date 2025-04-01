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
import MessageTable from '@components/MDX/MessageTable/MessageTable.astro';
import ResourceGroupTable from '@components/MDX/ResourceGroupTable/ResourceGroupTable.astro';
import Tabs from '@components/MDX/Tabs/Tabs.astro';
import TabItem from '@components/MDX/Tabs/TabItem.astro';
import ResourceLink from '@components/MDX/ResourceLink/ResourceLink.astro';
import Link from '@components/MDX/Link/Link.astro';
//  Portals: required for server/client components
import NodeGraphPortal from '@components/MDX/NodeGraph/NodeGraphPortal';
import SchemaViewerPortal from '@components/MDX/SchemaViewer/SchemaViewerPortal';
import { jsx } from 'astro/jsx-runtime';

const components = (props: any) => {
  return {
    Accordion,
    AccordionGroup,
    Admonition,
    AsyncAPI,
    ChannelInformation: (mdxProp: any) => ChannelInformation({ ...props.data, ...mdxProp }),
    File: (mdxProp: any) => File({ ...props, ...mdxProp }),
    Flow,
    Link: (mdxProp: any) => jsx(Link, { ...props, ...mdxProp }),
    MessageTable: (mdxProp: any) => jsx(MessageTable, { ...props, ...mdxProp }),
    NodeGraph: (mdxProp: any) => jsx(NodeGraphPortal, { ...props.data, ...mdxProp, props, mdxProp }),
    OpenAPI,
    ResourceGroupTable: (mdxProp: any) => jsx(ResourceGroupTable, { ...props, ...mdxProp }),
    ResourceLink: (mdxProp: any) => jsx(ResourceLink, { ...props, ...mdxProp }),
    Schema: (mdxProp: any) => jsx(Schema, { ...props, ...mdxProp }),
    SchemaViewer: (mdxProp: any) => SchemaViewerPortal({ ...props.data, ...mdxProp }),
    Step,
    Steps,
    TabItem,
    Tabs,
    Tile,
    Tiles,
  };
};

export default components;
