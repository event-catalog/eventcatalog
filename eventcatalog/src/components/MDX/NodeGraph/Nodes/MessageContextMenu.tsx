import * as ContextMenu from '@radix-ui/react-context-menu';
import { buildUrl } from '@utils/url-builder';
import type { CollectionMessageTypes } from '@types';
interface Data {
  message: {
    id: string;
    version: string;
    name: string;
    schemaPath: string;
  };
  messageType: CollectionMessageTypes;
  children: React.ReactNode;
}

export default function MessageContextMenu(data: Data) {
  const { message, messageType, children } = data;
  const { id, version, name, schemaPath } = message;

  if (!id) return null;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white rounded-md p-1 shadow-md border border-gray-200">
          <ContextMenu.Item
            asChild
            className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
          >
            <a href={buildUrl(`/docs/${messageType}/${id}/${version}`)}>Read documentation</a>
          </ContextMenu.Item>
          <ContextMenu.Separator className="h-[1px] bg-gray-200 m-1" />
          {schemaPath && (
            <ContextMenu.Item asChild>
              <a
                href={buildUrl(`/generated/${messageType}/${id}/schema.json`)}
                download={`${name}(${version})-${schemaPath}`}
                className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download schema
              </a>
            </ContextMenu.Item>
          )}
          <ContextMenu.Item asChild>
            <a
              href={buildUrl(`/docs/${messageType}/${id}/${version}/changelog`)}
              className="text-sm px-2 py-1.5 outline-none cursor-pointer hover:bg-orange-100 rounded-sm flex items-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read changelog
            </a>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
