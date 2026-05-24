import type { Agent } from './types';
import fs from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import {
  addFileToResource,
  getResource,
  getResourcePath,
  getResources,
  getVersionedDirectory,
  rmResourceById,
  toResource,
  versionResource,
  writeResource,
} from './internal/resources';
import { buildMessagePointer, findFileById, invalidateFileCache, uniqueVersions } from './internal/utils';

export const getAgent =
  (directory: string) =>
  async (id: string, version?: string): Promise<Agent> =>
    getResource(directory, id, version, { type: 'agent' }) as Promise<Agent>;

export const getAgentByPath = (directory: string) => async (path: string) => {
  const agent = await getResource(directory, undefined, undefined, { type: 'agent' }, path);
  return agent as Agent;
};

export const getAgents =
  (directory: string) =>
  async (options?: { latestOnly?: boolean }): Promise<Agent[]> =>
    getResources(directory, {
      type: 'agents',
      ignore: [
        '**/events/**',
        '**/commands/**',
        '**/queries/**',
        '**/entities/**',
        '**/channels/**',
        '**/containers/**',
        '**/data-products/**',
        '**/data-stores/**',
        '**/flows/**',
      ],
      ...options,
    }) as Promise<Agent[]>;

export const writeAgent =
  (directory: string) =>
  async (
    agent: Agent,
    options: { path?: string; override?: boolean; versionExistingContent?: boolean; format?: 'md' | 'mdx' } = {
      path: '',
      override: false,
      format: 'mdx',
    }
  ) => {
    const resource: Agent = { ...agent };

    if (Array.isArray(agent.sends)) {
      resource.sends = uniqueVersions(agent.sends as { id: string; version: string }[]);
    }

    if (Array.isArray(agent.receives)) {
      resource.receives = uniqueVersions(agent.receives as { id: string; version: string }[]);
    }

    return await writeResource(directory, resource, { ...options, type: 'agent' });
  };

export const writeVersionedAgent = (directory: string) => async (agent: Agent) => {
  const path = getVersionedDirectory(agent.id, agent.version);

  return await writeAgent(directory)({ ...agent }, { path });
};

export const writeAgentToDomain =
  (directory: string) =>
  async (
    agent: Agent,
    domain: { id: string; version?: string },
    options: { path?: string; format?: 'md' | 'mdx'; override?: boolean } = { path: '', format: 'mdx', override: false }
  ) => {
    let pathForAgent =
      domain.version && domain.version !== 'latest' ? `/${domain.id}/versioned/${domain.version}/agents` : `/${domain.id}/agents`;
    pathForAgent = join(pathForAgent, agent.id);

    await writeResource(directory, { ...agent }, { ...options, path: pathForAgent, type: 'agent' });
  };

export const versionAgent = (directory: string) => async (id: string) => versionResource(directory, id);

export const rmAgent = (directory: string) => async (path: string) => {
  await fs.rm(join(directory, path), { recursive: true });
  invalidateFileCache();
};

export const rmAgentById = (directory: string) => async (id: string, version?: string, persistFiles?: boolean) => {
  await rmResourceById(directory, id, version, { type: 'agent', persistFiles });
};

export const addFileToAgent =
  (directory: string) => async (id: string, file: { content: string; fileName: string }, version?: string) =>
    addFileToResource(directory, id, file, version);

