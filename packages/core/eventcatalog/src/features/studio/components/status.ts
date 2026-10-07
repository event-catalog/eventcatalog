import type { Status } from '../hooks/use-studio-flow';

/**
 * Status and destructive colours for the canvas, from the theme's badge colours (EventCatalog has no status
 * variables), so they follow light, dark and custom themes. Kept here rather than repeated in each component.
 */
export const STATUS = {
  success: { text: 'text-[rgb(var(--ec-badge-color-green-text))]', dot: 'bg-[rgb(var(--ec-badge-color-green-text))]' },
  warning: { dot: 'bg-[rgb(var(--ec-badge-color-yellow-text))]' },
  danger: {
    text: 'text-[rgb(var(--ec-badge-color-red-text))]',
    dot: 'bg-[rgb(var(--ec-badge-color-red-text))]',
    hover: 'hover:bg-[rgb(var(--ec-badge-color-red-background))]',
  },
} as const;

/** The dot showing whether the canvas is connected */
export const CONNECTION_DOT: Record<Status, string> = {
  connected: STATUS.success.dot,
  connecting: STATUS.warning.dot,
  disconnected: STATUS.danger.dot,
};
