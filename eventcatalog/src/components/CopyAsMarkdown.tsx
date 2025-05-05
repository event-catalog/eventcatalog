import { Button } from '@headlessui/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Copy, FileText, MessageCircleQuestion, ChevronDownIcon, ExternalLink } from 'lucide-react';
import React, { useState, isValidElement } from 'react';
import type { Schema } from '@utils/collections/schemas';
import { buildUrl } from '@utils/url-builder';

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
}: {
  schemas: Schema[];
  chatQuery?: string;
  chatEnabled: boolean;
}) {
  const [buttonText, setButtonText] = useState('Copy page');

  // get the url of the current page
  const url = window.location.href;
  const markdownUrl = url + '.mdx';

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
      setTimeout(() => setButtonText('Copy page'), 3000); // Revert after 3 seconds
    } catch (error) {
      console.error('Failed to copy markdown:', error);
      setButtonText('Copy failed'); // Provide feedback on failure
      setTimeout(() => setButtonText('Copy page'), 3000);
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
      setTimeout(() => setButtonText('Copy page'), 3000); // Revert after 3 seconds
    } catch (error) {
      console.error('Failed to copy schema:', error);
      setButtonText('Copy failed'); // Provide feedback on failure
      setTimeout(() => setButtonText('Copy page'), 3000);
    }
  };

  return (
    <DropdownMenu.Root>
      {/* Container for the split button */}
      <div className="inline-flex rounded-md shadow-sm border border-gray-300">
        {/* Left Button: Copy Action */}
        <button
          type="button"
          onClick={copyMarkdownToClipboard}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-l-md hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <Copy className="w-4 h-4" />
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
        <DropdownMenu.Item
          className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
          onSelect={() => copyMarkdownToClipboard()}
        >
          <MenuItemContent icon={Copy} title="Copy page" description="Copy page as Markdown for LLMs" />
        </DropdownMenu.Item>

        {schemas.map((schema) => {
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
              className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
              onSelect={() => copySchemaToClipboard(schema)}
            >
              <MenuItemContent icon={Icon} title={title} description={`Copy ${type} to clipboard`} />
            </DropdownMenu.Item>
          );
        })}
        <DropdownMenu.Item
          className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
          onSelect={() => window.open(markdownUrl, '_blank')}
        >
          <MenuItemContent icon={FileText} title="View as Markdown" description="View this page as plain text" external={true} />
        </DropdownMenu.Item>
        {chatEnabled && (
          <DropdownMenu.Item
            className="cursor-pointer hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            onSelect={() => window.open(buildUrl(`/chat?query=${chatQuery}`))}
          >
            {/* Using MessageCircleQuestion as a placeholder for Claude logo */}
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
