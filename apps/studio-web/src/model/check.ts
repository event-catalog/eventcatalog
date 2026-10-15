/**
 * Checks a diagram an agent sent (its model, focus and tour) before it's drawn: the same checks and messages for the
 * MCP server (render_architecture, show_on_diagram) and for agents in the browser (WebMCP, view/webmcp.ts).
 */
import { validateModel, validateTour, type ArchitecturePayload, type Model, type Scene } from '@eventcatalog/visualiser/model';

export type PayloadProblem = { error: string; kind: 'invalid_model' | 'unknown_focus' | 'invalid_tour'; problems: number };

export function checkPayload(payload: Pick<ArchitecturePayload, 'model' | 'focus' | 'tour'>): { problem?: PayloadProblem; warnings: string[] } {
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
  const tourProblem = payload.tour && checkTour(payload.model, payload.tour);
  return tourProblem ? { warnings, problem: tourProblem } : { warnings };
}

/** A walkthrough's scenes must point at resources in the diagram */
export function checkTour(model: Model, tour: Scene[]): PayloadProblem | undefined {
  const errors = validateTour(model, tour);
  if (!errors.length) return undefined;
  return { kind: 'invalid_tour', problems: errors.length, error: `The tour has ${errors.length} problem(s). Fix them and try again:\n- ${errors.join('\n- ')}` };
}
