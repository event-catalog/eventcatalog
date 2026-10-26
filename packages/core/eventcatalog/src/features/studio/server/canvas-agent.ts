import { reopeningIfEdited, type Author } from '@eventcatalog/visualiser/studio';
import type { AgentStage } from '../agent-choreography';
import type { AgentIdentity } from '../agents';
import type { StudioRuntime } from './runtime';

/**
 * Work on a canvas as an agent: changes are played out like a person would make them (see agent-choreography),
 * with the agent's pointer, selection and what it's doing shown to everyone on the canvas. Used by the MCP canvas
 * tools and the assistant's.
 */
export const agentOnCanvas = (
  runtime: StudioRuntime,
  canvasId: string,
  agent: AgentIdentity,
  { pace }: Pick<AgentStage, 'pace'> = {}
) => {
  const author = { ...agent, agent: true } as Author;
  const stage: AgentStage = {
    // An agent changing an accepted (or rejected) canvas makes it a draft again, like a person doing it
    change: (fn) => runtime.withCanvas(canvasId, (doc) => reopeningIfEdited(doc, author, () => fn(doc))),
    present: (presence) => runtime.setAgentPresence(canvasId, agent, presence),
    lastPointer: runtime.getAgentPointer(canvasId, agent),
    sharesMoves: true,
    pace,
  };
  return { stage, author };
};
