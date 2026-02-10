import pc from 'picocolors';
import { VERSION } from '../constants';

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
};

const formatMessage = (tag: string, message: string, tagColor: (s: string) => string) => {
  return `${pc.dim(getTimestamp())} ${tagColor(`[${tag}]`)} ${message}`;
};

export const logger = {
  welcome: () => {
    console.log();
    console.log(pc.magenta(pc.bold('🚀 EventCatalog')) + pc.dim(`  (v${VERSION})`));
    console.log(pc.dim('https://eventcatalog.dev'));
    console.log();
    console.log(
      pc.dim('If you like the project, we would appreciate a star on GitHub ❤️ - ') +
        pc.bold('https://github.com/event-catalog/eventcatalog/stargazers')
    );
    console.log();
  },
  info: (message: string, tag: string = 'info') => {
    console.log(formatMessage(tag, message, pc.blue));
  },
  success: (message: string, tag: string = 'success') => {
    console.log(formatMessage(tag, message, pc.green));
  },
  error: (message: string, tag: string = 'error') => {
    console.log(formatMessage(tag, message, pc.red));
  },
  warning: (message: string, tag: string = 'warn') => {
    console.log(formatMessage(tag, message, pc.yellow));
  },
  dim: (message: string) => {
    console.log(pc.dim(message));
  },
};
