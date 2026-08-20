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
    console.log(
      pc.dim('Using AI? Install EventCatalog Skills to help you manage your catalog - ') +
        pc.bold('https://github.com/event-catalog/skills')
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
  line: (message = '') => {
    console.log(message);
  },
  diagnostic: (
    severity: 'error' | 'warning',
    message: string,
    rule: string,
    attributes: { label: string; value: string }[] = []
  ) => {
    const isError = severity === 'error';
    const color = isError ? pc.red : pc.yellow;
    const icon = isError ? '✖' : '⚠';
    const label = `${icon} ${severity.padEnd(7)} ${message}`;
    const ruleSpacing = ' '.repeat(Math.max(2, 72 - label.length));
    console.log(`  ${color(icon)} ${color(severity.padEnd(7))} ${message}${ruleSpacing}${pc.gray(rule)}`);
    for (const attribute of attributes) {
      console.log(`             - ${pc.dim(`${attribute.label}:`)} ${attribute.value}`);
    }
  },
  diagnosticSummary: (errors: number, warnings: number) => {
    const total = errors + warnings;
    const color = errors > 0 ? pc.red : pc.yellow;
    const icon = errors > 0 ? '✖' : '⚠';
    const problems = `${total} problem${total === 1 ? '' : 's'}`;
    const errorCount = `${errors} error${errors === 1 ? '' : 's'}`;
    const warningCount = `${warnings} warning${warnings === 1 ? '' : 's'}`;
    console.log(color(`${icon} ${problems} (${errorCount}, ${warningCount})`));
  },
  dim: (message: string) => {
    console.log(pc.dim(message));
  },
};
