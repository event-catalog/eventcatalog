import type { CanvasStatus } from '../canvas-doc';
import type { Status } from '../hooks/use-studio-flow';

/**
 * Status and destructive colours for the canvas, from the theme's badge colours (EventCatalog has no status
 * variables), so they follow light, dark and custom themes. Kept here rather than repeated in each component.
 */
export const STATUS = {
  success: { text: 'text-[rgb(var(--ec-badge-color-green-text))]', dot: 'bg-[rgb(var(--ec-badge-color-green-text))]' },
  warning: { text: 'text-[rgb(var(--ec-badge-color-yellow-text))]', dot: 'bg-[rgb(var(--ec-badge-color-yellow-text))]' },
  danger: {
    text: 'text-[rgb(var(--ec-badge-color-red-text))]',
    dot: 'bg-[rgb(var(--ec-badge-color-red-text))]',
    hover: 'hover:bg-[rgb(var(--ec-badge-color-red-background))]',
    /** A button that deletes something */
    button: 'bg-[rgb(var(--ec-badge-color-red-text))] text-white hover:bg-[rgb(var(--ec-badge-color-red-text)/0.85)]',
  },
} as const;

/** The dot showing whether the canvas is connected */
export const CONNECTION_DOT: Record<Status, string> = {
  connected: STATUS.success.dot,
  connecting: STATUS.warning.dot,
  disconnected: STATUS.danger.dot,
};

/** How each canvas status looks and what it means (from the theme's badge colours) */
export const CANVAS_STATUS_LOOK: Record<CanvasStatus, { label: string; description: string; pill: string; dot: string }> = {
  draft: {
    label: 'Draft',
    description: 'Being worked on',
    pill: 'bg-[rgb(var(--ec-badge-color-gray-background))] text-[rgb(var(--ec-badge-color-gray-text))] border-[rgb(var(--ec-badge-color-gray-text)/0.25)]',
    dot: 'bg-[rgb(var(--ec-badge-color-gray-text))]',
  },
  proposed: {
    label: 'Proposed',
    description: 'Ready for review',
    pill: 'bg-[rgb(var(--ec-badge-color-yellow-background))] text-[rgb(var(--ec-badge-color-yellow-text))] border-[rgb(var(--ec-badge-color-yellow-text)/0.3)]',
    dot: 'bg-[rgb(var(--ec-badge-color-yellow-text))]',
  },
  accepted: {
    label: 'Accepted',
    description: 'The agreed design',
    pill: 'bg-[rgb(var(--ec-badge-color-green-background))] text-[rgb(var(--ec-badge-color-green-text))] border-[rgb(var(--ec-badge-color-green-text)/0.3)]',
    dot: 'bg-[rgb(var(--ec-badge-color-green-text))]',
  },
  rejected: {
    label: 'Rejected',
    description: 'Decided against, kept for the record',
    pill: 'bg-[rgb(var(--ec-badge-color-red-background))] text-[rgb(var(--ec-badge-color-red-text))] border-[rgb(var(--ec-badge-color-red-text)/0.3)]',
    dot: 'bg-[rgb(var(--ec-badge-color-red-text))]',
  },
};
