import type { z } from 'zod';

/**
 * Context passed to action handlers - provides information about the current page
 */
export interface ActionContext {
  resourceId: string;
  resourceVersion: string;
  resourceType: string;
  pageUrl: string;
}

/**
 * Result returned from action handlers
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Parameters passed to the action execute function
 */
export interface ActionExecuteParams {
  context: ActionContext;
  input?: Record<string, unknown>;
}

/**
 * Icon names supported by actions (Heroicons)
 */
export type ActionIconName =
  // Core action icons
  | 'play'
  | 'bolt'
  | 'check'
  | 'arrow-path'
  | 'cog'
  // Communication
  | 'bell'
  | 'paper-airplane'
  | 'envelope'
  | 'chat-bubble-left'
  // Development
  | 'command-line'
  | 'code-bracket'
  | 'wrench'
  | 'wrench-screwdriver'
  | 'cpu-chip'
  // Server & Database
  | 'server'
  | 'server-stack'
  | 'circle-stack'
  | 'cloud'
  | 'cloud-arrow-up'
  | 'cloud-arrow-down'
  // Documents
  | 'document-text'
  | 'document-arrow-down'
  | 'document-magnifying-glass'
  | 'clipboard-document-check'
  | 'clipboard-document-list'
  // Security
  | 'shield-check'
  | 'lock-closed'
  | 'lock-open'
  | 'key'
  | 'finger-print'
  // Network & API
  | 'globe-alt'
  | 'link'
  | 'signal'
  | 'wifi'
  | 'arrows-right-left'
  // Testing & Quality
  | 'beaker'
  | 'bug-ant'
  | 'exclamation-triangle'
  | 'check-circle'
  | 'x-circle'
  // Analytics
  | 'chart-bar'
  | 'chart-pie'
  | 'presentation-chart-line'
  | 'cursor-arrow-rays'
  // Files & Storage
  | 'folder'
  | 'folder-open'
  | 'archive-box'
  | 'inbox-stack'
  // Time & Scheduling
  | 'clock'
  | 'calendar'
  // Users & Teams
  | 'user'
  | 'users'
  | 'user-group'
  // Actions
  | 'trash'
  | 'plus'
  | 'minus'
  | 'arrow-down-tray'
  | 'arrow-up-tray'
  | 'rocket-launch'
  // Lists & Organization
  | 'queue-list'
  | 'list-bullet'
  | 'tag'
  | 'hashtag'
  // Info & Status
  | 'information-circle'
  | 'eye'
  | 'eye-slash'
  | 'magnifying-glass'
  // Misc
  | 'sparkles'
  | 'fire'
  | 'heart'
  | 'star'
  | 'cube'
  | 'cube-transparent';

/**
 * Button variant styles
 */
export type ActionVariant = 'primary' | 'secondary' | 'danger';

/**
 * How to display action results
 */
export type ResultDisplay = 'modal' | 'toast';

/**
 * Definition of a single action
 */
export interface ActionDefinition {
  label: string;
  description?: string;
  icon?: ActionIconName;
  variant?: ActionVariant;
  resultDisplay?: ResultDisplay;
  inputSchema?: z.ZodSchema;
  execute: (params: ActionExecuteParams) => Promise<ActionResult>;
}

/**
 * Map of action name to action definition
 */
export type ActionsConfig = Record<string, ActionDefinition>;

/**
 * Visibility configuration for actions
 */
export interface ActionVisibility {
  collections?: string[] | '*';
}

/**
 * Map of action name to visibility config
 */
export type ActionsVisibilityConfig = Record<string, ActionVisibility>;

/**
 * Full configuration exported from eventcatalog.actions.js
 */
export interface ActionsConfiguration {
  actions: ActionsConfig;
  visibility?: ActionsVisibilityConfig;
}

/**
 * API request body for action execution
 */
export interface ActionExecuteRequest {
  context: ActionContext;
  input?: Record<string, unknown>;
}

/**
 * API response from action execution
 */
export interface ActionExecuteResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Action metadata sent to client (without execute function)
 */
export interface ActionMetadata {
  name: string;
  label: string;
  description?: string;
  icon?: ActionIconName;
  variant?: ActionVariant;
  resultDisplay?: ResultDisplay;
  hasInputSchema: boolean;
}

/**
 * Props for Action component
 */
export interface ActionProps {
  name: string;
  label?: string;
  input?: Record<string, unknown>;
  context?: ActionContext;
}

/**
 * Props for ActionGroup component
 */
export interface ActionGroupProps {
  children: React.ReactNode;
}
