import type { APIContext } from 'astro';
import { z } from 'zod';
import { isEventCatalogActionsEnabled } from '@utils/feature';
import { loadActionsConfiguration, getAction, getActionMetadata, getAllActionMetadata } from './load-actions';
import type { ActionExecuteRequest, ActionExecuteResponse, ActionContext } from './action-types';

// Load actions on module init
await loadActionsConfiguration();

// Schema for validating action context
// Note: resourceId, resourceVersion, resourceType can be empty if action is used outside a resource page
const actionContextSchema = z.object({
  resourceId: z.string(),
  resourceVersion: z.string(),
  resourceType: z.string(),
  pageUrl: z.string(),
});

// Schema for action execution request
const actionRequestSchema = z.object({
  context: actionContextSchema,
  input: z.record(z.unknown()).optional(),
});

/**
 * GET /api/actions/[actionName]
 * Returns action metadata or list of all actions
 */
export const GET = async ({ params }: APIContext) => {
  if (!isEventCatalogActionsEnabled()) {
    return new Response(
      JSON.stringify({
        error: 'Actions are not enabled. Please ensure you have a valid license and eventcatalog.actions.js file.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { path } = params;

  // If no action name, return all actions
  if (!path || path === '') {
    const actions = getAllActionMetadata();
    return new Response(JSON.stringify({ actions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get specific action metadata
  const actionName = path;
  const metadata = getActionMetadata(actionName);

  if (!metadata) {
    return new Response(JSON.stringify({ error: `Action not found: ${actionName}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ action: metadata }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * POST /api/actions/[actionName]
 * Executes an action and returns the result
 */
export const POST = async ({ params, request }: APIContext) => {
  if (!isEventCatalogActionsEnabled()) {
    return new Response(
      JSON.stringify({
        error: 'Actions are not enabled. Please ensure you have a valid license and eventcatalog.actions.js file.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const { path } = params;

  if (!path || path === '') {
    return new Response(JSON.stringify({ error: 'Action name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const actionName = path;
  const action = getAction(actionName);

  if (!action) {
    return new Response(JSON.stringify({ error: `Action not found: ${actionName}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse and validate request body
  let body: ActionExecuteRequest;
  try {
    const rawBody = await request.json();
    const parsed = actionRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: parsed.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    body = parsed.data;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate input against action's input schema if defined
  if (action.inputSchema && body.input) {
    const inputValidation = action.inputSchema.safeParse(body.input);
    if (!inputValidation.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid input parameters',
          data: { validationErrors: inputValidation.error.errors },
        } satisfies ActionExecuteResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Execute the action
  try {
    const result = await action.execute({
      context: body.context,
      input: body.input,
    });

    const response: ActionExecuteResponse = {
      success: result.success,
      message: result.message,
      error: result.error,
      data: result.data,
    };

    return new Response(JSON.stringify(response), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error(`[Actions] Error executing action "${actionName}":`, error);

    const response: ActionExecuteResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred while executing the action',
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const prerender = false;
