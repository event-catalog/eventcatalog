import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Copy, FileText, MessageCircleQuestion, ChevronDownIcon, ExternalLink, PenSquareIcon } from 'lucide-react';
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
    iconElement = <IconComponent className="w-5 h-5 text-gray-500" />;
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <div className="p-1 border border-gray-200 rounded">{iconElement}</div>
      <div className="flex-1">
        <div className="font-medium text-gray-800">{title}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      {external && <ExternalLink className="w-4 h-4 text-gray-400" />}
    </div>
  );
};

export function CopyPageMenu({
  schemas,
  chatQuery,
  chatEnabled = false,
  editUrl,
  markdownDownloadEnabled = false,
}: {
  schemas: Schema[];
  chatQuery?: string;
  chatEnabled: boolean;
  editUrl: string;
  markdownDownloadEnabled: boolean;
}) {
  // Define available actions
  const availableActions = {
    copyMarkdown: markdownDownloadEnabled,
    editPage: !!editUrl,
    copySchemas: schemas.length > 0,
    viewMarkdown: markdownDownloadEnabled,
    chat: chatEnabled,
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
        text: 'Open Chat',
        icon: MessageCircleQuestion,
      };
    }
    return null;
  };

  const defaultAction = getDefaultAction();
  const [buttonText, setButtonText] = useState(defaultAction?.text || 'Action');

  // Fetch the markdown from the url + .mdx
  const copyMarkdownToClipboard = async () => {
    console.log('Copying markdown to clipboard');
    try {
      setButtonText('Copied');
      const response = await fetch(markdownUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const markdown = await response.text();
      await navigator.clipboard.writeText(markdown);
      setTimeout(() => setButtonText(defaultAction?.text || 'Action'), 3000); // Revert after 3 seconds
    } catch (error) {
      console.error('Failed to copy markdown:', error);
      setButtonText('Copy failed'); // Provide feedback on failure
      setTimeout(() => setButtonText(defaultAction?.text || 'Action'), 3000);
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
        window.open(buildUrl(`/chat?query=${chatQuery}`));
        break;
    }
  };

  if (!defaultAction) {
    return null;
  }

  return (
    <DropdownMenu.Root>
      {/* Container for the split button */}
      <div className="inline-flex rounded-md shadow-sm border border-gray-300">
        {/* Left Button: Default Action */}
        <button
          type="button"
          onClick={handleDefaultAction}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-l-md hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <defaultAction.icon className="w-4 h-4" />
          {buttonText}
        </button>
        {/* Right Button: Dropdown Trigger */}
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center px-1.5 py-1.5 text-sm font-medium text-gray-500 bg-white rounded-r-md border-l border-gray-300 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="More options"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </DropdownMenu.Trigger>
      </div>

      {/* Adjust styling for the content dropdown */}
      <DropdownMenu.Content
        className="w-72 bg-white rounded-lg shadow-lg border border-gray-200 mt-1 py-1"
        sideOffset={5}
        align="end"
      >
        {availableActions.copyMarkdown && (
          <DropdownMenu.Item
            className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            onSelect={() => copyMarkdownToClipboard()}
          >
            <MenuItemContent icon={Copy} title="Copy page" description="Copy page as Markdown for LLMs" />
          </DropdownMenu.Item>
        )}

        {availableActions.editPage && (
          <DropdownMenu.Item
            className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
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
                className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                onSelect={() => copySchemaToClipboard(schema)}
              >
                <MenuItemContent icon={Icon} title={title} description={`Copy ${type} to clipboard`} />
              </DropdownMenu.Item>
            );
          })}

        {availableActions.viewMarkdown && (
          <DropdownMenu.Item
            className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
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

        {availableActions.chat && (
          <DropdownMenu.Item
            className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            onSelect={() => window.open(buildUrl(`/chat`) + `?query=${chatQuery}`)}
          >
            <MenuItemContent
              icon={MessageCircleQuestion}
              title="Open in EventCatalog Chat"
              description="Ask questions about this page"
              external={true}
            />
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export default CopyPageMenu;