export const addMessageToAgent =
  (directory: string) =>
  async (
    id: string,
    direction: string,
    message: { id: string; version: string; fields?: string[]; group?: string },
    version?: string
  ) => {
    const agent: Agent = await getAgent(directory)(id, version);
    const agentPath = await getResourcePath(directory, id, version);
    const extension = extname(agentPath?.fullPath || '');

    if (direction === 'sends') {
      if (agent.sends === undefined) {
        agent.sends = [];
      }
      for (let i = 0; i < agent.sends.length; i++) {
        if (agent.sends[i].id === message.id && agent.sends[i].version === message.version) {
          return;
        }
      }
      agent.sends.push(buildMessagePointer(message));
    } else if (direction === 'receives') {
      if (agent.receives === undefined) {
        agent.receives = [];
      }
      for (let i = 0; i < agent.receives.length; i++) {
        if (agent.receives[i].id === message.id && agent.receives[i].version === message.version) {
          return;
        }
      }
      agent.receives.push(buildMessagePointer(message));
    } else {
      throw new Error(`Direction ${direction} is invalid, only 'receives' and 'sends' are supported`);
    }

    const existingResource = await findFileById(directory, id, version);

    if (!existingResource) {
      throw new Error(`Cannot find agent ${id} in the catalog`);
    }

    const path = existingResource.split(/[\\/]+agents/)[0];
    const pathToResource = join(path, 'agents');

    await rmAgentById(directory)(id, version, true);
    await writeAgent(pathToResource)(agent, { format: extension === '.md' ? 'md' : 'mdx' });
  };

export const addDataStoreToAgent =
  (directory: string) => async (id: string, direction: string, dataStore: { id: string; version: string }, version?: string) => {
    const agent: Agent = await getAgent(directory)(id, version);
    const agentPath = await getResourcePath(directory, id, version);
    const extension = extname(agentPath?.fullPath || '');

    if (direction === 'writesTo') {
      if (agent.writesTo === undefined) {
        agent.writesTo = [];
      }
      if (agent.writesTo.some((store) => store.id === dataStore.id && store.version === dataStore.version)) {
        return;
      }
      agent.writesTo.push(dataStore);
    } else if (direction === 'readsFrom') {
      if (agent.readsFrom === undefined) {
        agent.readsFrom = [];
      }
      if (agent.readsFrom.some((store) => store.id === dataStore.id && store.version === dataStore.version)) {
        return;
      }
      agent.readsFrom.push(dataStore);
    } else {
      throw new Error(`Direction ${direction} is invalid, only 'writesTo' and 'readsFrom' are supported`);
    }

    const existingResource = await findFileById(directory, id, version);

    if (!existingResource) {
      throw new Error(`Cannot find agent ${id} in the catalog`);
    }

    const path = existingResource.split(/[\\/]+agents/)[0];
    const pathToResource = join(path, 'agents');

    await rmAgentById(directory)(id, version, true);
    await writeAgent(pathToResource)(agent, { format: extension === '.md' ? 'md' : 'mdx' });
  };

export const addFlowToAgent =
  (directory: string) => async (id: string, flow: { id: string; version: string }, version?: string) => {
    const agent: Agent = await getAgent(directory)(id, version);
    const agentPath = await getResourcePath(directory, id, version);
    const extension = extname(agentPath?.fullPath || '');

    if (agent.flows === undefined) {
      agent.flows = [];
    }

    if (agent.flows.some((f) => f.id === flow.id && f.version === flow.version)) {
      return;
    }

    agent.flows.push(flow);

    const existingResource = await findFileById(directory, id, version);

    if (!existingResource) {
      throw new Error(`Cannot find agent ${id} in the catalog`);
    }

    const path = existingResource.split(/[\\/]+agents/)[0];
    const pathToResource = join(path, 'agents');

    await rmAgentById(directory)(id, version, true);
    await writeAgent(pathToResource)(agent, { format: extension === '.md' ? 'md' : 'mdx' });
  };

export const agentHasVersion = (directory: string) => async (id: string, version?: string) => {
  const file = await findFileById(directory, id, version);
  return !!file;
};

export const isAgent = (directory: string) => async (path: string) => {
  const agent = await getAgentByPath(directory)(path);
  const relativePath = relative(directory, path);
  const segments = relativePath.split(/[/\\]+/);

  return !!agent && segments.includes('agents');
};

export const toAgent = (directory: string) => async (file: string) => toResource(directory, file) as Promise<Agent>;
