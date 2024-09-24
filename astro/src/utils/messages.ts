// Exporting getCommands and getEvents directly
import { getCommands } from '@utils/commands';
import { getEvents } from '@utils/events';
export { getCommands } from '@utils/commands';
export { getEvents } from '@utils/events';

// Main function that uses the imported functions
export const getMessages = async () => {
  const commands = await getCommands();
  const events = await getEvents();

  return { commands, events };
};
