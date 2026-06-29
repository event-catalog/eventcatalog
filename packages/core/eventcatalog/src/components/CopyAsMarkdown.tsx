import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Copy,
  FileText,
  MessageCircleQuestion,
  ChevronDownIcon,
  ExternalLink,
  PenSquareIcon,
  RssIcon,
  PrinterIcon,
} from 'lucide-react';
import React, { useState, isValidElement } from 'react';
import type { Schema } from '@utils/collections/schemas';
import { buildUrl, toMarkdownUrl } from '@utils/url-builder';

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
    iconElement = <IconComponent className="w-4 h-4 text-[rgb(var(--ec-icon-color))]" />;
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--ec-dropdown-border)/0.8)] bg-[rgb(var(--ec-page-bg))]">
        {iconElement}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium leading-5 text-[rgb(var(--ec-dropdown-text))]">
          <span>{title}</span>
          {external && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--ec-icon-color))]" />}
        </div>
        <div className="text-xs leading-4 text-[rgb(var(--ec-content-text-muted))]">{description}</div>
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
  printUrl,
  variant = 'menu',
}: {
  schemas: Schema[];
  chatQuery?: string;
  chatEnabled: boolean;
  editUrl: string;
  markdownDownloadEnabled: boolean;
  rssFeedEnabled: boolean;
  preferChatAsDefault?: boolean;
  chatButtonText?: string;
  printUrl?: string;
  variant?: 'menu' | 'toolbar';
}) {
  // Define available actions
  const availableActions = {
    copyMarkdown: markdownDownloadEnabled,
    editPage: !!editUrl,
    copySchemas: schemas.length > 0,
    viewMarkdown: markdownDownloadEnabled,
    chat: chatEnabled,
    rssFeed: rssFeedEnabled,
    exportPDF: !!printUrl,
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
        icon: MessageCircleQuestion,
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
        icon: MessageCircleQuestion,
      };
    }
    if (availableActions.rssFeed) {
      return {
        type: 'rssFeed',
        text: 'RSS Feed',
        icon: RssIcon,
      };
    }
    if (availableActions.exportPDF) {
      return {
        type: 'exportPDF',
        text: 'Export to PDF',
        icon: PrinterIcon,
      };
    }
    return null;
  };

  const defaultAction = getDefaultAction();
  const [open, setOpen] = useState(false);
  const [buttonText, setButtonText] = useState(defaultAction?.text || 'Action');
  const [copyButtonText, setCopyButtonText] = useState('Copy page as markdown');

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
      case 'exportPDF':
        window.open(printUrl, '_blank');
        break;
    }
  };

  if (!defaultAction) {
    return null;
  }

  const actionButtonClass =
    'group inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[rgb(var(--ec-page-text-muted))] transition-colors duration-150 hover:text-[rgb(var(--ec-page-text))] focus:outline-hidden focus:ring-2 focus:ring-[rgb(var(--ec-accent))] focus:ring-offset-2 focus:ring-offset-[rgb(var(--ec-page-bg))] rounded-md';
  const actionIconClass = 'h-3.5 w-3.5 shrink-0 text-[rgb(var(--ec-icon-color))] group-hover:text-[rgb(var(--ec-page-text))]';

  const hasToolbarActions =
    availableActions.chat ||
    availableActions.copyMarkdown ||
    availableActions.viewMarkdown ||
    availableActions.copySchemas ||
    availableActions.rssFeed ||
    availableActions.exportPDF ||
    availableActions.editPage;

  if (variant === 'toolbar') {
    if (!hasToolbarActions) return null;

    const moreActionsAvailable =
      availableActions.copySchemas || availableActions.rssFeed || availableActions.exportPDF || availableActions.editPage;

    return (
      <div className="not-prose flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[rgb(var(--ec-page-text-muted))]">
        {availableActions.chat && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('eventcatalog:open-chat'))}
            className={actionButtonClass}
          >
            <MessageCircleQuestion className={actionIconClass} />
            Ask a question
          </button>
        )}

        {availableActions.chat && (availableActions.copyMarkdown || availableActions.viewMarkdown || moreActionsAvailable) && (
          <span className="h-4 w-px bg-[rgb(var(--ec-page-border))]" aria-hidden="true" />
        )}

        {availableActions.copyMarkdown && (
          <button type="button" onClick={copyMarkdownToClipboard} className={actionButtonClass}>
            <Copy className={actionIconClass} />
            {copyButtonText}
          </button>
        )}

        {availableActions.copyMarkdown && (availableActions.viewMarkdown || moreActionsAvailable) && (
          <span className="h-4 w-px bg-[rgb(var(--ec-page-border))]" aria-hidden="true" />
        )}

        {availableActions.viewMarkdown && (
          <button type="button" onClick={() => window.open(markdownUrl, '_blank')} className={actionButtonClass}>
            <FileText className={actionIconClass} />
            View as Markdown
          </button>
        )}

        {availableActions.viewMarkdown && moreActionsAvailable && (
          <span className="h-4 w-px bg-[rgb(var(--ec-page-border))]" aria-hidden="true" />
        )}

        {moreActionsAvailable && (
          <DropdownMenu.Root open={open} onOpenChange={setOpen}>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={actionButtonClass}>
                More actions
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              className="z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[rgb(var(--ec-dropdown-border)/0.8)] bg-[rgb(var(--ec-page-bg))] px-1.5 py-1.5 shadow-[0_24px_64px_rgb(0_0_0/0.35)]"
              sideOffset={10}
              align="start"
            >
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
                      <img src={buildUrl('/icons/asyncapi.svg', true)} className="w-4 h-4" />
                    ) : schema.format === 'openapi' ? (
                      <img src={buildUrl('/icons/openapi.svg', true)} className="w-4 h-4" />
                    ) : (
                      FileText
                    );

                  return (
                    <DropdownMenu.Item
                      key={schema.url}
                      className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
                      onSelect={() => copySchemaToClipboard(schema)}
                    >
                      <MenuItemContent icon={Icon} title={title} description={`Copy ${type} to clipboard`} />
                    </DropdownMenu.Item>
                  );
                })}

              {availableActions.rssFeed && (
                <DropdownMenu.Item
                  className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
                  onSelect={() => window.open(buildUrl(`/rss/all/rss.xml`), '_blank')}
                >
                  <MenuItemContent icon={RssIcon} title="RSS Feed" description="View this page as RSS feed" external={true} />
                </DropdownMenu.Item>
              )}

              {availableActions.exportPDF && (
                <DropdownMenu.Item
                  className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
                  onSelect={() => window.open(printUrl, '_blank')}
                >
                  <MenuItemContent
                    icon={PrinterIcon}
                    title="Export to PDF"
                    description="Open print-friendly version"
                    external={true}
                  />
                </DropdownMenu.Item>
              )}

              {availableActions.editPage && (
                <DropdownMenu.Item
                  className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
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
          </DropdownMenu.Root>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      {/* Container for the split button */}
      <div className="inline-flex h-8 items-stretch overflow-hidden rounded-md border border-[rgb(var(--ec-dropdown-border)/0.75)] bg-[rgb(var(--ec-page-bg))]">
        {/* Left Button: Default Action */}
        <button
          type="button"
          onClick={handleDefaultAction}
          className="inline-flex h-full items-center justify-center gap-2 whitespace-nowrap bg-transparent pl-4 pr-3 text-sm font-medium text-[rgb(var(--ec-dropdown-text))] transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover)/0.75)] focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-[rgb(var(--ec-accent))]"
        >
          <defaultAction.icon className="h-4 w-4" />
          {buttonText}
        </button>
        {/* Right Button: Dropdown Trigger */}
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex h-full w-8 items-center justify-center border-l border-[rgb(var(--ec-dropdown-border)/0.75)] bg-transparent text-sm font-medium text-[rgb(var(--ec-icon-color))] transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover)/0.75)] focus:z-10 focus:outline-hidden focus:ring-1 focus:ring-[rgb(var(--ec-accent))]"
            aria-label="More options"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </DropdownMenu.Trigger>
      </div>

      {/* Adjust styling for the content dropdown */}
      <DropdownMenu.Content
        className="z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[rgb(var(--ec-dropdown-border)/0.8)] bg-[rgb(var(--ec-page-bg))] px-1.5 py-1.5 shadow-[0_24px_64px_rgb(0_0_0/0.35)]"
        sideOffset={10}
        align="end"
      >
        {availableActions.chat && (
          <>
            <DropdownMenu.Item
              className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
              onSelect={() => window.dispatchEvent(new CustomEvent('eventcatalog:open-chat'))}
            >
              <MenuItemContent
                icon={MessageCircleQuestion}
                title="EventCatalog Assistant"
                description="Ask questions about this page"
              />
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="mx-3 my-3 h-px bg-[rgb(var(--ec-dropdown-border)/0.8)]" />
          </>
        )}

        {availableActions.copyMarkdown && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
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
                <img src={buildUrl('/icons/asyncapi.svg', true)} className="w-4 h-4" />
              ) : schema.format === 'openapi' ? (
                <img src={buildUrl('/icons/openapi.svg', true)} className="w-4 h-4" />
              ) : (
                FileText
              );

            return (
              <DropdownMenu.Item
                key={schema.url}
                className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
                onSelect={() => copySchemaToClipboard(schema)}
              >
                <MenuItemContent icon={Icon} title={title} description={`Copy ${type} to clipboard`} />
              </DropdownMenu.Item>
            );
          })}

        {availableActions.viewMarkdown && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
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

        {availableActions.rssFeed && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
            onSelect={() => window.open(buildUrl(`/rss/all/rss.xml`), '_blank')}
          >
            <MenuItemContent icon={RssIcon} title="RSS Feed" description="View this page as RSS feed" external={true} />
          </DropdownMenu.Item>
        )}

        {availableActions.exportPDF && (
          <DropdownMenu.Item
            className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
            onSelect={() => window.open(printUrl, '_blank')}
          >
            <MenuItemContent icon={PrinterIcon} title="Export to PDF" description="Open print-friendly version" external={true} />
          </DropdownMenu.Item>
        )}

        {availableActions.editPage && (
          <>
            <DropdownMenu.Separator className="mx-3 my-3 h-px bg-[rgb(var(--ec-dropdown-border)/0.8)]" />
            <DropdownMenu.Item
              className="cursor-pointer rounded-2xl outline-hidden transition-colors duration-150 hover:bg-[rgb(var(--ec-dropdown-hover))] data-[highlighted]:bg-[rgb(var(--ec-dropdown-hover))]"
              onSelect={() => window.open(editUrl, '_blank')}
            >
              <MenuItemContent
                icon={PenSquareIcon}
                title="Edit page"
                description="Edit the contents of this page"
                external={true}
              />
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export default CopyPageMenu;
