import { join } from 'node:path';
import type { ActionsConfiguration, ActionsConfig, ActionsVisibilityConfig, ActionMetadata } from './action-types';

const catalogDirectory = process.env.PROJECT_DIR || process.cwd();

let actionsConfig: ActionsConfig | null = null;
let visibilityConfig: ActionsVisibilityConfig | null = null;
let hasActionsConfiguration = false;
let loadError: string | null = null;

/**
 * Load the actions configuration from eventcatalog.actions.js
 */
export const loadActionsConfiguration = async (): Promise<{
  loaded: boolean;
  error?: string;
}> => {
  if (actionsConfig !== null) {
    return { loaded: hasActionsConfiguration, error: loadError || undefined };
  }

  try {
    const configPath = join(catalogDirectory, 'eventcatalog.actions.js');
    const config: ActionsConfiguration = await import(/* @vite-ignore */ configPath);

    if (!config.actions || typeof config.actions !== 'object') {
      loadError = 'Invalid actions configuration: missing "actions" export';
      hasActionsConfiguration = false;
      return { loaded: false, error: loadError };
    }

    actionsConfig = config.actions;
    visibilityConfig = config.visibility || null;
    hasActionsConfiguration = true;

    return { loaded: true };
  } catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
      loadError = 'No eventcatalog.actions.js file found';
    } else {
      loadError = `Error loading actions configuration: ${error.message}`;
      console.error('[Actions] Error loading configuration:', error);
    }
    hasActionsConfiguration = false;
    return { loaded: false, error: loadError };
  }
};

/**
 * Check if actions configuration has been loaded
 */
export const hasActions = (): boolean => {
  return hasActionsConfiguration;
};

/**
 * Get all loaded actions configuration
 */
export const getActionsConfig = (): ActionsConfig | null => {
  return actionsConfig;
};

/**
 * Get a specific action by name
 */
export const getAction = (name: string) => {
  if (!actionsConfig) return null;
  return actionsConfig[name] || null;
};

/**
 * Get visibility configuration for a specific action
 */
export const getActionVisibility = (name: string) => {
  if (!visibilityConfig) return null;
  return visibilityConfig[name] || null;
};

/**
 * Check if an action is visible for a specific collection type
 */
export const isActionVisibleForCollection = (actionName: string, collection: string): boolean => {
  const visibility = getActionVisibility(actionName);

  // If no visibility config, action is visible everywhere
  if (!visibility) return true;

  // If collections is '*', visible everywhere
  if (visibility.collections === '*') return true;

  // Check if collection is in the allowed list
  if (Array.isArray(visibility.collections)) {
    return visibility.collections.includes(collection);
  }

  return true;
};

/**
 * Get action metadata for client (without execute function)
 */
export const getActionMetadata = (name: string): ActionMetadata | null => {
  const action = getAction(name);
  if (!action) return null;

  return {
    name,
    label: action.label,
    description: action.description,
    icon: action.icon,
    variant: action.variant,
    resultDisplay: action.resultDisplay,
    hasInputSchema: !!action.inputSchema,
  };
};

/**
 * Get all action metadata for client
 */
export const getAllActionMetadata = (): ActionMetadata[] => {
  if (!actionsConfig) return [];

  return Object.entries(actionsConfig).map(([name, action]) => ({
    name,
    label: action.label,
    description: action.description,
    icon: action.icon,
    variant: action.variant,
    resultDisplay: action.resultDisplay,
    hasInputSchema: !!action.inputSchema,
  }));
};

/**
 * Get action metadata filtered by collection visibility
 */
export const getActionsForCollection = (collection: string): ActionMetadata[] => {
  const allActions = getAllActionMetadata();
  return allActions.filter((action) => isActionVisibleForCollection(action.name, collection));
};
