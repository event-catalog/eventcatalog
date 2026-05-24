import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-agents');

const {
  writeAgent,
  writeVersionedAgent,
  writeAgentToDomain,
  writeEventToAgent,
  writeCommandToAgent,
  writeQueryToAgent,
  getAgent,
  getAgentByPath,
  getAgents,
  versionAgent,
  rmAgent,
  rmAgentById,
  addFileToAgent,
  addEventToAgent,
  addCommandToAgent,
  addQueryToAgent,
  addDataStoreToAgent,
  addFlowToAgent,
  agentHasVersion,
  isAgent,
  toAgent,
} = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Agents SDK', () => {
  describe('getAgent', () => {
    it('returns the given agent id from EventCatalog and the latest version when no version is given', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
        model: {
          provider: 'OpenAI',
          name: 'gpt-4.1-mini',
          version: '2025-04-14',
        },
        tools: [
          {
            name: 'Order lookup',
            type: 'mcp',
            url: 'https://mcp.example.com/orders/lookup',
            description: 'Retrieves order status and recent order events',
          },
        ],
      });

      const agent = await getAgent('OrderSupportAgent');

      expect(agent).toEqual({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
        model: {
          provider: 'OpenAI',
          name: 'gpt-4.1-mini',
          version: '2025-04-14',
        },
        tools: [
          {
            name: 'Order lookup',
            type: 'mcp',
            url: 'https://mcp.example.com/orders/lookup',
            description: 'Retrieves order status and recent order events',
          },
        ],
      });
    });

    it('returns the given agent id from EventCatalog and the requested version when a version is given', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
      });

      await versionAgent('OrderSupportAgent');

      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '1.0.0',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
      });

      const agent = await getAgent('OrderSupportAgent', '0.0.1');

      expect(agent).toEqual({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
      });
    });

    it('returns undefined when a given agent is not found', async () => {
      const agent = await getAgent('MissingAgent');

      expect(agent).toEqual(undefined);
    });
  });

  describe('getAgentByPath', () => {
    it('returns the given agent from EventCatalog by its path', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
      });

      const agent = await getAgentByPath(path.join(CATALOG_PATH, 'agents/OrderSupportAgent/index.mdx'));

      expect(agent).toEqual({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
      });
    });
  });

  describe('getAgents', () => {
    it('returns all agents from the catalog', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await writeAgent({
        id: 'FraudReviewAgent',
        name: 'Fraud Review Agent',
        version: '0.0.1',
        markdown: '# Fraud review agent',
      });

      const agents = await getAgents();

      expect(agents).toHaveLength(2);
      expect(agents.map((agent) => agent.id).sort()).toEqual(['FraudReviewAgent', 'OrderSupportAgent']);
    });

    it('returns only latest versions when latestOnly is true', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await versionAgent('OrderSupportAgent');

      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '1.0.0',
        markdown: '# Order support agent v2',
      });

      const agents = await getAgents({ latestOnly: true });

      expect(agents).toHaveLength(1);
      expect(agents[0].version).toBe('1.0.0');
    });
  });

  describe('writeAgent', () => {
    it('writes the given agent to the file system', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
        sends: [
          { id: 'SupportCaseAnalyzed', version: '1.0.0' },
          { id: 'SupportCaseAnalyzed', version: '1.0.0' },
        ],
        receives: [
          { id: 'OrderConfirmed', version: '1.0.0' },
          { id: 'OrderConfirmed', version: '1.0.0' },
        ],
      });

      const agent = await getAgent('OrderSupportAgent');

      expect(agent).toEqual({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        summary: 'Agent that helps support teams investigate order questions',
        markdown: '# Order support agent',
        sends: [{ id: 'SupportCaseAnalyzed', version: '1.0.0' }],
        receives: [{ id: 'OrderConfirmed', version: '1.0.0' }],
      });
      expect(fs.existsSync(path.join(CATALOG_PATH, 'agents/OrderSupportAgent', 'index.mdx'))).toBe(true);
    });

    it('throws an error when trying to write an agent that already exists', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await expect(
        writeAgent({
          id: 'OrderSupportAgent',
          name: 'Order Support Agent',
          version: '0.0.1',
          markdown: '# Order support agent',
        })
      ).rejects.toThrowError('Failed to write OrderSupportAgent (agent) as the version 0.0.1 already exists');
    });

    it('overrides the agent when trying to write an agent that already exists and override is true', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await writeAgent(
        {
          id: 'OrderSupportAgent',
          name: 'Order Support Agent',
          version: '0.0.1',
          markdown: 'Overridden content',
        },
        { override: true }
      );

      const agent = await getAgent('OrderSupportAgent');

      expect(agent.markdown).toBe('Overridden content');
    });
  });

  describe('writeVersionedAgent', () => {
    it('writes a versioned agent', async () => {
      await writeVersionedAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'agents/OrderSupportAgent/versioned/0.0.1', 'index.mdx'))).toBe(true);
    });
  });

  describe('writeAgentToDomain', () => {
    it('writes an agent to a domain', async () => {
      await writeAgentToDomain(
        {
          id: 'OrderSupportAgent',
          name: 'Order Support Agent',
          version: '0.0.1',
          markdown: '# Order support agent',
        },
        { id: 'Orders' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Orders/agents/OrderSupportAgent', 'index.mdx'))).toBe(true);
    });

    it('writes an agent to a versioned domain', async () => {
      await writeAgentToDomain(
        {
          id: 'OrderSupportAgent',
          name: 'Order Support Agent',
          version: '0.0.1',
          markdown: '# Order support agent',
        },
        { id: 'Orders', version: '1.0.0' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Orders/versioned/1.0.0/agents/OrderSupportAgent', 'index.mdx'))).toBe(
        true
      );
    });
  });

  describe('writeMessageToAgent', () => {
    it('writes an event to an agent', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await writeEventToAgent(
        {
          id: 'SupportCaseAnalyzed',
          name: 'Support Case Analyzed',
          version: '1.0.0',
          markdown: '# Support case analyzed',
        },
        { id: 'OrderSupportAgent' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'agents/OrderSupportAgent/events/SupportCaseAnalyzed', 'index.mdx'))).toBe(
        true
      );
    });

    it('writes a command to an agent', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await writeCommandToAgent(
        {
          id: 'InvestigateOrder',
          name: 'Investigate Order',
          version: '1.0.0',
          markdown: '# Investigate order',
        },
        { id: 'OrderSupportAgent' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'agents/OrderSupportAgent/commands/InvestigateOrder', 'index.mdx'))).toBe(
        true
      );
    });

    it('writes a query to an agent', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await writeQueryToAgent(
        {
          id: 'GetOrderSummary',
          name: 'Get Order Summary',
          version: '1.0.0',
          markdown: '# Get order summary',
        },
        { id: 'OrderSupportAgent' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'agents/OrderSupportAgent/queries/GetOrderSummary', 'index.mdx'))).toBe(true);
    });
  });

  describe('rmAgent', () => {
    it('removes an agent by its path', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await rmAgent('/OrderSupportAgent');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent).toEqual(undefined);
    });
  });

  describe('rmAgentById', () => {
    it('removes an agent by its id', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await rmAgentById('OrderSupportAgent');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent).toEqual(undefined);
    });
  });

  describe('agentHasVersion', () => {
    it('returns true when the given agent version exists', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      expect(await agentHasVersion('OrderSupportAgent', '0.0.1')).toBe(true);
    });

    it('returns false when the given agent version does not exist', async () => {
      expect(await agentHasVersion('OrderSupportAgent', '0.0.1')).toBe(false);
    });
  });

  describe('addFileToAgent', () => {
    it('adds a file to the given agent', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await addFileToAgent('OrderSupportAgent', { content: 'Agent notes', fileName: 'notes.md' });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'agents/OrderSupportAgent', 'notes.md'))).toBe(true);
      expect(fs.readFileSync(path.join(CATALOG_PATH, 'agents/OrderSupportAgent', 'notes.md'), 'utf-8')).toBe('Agent notes');
    });
  });

  describe('addMessageToAgent', () => {
    it('adds the given event to the agent sends list', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await addEventToAgent('OrderSupportAgent', 'sends', { id: 'SupportCaseAnalyzed', version: '1.0.0' }, '0.0.1');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent.sends).toEqual([{ id: 'SupportCaseAnalyzed', version: '1.0.0' }]);
    });

    it('adds the given command to the agent receives list', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await addCommandToAgent('OrderSupportAgent', 'receives', { id: 'InvestigateOrder', version: '1.0.0' }, '0.0.1');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent.receives).toEqual([{ id: 'InvestigateOrder', version: '1.0.0' }]);
    });

    it('adds the given query to the agent sends list', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await addQueryToAgent('OrderSupportAgent', 'sends', { id: 'GetOrderSummary', version: '1.0.0' }, '0.0.1');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent.sends).toEqual([{ id: 'GetOrderSummary', version: '1.0.0' }]);
    });

    it('throws an error when the direction is invalid', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await expect(
        addEventToAgent('OrderSupportAgent', 'publishes', { id: 'SupportCaseAnalyzed', version: '1.0.0' }, '0.0.1')
      ).rejects.toThrowError("Direction publishes is invalid, only 'receives' and 'sends' are supported");
    });
  });

  describe('addDataStoreToAgent', () => {
    it('adds the given data store to the agent writesTo list', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await addDataStoreToAgent('OrderSupportAgent', 'writesTo', { id: 'support-notes-db', version: '1.0.0' }, '0.0.1');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent.writesTo).toEqual([{ id: 'support-notes-db', version: '1.0.0' }]);
    });

    it('adds the given data store to the agent readsFrom list', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await addDataStoreToAgent('OrderSupportAgent', 'readsFrom', { id: 'orders-db', version: '1.0.0' }, '0.0.1');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent.readsFrom).toEqual([{ id: 'orders-db', version: '1.0.0' }]);
    });
  });

  describe('addFlowToAgent', () => {
    it('adds the given flow to the agent', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      await addFlowToAgent('OrderSupportAgent', { id: 'OrderSupportFlow', version: '1.0.0' }, '0.0.1');

      const agent = await getAgent('OrderSupportAgent');

      expect(agent.flows).toEqual([{ id: 'OrderSupportFlow', version: '1.0.0' }]);
    });
  });

  describe('isAgent', () => {
    it('returns true if the path is an agent', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      expect(await isAgent(path.join(CATALOG_PATH, 'agents', 'OrderSupportAgent', 'index.mdx'))).toEqual(true);
    });

    it('returns false if the path is not an agent', async () => {
      expect(await isAgent('/agents/OrderSupportAgent/index.mdx')).toEqual(false);
    });
  });

  describe('toAgent', () => {
    it('converts a file to an agent', async () => {
      await writeAgent({
        id: 'OrderSupportAgent',
        name: 'Order Support Agent',
        version: '0.0.1',
        markdown: '# Order support agent',
      });

      const agent = await toAgent(fs.readFileSync(path.join(CATALOG_PATH, 'agents', 'OrderSupportAgent', 'index.mdx'), 'utf8'));

      expect(agent).toEqual(
        expect.objectContaining({
          id: 'OrderSupportAgent',
          name: 'Order Support Agent',
          version: '0.0.1',
          markdown: '# Order support agent',
        })
      );
    });
  });
});
