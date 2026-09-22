export const KNOWN_EVENTCATALOG_COLLECTIONS: ReadonlySet<string>;

export function collectionNameFromEmptyWarning(message: string): string | null;

export function isIntentionalEmptyCollectionMessage(message: string): boolean;

export function isIntentionalEmptyCollectionLine(line: string): boolean;

export interface QuietLoggerEvent {
  level?: string;
  label?: string | null;
  message?: string;
}

export interface QuietLoggerDestination {
  write: (event: QuietLoggerEvent) => void;
  flush?: () => void;
  close?: () => void;
}

export function wrapLoggerDestination<T extends QuietLoggerDestination>(destination: T): QuietLoggerDestination;
