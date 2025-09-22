// React components
import Schema from '@components/MDX/Schema.astro';
import File from '@components/MDX/File';
import Accordion from '@components/MDX/Accordion/Accordion.astro';
import AccordionGroup from '@components/MDX/Accordion/AccordionGroup.astro';
import Flow from '@components/MDX/Flow/Flow.astro';
import EntityMap from '@components/MDX/EntityMap/EntityMap.astro';
import Tiles from '@components/MDX/Tiles/Tiles.astro';
import Tile from '@components/MDX/Tiles/Tile.astro';
import Steps from '@components/MDX/Steps/Steps.astro';
import Step from '@components/MDX/Steps/Step.astro';
import Admonition from '@components/MDX/Admonition';
import OpenAPI from '@components/MDX/OpenAPI/OpenAPI.astro';
import AsyncAPI from '@components/MDX/AsyncAPI/AsyncAPI.astro';
import ChannelInformation from '@components/MDX/ChannelInformation/ChannelInformation';
import Attachments from '@components/MDX/Attachments.astro';
import MessageTable from '@components/MDX/MessageTable/MessageTable.astro';
import ResourceGroupTable from '@components/MDX/ResourceGroupTable/ResourceGroupTable.astro';
import EntityPropertiesTable from '@components/MDX/EntityPropertiesTable/EntityPropertiesTable.astro';
import Tabs from '@components/MDX/Tabs/Tabs.astro';
import TabItem from '@components/MDX/Tabs/TabItem.astro';
import ResourceLink from '@components/MDX/ResourceLink/ResourceLink.astro';
import Link from '@components/MDX/Link/Link.astro';
import Miro from '@components/MDX/Miro/Miro.astro';
import Lucid from '@components/MDX/Lucid/Lucid.astro';
import DrawIO from '@components/MDX/DrawIO/DrawIO.astro';
import FigJam from '@components/MDX/FigJam/FigJam.astro';
import Design from '@components/MDX/Design/Design.astro';
import MermaidFileLoader from '@components/MDX/MermaidFileLoader/MermaidFileLoader.astro';
//  Portals: required for server/client components
import NodeGraphPortal from '@components/MDX/NodeGraph/NodeGraphPortal';
import SchemaViewerPortal from '@components/MDX/SchemaViewer/SchemaViewerPortal';
import { jsx } from 'astro/jsx-runtime';
import RemoteSchema from '@components/MDX/RemoteSchema.astro';

const components = (props: any) => {
  return {
    Attachments: (mdxProp: any) => jsx(Attachments, { ...props, ...mdxProp }),
    Accordion,
    AccordionGroup,
    Admonition,
    AsyncAPI,
    ChannelInformation: (mdxProp: any) => ChannelInformation({ ...props.data, ...mdxProp }),
    Design: (mdxProp: any) => jsx(Design, { ...props, ...mdxProp }),
    File: (mdxProp: any) => File({ ...props, ...mdxProp }),
    RemoteSchema,
    Flow,
    Link: (mdxProp: any) => jsx(Link, { ...props, ...mdxProp }),
    MessageTable: (mdxProp: any) => jsx(MessageTable, { ...props, ...mdxProp }),
    EntityPropertiesTable: (mdxProp: any) => jsx(EntityPropertiesTable, { ...props, ...mdxProp }),
    NodeGraph: (mdxProp: any) => jsx(NodeGraphPortal, { ...props.data, ...mdxProp, props, mdxProp }),
    EntityMap: (mdxProp: any) => jsx(EntityMap, { ...props, ...mdxProp }),
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
    Miro: (mdxProp: any) => jsx(Miro, { ...props, ...mdxProp }),
    Lucid: (mdxProp: any) => jsx(Lucid, { ...props, ...mdxProp }),
    DrawIO: (mdxProp: any) => jsx(DrawIO, { ...props, ...mdxProp }),
    FigJam: (mdxProp: any) => jsx(FigJam, { ...props, ...mdxProp }),
    MermaidFileLoader: (mdxProp: any) => jsx(MermaidFileLoader, { ...props, ...mdxProp }),
  };
};

export default components;
