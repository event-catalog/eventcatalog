/**
 * Checks a diagram an agent sent (its model and focus) before it's drawn: the same checks and messages for the
 * MCP server (render_architecture) and for agents in the browser (WebMCP, view/webmcp.ts).
 */
import { validateModel, type ArchitecturePayload } from '@eventcatalog/visualiser/model';

export type PayloadProblem = { error: string; kind: 'invalid_model' | 'unknown_focus'; problems: number };

export function checkPayload(payload: Pick<ArchitecturePayload, 'model' | 'focus'>): { problem?: PayloadProblem; warnings: string[] } {
  const { errors, warnings } = validateModel(payload.model);
  if (errors.length)
    return {
      warnings,
      problem: {
        kind: 'invalid_model',
        problems: errors.length,
        error: `The model has ${errors.length} problem(s). Fix them all and call render_architecture again:\n- ${errors.join('\n- ')}`,
      },
    };
  if (payload.focus && !payload.model.resources.some((r) => r.id === payload.focus))
    return { warnings, problem: { kind: 'unknown_focus', problems: 1, error: `focus "${payload.focus}" isn't the id of a resource in the model` } };
  return { warnings };
}
