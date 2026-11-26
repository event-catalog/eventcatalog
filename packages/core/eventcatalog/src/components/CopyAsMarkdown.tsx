import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowUpRight, Copy, FileText, Sparkles, ChevronDownIcon, PenSquareIcon, RssIcon } from 'lucide-react';
import React, { Suspense, isValidElement, lazy, useState } from 'react';
import type { Schema } from '@utils/collections/schemas';
import { buildUrl, toMarkdownUrl } from '@utils/url-builder';
import McpIcon from './McpIcon';

const McpConnectDialog = lazy(() => import('./McpConnectDialog'));

// Type allows either a component type (like Lucide icon) or a pre-rendered element (like <img>)
type IconInput = React.ElementType | React.ReactElement;

// Helper component for menu items
const MenuItemContent = ({
  icon: iconProp,
  title,
  description,
  external = false,
}: {
  icon: IconInput;
  title: string;
  description: string;
  external?: boolean;
}) => {
  let iconElement: React.ReactNode;

  if (isValidElement(iconProp)) {
    // It's already a React element (e.g., <img>), render it directly
    iconElement = iconProp;
  } else {
    // It must be an ElementType (component constructor like Lucide icon)
    const IconComponent = iconProp as React.ElementType;
    iconElement = <IconComponent className="h-4 w-4 text-[rgb(var(--ec-page-text-muted))]" />;
  }

  // A plain muted icon, then the title (with an arrow when it opens a new tab) and what it does under it
  return (
    <div className="flex items-start gap-3 px-2.5 py-2">
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">{iconElement}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[13px] font-medium leading-5 text-[rgb(var(--ec-page-text))]">
          <span>{title}</span>
          {external && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--ec-page-text-muted))]" />}
        </div>
        <div className="text-xs leading-4 text-[rgb(var(--ec-page-text-muted))]">{description}</div>
      </div>
    </div>
  );
};

