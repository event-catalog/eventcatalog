import messageChannelsToServiceChannels from './message-channels-to-service-channels';

export const runMigrations = async (dir?: string) => {
  await messageChannelsToServiceChannels(dir);
};
