import fs from 'node:fs';
import { glob } from 'glob';
import os from 'node:os';
import matter from 'gray-matter';
import path from 'node:path';

export default async (dir?: string) => {
  const PROJECT_DIR = path.join(dir || process.env.PROJECT_DIR!);

  const messages = await glob(
    [
      '**/events/*/index.mdx',
      '**/events/*/index.md',
      '**/events/*/versioned/*/index.mdx',
      '**/events/*/versioned/*/index.md',

      // commands
      '**/commands/*/index.mdx',
      '**/commands/*/index.md',
      '**/commands/*/versioned/*/index.mdx',
      '**/commands/*/versioned/*/index.md',

      // queries
      '**/queries/*/index.mdx',
      '**/queries/*/index.md',
      '**/queries/*/versioned/*/index.mdx',
      '**/queries/*/versioned/*/index.md',
    ],
    {
      // const events = await glob(['**/events/*/index.(md|mdx)', '**/events/*/versioned/*/index.(md|mdx)'], {
      cwd: PROJECT_DIR,
      absolute: true,
      nodir: true,
      windowsPathsNoEscape: os.platform() == 'win32',
      ignore: ['node_modules/**', '**/dist/**', '**/teams', '**/users', '**/package.json', '**/Dockerfile'],
    }
  );

  const services = await glob(
    [
      '**/services/*/index.mdx',
      '**/services/*/index.md',
      '**/services/*/versioned/*/index.mdx',
      '**/services/*/versioned/*/index.md',
    ],
    {
      cwd: PROJECT_DIR,
      absolute: true,
    }
  );

  const messagesWithChannels = messages.reduce((acc: any, message: any) => {
    const file = fs.readFileSync(message, 'utf8');
    const { data } = matter(file);
    if (data.channels?.length > 0) {
      acc.push({
        ...data,
        path: message,
      });
    }
    return acc;
  }, []);

  if (messagesWithChannels.length === 0) {
    return { status: 'success', message: 'No messages with channels found in the catalog' };
  }

  // Filter the services that are sending or receiving messages that have channels defined
  const servicesWithChannels = services.reduce((acc: any, service: any) => {
    const file = fs.readFileSync(service, 'utf8');
    const { data } = matter(file);
    const isSending = data.sends?.some((send: any) => messagesWithChannels.some((message: any) => message.id === send.id));
    const isReceiving = data.receives?.some((receive: any) =>
      messagesWithChannels.some((message: any) => message.id === receive.id)
    );
    if (isSending || isReceiving) {
      acc.push({
        ...data,
        path: service,
      });
    }
    return acc;
  }, []);

  // Go through the services and update them if we have too
  for (const service of servicesWithChannels) {
    const file = fs.readFileSync(service.path, 'utf8');
    const { data } = matter(file);

    const messagesTheServiceSendsThatNeedUpdating =
      data.sends?.filter((send: any) => messagesWithChannels.some((message: any) => message.id === send.id)) ?? [];
    const messagesTheServiceReceivesThatNeedUpdating =
      data.receives?.filter((receive: any) => messagesWithChannels.some((message: any) => message.id === receive.id)) ?? [];

    if (messagesTheServiceSendsThatNeedUpdating.length > 0 || messagesTheServiceReceivesThatNeedUpdating.length > 0) {
      const newSends = messagesTheServiceSendsThatNeedUpdating.map((send: any) => ({
        ...send,
        to: messagesWithChannels
          .map((message: any) => (message.id === send.id ? message.channels : []))
          .flat()
          .filter((channel: any) => channel !== null),
      }));
      const newReceives = messagesTheServiceReceivesThatNeedUpdating.map((receive: any) => ({
        ...receive,
        from: messagesWithChannels
          .map((message: any) => (message.id === receive.id ? message.channels : []))
          .flat()
          .filter((channel: any) => channel !== null),
      }));

      const newData = {
        ...data,
        ...(newSends.length > 0 ? { sends: newSends } : {}),
        ...(newReceives.length > 0 ? { receives: newReceives } : {}),
      };
      fs.writeFileSync(service.path, matter.stringify(file, newData));
    }
  }

  // Remove the channels from the messages
  for (const message of messagesWithChannels) {
    const file = fs.readFileSync(message.path, 'utf8');
    const parsed = matter(file);
    const { channels, ...newData } = parsed.data;
    fs.writeFileSync(message.path, matter.stringify(parsed.content, newData));
  }

  console.log('✔ Channels migrated to new services API');
};