export function CopyPageMenu({
  schemas,
  chatQuery,
  chatEnabled = false,
  editUrl,
  markdownDownloadEnabled = false,
  rssFeedEnabled = false,
  preferChatAsDefault = false,
  chatButtonText = 'Ask',
  mcpServerUrl,
  resourceName,
  mcpResourceType,
}: {
  schemas: Schema[];
  chatQuery?: string;
  chatEnabled: boolean;
  editUrl: string;
  markdownDownloadEnabled: boolean;
  rssFeedEnabled: boolean;
  preferChatAsDefault?: boolean;
  chatButtonText?: string;
  mcpServerUrl?: string;
  resourceName?: string;
  mcpResourceType?: 'domain' | 'system';
}) {
  // Define available actions
  const availableActions = {
    copyMarkdown: markdownDownloadEnabled,
    editPage: !!editUrl,
    copySchemas: schemas.length > 0,
    viewMarkdown: markdownDownloadEnabled,
    chat: chatEnabled,
    rssFeed: rssFeedEnabled,
    mcpServer: Boolean(mcpServerUrl),
  };

  // Check if any actions are available
  const hasAnyActions = Object.values(availableActions).some(Boolean);

  // If no actions are available, return null
  if (!hasAnyActions) {
    return null;
  }

  // get the url of the current page
  const url = window.location.href;
  const markdownUrl = toMarkdownUrl(url);

  // Determine the default action based on what's available
  const getDefaultAction = () => {
    // If chat is preferred and available, make it the default
    if (preferChatAsDefault && availableActions.chat) {
      return {
        type: 'chat',
        text: chatButtonText,
        icon: Sparkles,
      };
    }
    if (availableActions.copyMarkdown) {
      return {
        type: 'copyMarkdown',
        text: 'Copy page',
        icon: Copy,
      };
    }
    if (availableActions.editPage) {
      return {
        type: 'editPage',
        text: 'Edit page',
        icon: PenSquareIcon,
      };
    }
    if (availableActions.copySchemas) {
      return {
        type: 'copySchemas',
        text: 'Copy schema',
        icon: FileText,
      };
    }
    if (availableActions.viewMarkdown) {
      return {
        type: 'viewMarkdown',
        text: 'View Markdown',
        icon: FileText,
      };
    }
    if (availableActions.chat) {
      return {
        type: 'chat',
        text: chatButtonText,
        icon: Sparkles,
      };
    }
    if (availableActions.rssFeed) {
      return {
        type: 'rssFeed',
        text: 'RSS Feed',
        icon: RssIcon,
      };
    }
    if (availableActions.mcpServer) {
      return {
        type: 'mcpServer',
        text: 'Connect to MCP server',
        icon: McpIcon,
      };
    }
    return null;
  };

  const defaultAction = getDefaultAction();
  const [open, setOpen] = useState(false);
  const [buttonText, setButtonText] = useState(defaultAction?.text || 'Action');
  const [copyButtonText, setCopyButtonText] = useState('Copy page as markdown');
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const mcpDialog = mcpServerUrl && mcpDialogOpen && (
    <Suspense fallback={null}>
      <McpConnectDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        serverUrl={mcpServerUrl}
        resourceName={resourceName}
        resourceType={mcpResourceType ?? 'domain'}
      />
    </Suspense>
  );

  // Fetch the markdown from the url + .mdx
  const copyMarkdownToClipboard = async () => {
    console.log('Copying markdown to clipboard');
    try {
      setButtonText('Copied');
      setCopyButtonText('Copied');
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);
      setTimeout(() => setButtonText(defaultAction?.text || 'Action'), 3000); // Revert after 3 seconds
      setTimeout(() => setCopyButtonText('Copy page as markdown'), 3000);
    } catch (error) {
      console.error('Failed to copy markdown:', error);
      setButtonText('Copy failed'); // Provide feedback on failure
      setCopyButtonText('Copy failed');
      setTimeout(() => setButtonText(defaultAction?.text || 'Action'), 3000);
      setTimeout(() => setCopyButtonText('Copy page as markdown'), 3000);
    }
  };

  // Fetch the schema from the schemaURL and copy it to the clipboard
  const copySchemaToClipboard = async (schema: Schema) => {
    if (!schema.url) return; // Should not happen if button is hidden, but good practice

    console.log('Copying schema to clipboard from:', schema.url);
    try {
      setButtonText('Copied Schema');
      const response = await fetch(schema.url); // Use the provided schemaURL directly
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const schemaContent = await response.text(); // Or response.json() if it's always JSON
      await navigator.clipboard.writeText(schemaContent);
      setTimeout(() => setButtonText(defaultAction?.text || 'Action'), 3000); // Revert after 3 seconds
    } catch (error) {
      console.error('Failed to copy schema:', error);
      setButtonText('Copy failed'); // Provide feedback on failure
      setTimeout(() => setButtonText(defaultAction?.text || 'Action'), 3000);
    }
  };

  // Handle the default action based on type
  const handleDefaultAction = () => {
    if (!defaultAction) return;

    switch (defaultAction.type) {
      case 'copyMarkdown':
        copyMarkdownToClipboard();
        break;
      case 'editPage':
        window.open(editUrl, '_blank');
        break;
      case 'copySchemas':
        copySchemaToClipboard(schemas[0]);
        break;
      case 'viewMarkdown':
        window.open(markdownUrl, '_blank');
        break;
      case 'chat':
        // Dispatch custom event to open chat panel instead of navigating
        window.dispatchEvent(new CustomEvent('eventcatalog:open-chat'));
        break;
      case 'mcpServer':
        setMcpDialogOpen(true);
        break;
    }
  };

  if (!defaultAction) {
    return null;
  }

  const mcpDescription = `Connect an MCP client to this ${mcpResourceType ?? 'resource'}`;

  // The menu's groups (only those with something in them, divided by hairlines): the assistant; copying and viewing the
  // page; connecting to it; editing it
  const hasCopyGroup = availableActions.copyMarkdown || availableActions.copySchemas || availableActions.viewMarkdown;
  const hasConnectGroup = availableActions.mcpServer || availableActions.rssFeed;
  const groups = [availableActions.chat, hasCopyGroup, hasConnectGroup, availableActions.editPage];
  const separatorBefore = (index: number) => groups.slice(0, index).some(Boolean) && groups[index];

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      {/* The split button, outlined as Vercel's (and GitBook's): the default action, then the menu */}
      <div className="inline-flex h-8 items-stretch overflow-hidden rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] text-[rgb(var(--ec-page-text))] shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        {/* Left Button: Default Action */}
        <button
          type="button"
          onClick={handleDefaultAction}
          className="inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap bg-transparent pl-2.5 pr-3 text-[13px] font-medium transition-colors duration-150 hover:bg-[rgb(var(--ec-page-text)/0.05)] focus-visible:z-10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--ec-page-text)/0.2)]"
        >
          <defaultAction.icon className="h-3.5 w-3.5 text-[rgb(var(--ec-page-text-muted))]" />
          {buttonText}
        </button>
        {/* Right Button: Dropdown Trigger */}
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-full w-8 items-center justify-center border-l border-[rgb(var(--ec-page-border))] bg-transparent text-[rgb(var(--ec-page-text-muted))] transition-colors duration-150 hover:bg-[rgb(var(--ec-page-text)/0.05)] hover:text-[rgb(var(--ec-page-text))] focus-visible:z-10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgb(var(--ec-page-text)/0.2)]"
            aria-label="More options"
          >
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </DropdownMenu.Trigger>
      </div>

      <DropdownMenu.Content
        className="z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg))] p-1 shadow-[0_4px_8px_-4px_rgb(0_0_0/0.06),0_16px_32px_-8px_rgb(0_0_0/0.16)]"
        sideOffset={8}
        align="end"
      >
        {availableActions.chat && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-lg outline-hidden transition-colors duration-150 data-[highlighted]:bg-[rgb(var(--ec-page-text)/0.05)]"
            onSelect={() => window.dispatchEvent(new CustomEvent('eventcatalog:open-chat'))}
          >
            <MenuItemContent icon={Sparkles} title="EventCatalog Assistant" description="Ask the assistant about this page" />
          </DropdownMenu.Item>
        )}

        {separatorBefore(1) && <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-[rgb(var(--ec-page-border))]" />}
        {availableActions.copyMarkdown && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-lg outline-hidden transition-colors duration-150 data-[highlighted]:bg-[rgb(var(--ec-page-text)/0.05)]"
            onSelect={() => copyMarkdownToClipboard()}
          >
            <MenuItemContent icon={Copy} title="Copy page" description="Copy page as Markdown for LLMs" />
          </DropdownMenu.Item>
        )}

        {availableActions.copySchemas &&
          schemas.map((schema) => {
            const title =
              schema.format === 'asyncapi'
                ? 'Copy AsyncAPI specification'
                : schema.format === 'openapi'
                  ? 'Copy OpenAPI specification'
                  : 'Copy schema';
            const type =
              schema.format === 'asyncapi' || schema.format === 'openapi'
                ? 'specification'
                : `${schema.format.toUpperCase()} schema`;

            const Icon =
              schema.format === 'asyncapi' ? (
                <img src={buildUrl('/icons/asyncapi.svg', true)} className="ec-mono-icon ec-mono-icon--active h-4 w-4" />
              ) : schema.format === 'openapi' ? (
                <img src={buildUrl('/icons/openapi.svg', true)} className="ec-mono-icon ec-mono-icon--active h-4 w-4" />
              ) : (
                FileText
              );

            return (
              <DropdownMenu.Item
                key={schema.url}
                className="cursor-pointer rounded-lg outline-hidden transition-colors duration-150 data-[highlighted]:bg-[rgb(var(--ec-page-text)/0.05)]"
                onSelect={() => copySchemaToClipboard(schema)}
              >
                <MenuItemContent icon={Icon} title={title} description={`Copy ${type} to clipboard`} />
              </DropdownMenu.Item>
            );
          })}

        {availableActions.viewMarkdown && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-lg outline-hidden transition-colors duration-150 data-[highlighted]:bg-[rgb(var(--ec-page-text)/0.05)]"
            onSelect={() => window.open(markdownUrl, '_blank')}
          >
            <MenuItemContent
              icon={FileText}
              title="View as Markdown"
              description="View this page as plain text"
              external={true}
            />
          </DropdownMenu.Item>
        )}

        {separatorBefore(2) && <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-[rgb(var(--ec-page-border))]" />}
        {availableActions.mcpServer && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-lg outline-hidden transition-colors duration-150 data-[highlighted]:bg-[rgb(var(--ec-page-text)/0.05)]"
            onSelect={() => setMcpDialogOpen(true)}
          >
            <MenuItemContent icon={McpIcon} title="Connect with MCP" description={mcpDescription} />
          </DropdownMenu.Item>
        )}

        {availableActions.rssFeed && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-lg outline-hidden transition-colors duration-150 data-[highlighted]:bg-[rgb(var(--ec-page-text)/0.05)]"
            onSelect={() => window.open(buildUrl(`/rss/all/rss.xml`, true), '_blank')}
          >
            <MenuItemContent icon={RssIcon} title="RSS feed" description="Follow changes to the catalog" external={true} />
          </DropdownMenu.Item>
        )}

        {separatorBefore(3) && <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-[rgb(var(--ec-page-border))]" />}
        {availableActions.editPage && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-lg outline-hidden transition-colors duration-150 data-[highlighted]:bg-[rgb(var(--ec-page-text)/0.05)]"
            onSelect={() => window.open(editUrl, '_blank')}
          >
            <MenuItemContent
              icon={PenSquareIcon}
              title="Edit page"
              description="Edit the contents of this page"
              external={true}
            />
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
      {mcpDialog}
    </DropdownMenu.Root>
  );
}

export default CopyPageMenu;
