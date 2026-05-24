import { expect, it, describe, beforeEach, afterEach } from 'vitest';
import utils, { FlowBuilder } from '../index';
import path from 'node:path';
import fs from 'node:fs';

const CATALOG_PATH = path.join(__dirname, 'catalog-flows');

const {
  writeFlow,
  writeVersionedFlow,
  writeFlowToDomain,
  writeFlowToService,
  getFlow,
  getFlows,
  rmFlow,
  rmFlowById,
  versionFlow,
  flowHasVersion,
  addFileToFlow,
  writeDomain,
  versionDomain,
  writeService,
  versionService,
} = utils(CATALOG_PATH);

beforeEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
  fs.mkdirSync(CATALOG_PATH, { recursive: true });
});

afterEach(() => {
  fs.rmSync(CATALOG_PATH, { recursive: true, force: true });
});

describe('Flows SDK', () => {
  describe('getFlow', () => {
    it('returns the given flow id from EventCatalog and the latest version when no version is given', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Business flow for processing payments',
        markdown: '# Payment Flow',
        steps: [
          {
            id: 'PlaceOrder',
            title: 'Place order',
            message: { id: 'PlaceOrder', version: '0.0.1' },
            next_step: { id: 'PaymentProcessed', label: 'Payment processed' },
          },
          {
            id: 'PaymentProcessed',
            title: 'Payment processed',
            message: { id: 'PaymentProcessed', version: '0.0.1' },
          },
        ],
      });

      const flow = await getFlow('PaymentFlow');

      expect(flow).toEqual({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Business flow for processing payments',
        markdown: '# Payment Flow',
        steps: [
          {
            id: 'PlaceOrder',
            title: 'Place order',
            message: { id: 'PlaceOrder', version: '0.0.1' },
            next_step: { id: 'PaymentProcessed', label: 'Payment processed' },
          },
          {
            id: 'PaymentProcessed',
            title: 'Payment processed',
            message: { id: 'PaymentProcessed', version: '0.0.1' },
          },
        ],
      });
    });

    it('returns the given flow id from EventCatalog and the requested version when a version is given', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await versionFlow('PaymentFlow');

      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.2',
        summary: 'Payment flow v2',
        markdown: '# Payment Flow v2',
        steps: [],
      });

      const flow = await getFlow('PaymentFlow', '0.0.1');

      expect(flow).toEqual({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });
    });

    it('returns undefined when a given flow is not found', async () => {
      const flow = await getFlow('MissingFlow');

      expect(flow).toEqual(undefined);
    });

    it('returns a flow from within a domain', async () => {
      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '0.0.1',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await writeFlowToDomain(
        {
          id: 'OrderFlow',
          name: 'Order Flow',
          version: '1.0.0',
          summary: 'Order flow',
          markdown: '# Order flow',
          steps: [],
        },
        { id: 'Orders' }
      );

      const flow = await getFlow('OrderFlow');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Orders/flows/OrderFlow', 'index.mdx'))).toBe(true);
      expect(flow).toEqual({
        id: 'OrderFlow',
        name: 'Order Flow',
        version: '1.0.0',
        summary: 'Order flow',
        markdown: '# Order flow',
        steps: [],
      });
    });

    it('returns a flow from within a service', async () => {
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '0.0.1',
        summary: 'Orders service',
        markdown: '# Orders service',
      });

      await writeFlowToService(
        {
          id: 'OrderFlow',
          name: 'Order Flow',
          version: '1.0.0',
          summary: 'Order flow',
          markdown: '# Order flow',
          steps: [],
        },
        { id: 'OrdersService' }
      );

      const flow = await getFlow('OrderFlow');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/OrdersService/flows/OrderFlow', 'index.mdx'))).toBe(true);
      expect(flow).toEqual({
        id: 'OrderFlow',
        name: 'Order Flow',
        version: '1.0.0',
        summary: 'Order flow',
        markdown: '# Order flow',
        steps: [],
      });
    });
  });

  describe('getFlows', () => {
    it('returns all flows from the catalog', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await writeFlow({
        id: 'OrderFlow',
        name: 'Order Flow',
        version: '0.0.1',
        summary: 'Order flow',
        markdown: '# Order Flow',
        steps: [],
      });

      const flows = await getFlows();

      expect(flows).toHaveLength(2);
      expect(flows.map((flow) => flow.id).sort()).toEqual(['OrderFlow', 'PaymentFlow']);
    });

    it('returns only latest versions when latestOnly is true', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await versionFlow('PaymentFlow');

      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.2',
        summary: 'Payment flow v2',
        markdown: '# Payment Flow v2',
        steps: [],
      });

      const flows = await getFlows({ latestOnly: true });

      expect(flows).toHaveLength(1);
      expect(flows[0].version).toBe('0.0.2');
    });
  });

  describe('writeFlow', () => {
    it('writes the given flow to the file system', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        owners: ['payments-team'],
        steps: [
          {
            id: 'Customer',
            title: 'Customer',
            actor: { name: 'Customer' },
            next_step: 'PlaceOrder',
          },
          {
            id: 'PlaceOrder',
            title: 'Place order',
            message: { id: 'PlaceOrder', version: '0.0.1' },
          },
        ],
      });

      const flow = await getFlow('PaymentFlow');

      expect(flow).toEqual({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        owners: ['payments-team'],
        steps: [
          {
            id: 'Customer',
            title: 'Customer',
            actor: { name: 'Customer' },
            next_step: 'PlaceOrder',
          },
          {
            id: 'PlaceOrder',
            title: 'Place order',
            message: { id: 'PlaceOrder', version: '0.0.1' },
          },
        ],
      });
    });

    it('writes the flow to a custom path when path is provided', async () => {
      await writeFlow(
        {
          id: 'PaymentFlow',
          name: 'Payment Flow',
          version: '0.0.1',
          summary: 'Payment flow',
          markdown: '# Payment Flow',
          steps: [],
        },
        { path: '/Payments/PaymentFlow' }
      );

      const flow = await getFlow('PaymentFlow');

      expect(flow).toEqual({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });
    });

    it('throws an error when trying to write a flow that already exists', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await expect(
        writeFlow({
          id: 'PaymentFlow',
          name: 'Payment Flow',
          version: '0.0.1',
          summary: 'Payment flow',
          markdown: '# Payment Flow',
          steps: [],
        })
      ).rejects.toThrowError('Failed to write PaymentFlow (flow) as the version 0.0.1 already exists');
    });

    it('overrides the flow when trying to write a flow that already exists and override is true', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await writeFlow(
        {
          id: 'PaymentFlow',
          name: 'Payment Flow',
          version: '0.0.1',
          summary: 'Payment flow',
          markdown: 'Overridden content',
          steps: [],
        },
        { override: true }
      );

      const flow = await getFlow('PaymentFlow');

      expect(fs.existsSync(path.join(CATALOG_PATH, 'flows/PaymentFlow', 'index.mdx'))).toBe(true);
      expect(flow.markdown).toBe('Overridden content');
    });

    describe('versionExistingContent', () => {
      it('versions the previous flow when trying to write a flow that already exists and versionExistingContent is true', async () => {
        await writeFlow({
          id: 'PaymentFlow',
          name: 'Payment Flow',
          version: '0.0.1',
          summary: 'Payment flow',
          markdown: '# Payment Flow',
          steps: [],
        });

        await writeFlow(
          {
            id: 'PaymentFlow',
            name: 'Payment Flow',
            version: '1.0.0',
            summary: 'Payment flow',
            markdown: 'New',
            steps: [],
          },
          { versionExistingContent: true }
        );

        const flow = await getFlow('PaymentFlow');

        expect(flow.version).toBe('1.0.0');
        expect(flow.markdown).toBe('New');
        expect(fs.existsSync(path.join(CATALOG_PATH, 'flows/PaymentFlow/versioned/0.0.1', 'index.mdx'))).toBe(true);
        expect(fs.existsSync(path.join(CATALOG_PATH, 'flows/PaymentFlow', 'index.mdx'))).toBe(true);
      });

      it('throws an error when trying to write a flow and versionExistingContent is true and the new version is not greater than the previous one', async () => {
        await writeFlow(
          {
            id: 'PaymentFlow',
            name: 'Payment Flow',
            version: '1.0.0',
            summary: 'Payment flow',
            markdown: 'New',
            steps: [],
          },
          { versionExistingContent: true }
        );

        await expect(
          writeFlow(
            {
              id: 'PaymentFlow',
              name: 'Payment Flow',
              version: '0.0.0',
              summary: 'Payment flow',
              markdown: 'New',
              steps: [],
            },
            { versionExistingContent: true }
          )
        ).rejects.toThrowError('New version 0.0.0 is not greater than current version 1.0.0');
      });
    });

    describe('formats', () => {
      it('writes the flow as md when format is md', async () => {
        await writeFlow(
          {
            id: 'PaymentFlow',
            name: 'Payment Flow',
            version: '0.0.1',
            summary: 'Payment flow',
            markdown: '# Payment Flow',
            steps: [],
          },
          { format: 'md' }
        );

        expect(fs.existsSync(path.join(CATALOG_PATH, 'flows/PaymentFlow', 'index.md'))).toBe(true);
      });

      it('writes the flow as mdx when format is mdx (default)', async () => {
        await writeFlow({
          id: 'PaymentFlow',
          name: 'Payment Flow',
          version: '0.0.1',
          summary: 'Payment flow',
          markdown: '# Payment Flow',
          steps: [],
        });

        expect(fs.existsSync(path.join(CATALOG_PATH, 'flows/PaymentFlow', 'index.mdx'))).toBe(true);
      });
    });
  });

  describe('writeVersionedFlow', () => {
    it('writes a versioned flow', async () => {
      await writeVersionedFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'flows/PaymentFlow/versioned/0.0.1', 'index.mdx'))).toBe(true);
    });
  });

  describe('writeFlowToDomain', () => {
    it('writes a flow to a domain', async () => {
      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '0.0.1',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await writeFlowToDomain(
        {
          id: 'OrderFlow',
          name: 'Order Flow',
          version: '1.0.0',
          summary: 'Order flow',
          markdown: '# Order flow',
          steps: [],
        },
        { id: 'Orders' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Orders/flows/OrderFlow', 'index.mdx'))).toBe(true);
    });

    it('writes a flow to a versioned domain', async () => {
      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '0.0.1',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await versionDomain('Orders');

      await writeDomain({
        id: 'Orders',
        name: 'Orders Domain',
        version: '1.0.0',
        summary: 'Orders domain',
        markdown: '# Orders domain',
      });

      await writeFlowToDomain(
        {
          id: 'OrderFlow',
          name: 'Order Flow',
          version: '1.0.0',
          summary: 'Order flow',
          markdown: '# Order flow',
          steps: [],
        },
        { id: 'Orders', version: '0.0.1' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'domains/Orders/versioned/0.0.1/flows/OrderFlow', 'index.mdx'))).toBe(true);
    });
  });

  describe('writeFlowToService', () => {
    it('writes a flow to a service', async () => {
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '0.0.1',
        summary: 'Orders service',
        markdown: '# Orders service',
      });

      await writeFlowToService(
        {
          id: 'OrderFlow',
          name: 'Order Flow',
          version: '1.0.0',
          summary: 'Order flow',
          markdown: '# Order flow',
          steps: [],
        },
        { id: 'OrdersService' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/OrdersService/flows/OrderFlow', 'index.mdx'))).toBe(true);
    });

    it('writes a flow to a versioned service', async () => {
      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '0.0.1',
        summary: 'Orders service',
        markdown: '# Orders service',
      });

      await versionService('OrdersService');

      await writeService({
        id: 'OrdersService',
        name: 'Orders Service',
        version: '1.0.0',
        summary: 'Orders service',
        markdown: '# Orders service',
      });

      await writeFlowToService(
        {
          id: 'OrderFlow',
          name: 'Order Flow',
          version: '1.0.0',
          summary: 'Order flow',
          markdown: '# Order flow',
          steps: [],
        },
        { id: 'OrdersService', version: '0.0.1' }
      );

      expect(fs.existsSync(path.join(CATALOG_PATH, 'services/OrdersService/versioned/0.0.1/flows/OrderFlow', 'index.mdx'))).toBe(
        true
      );
    });
  });

  describe('versionFlow', () => {
    it('versions a flow by moving it to a versioned directory', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await versionFlow('PaymentFlow');

      const flow = await getFlow('PaymentFlow', '0.0.1');

      expect(flow).toEqual({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });
    });
  });

  describe('rmFlow', () => {
    it('removes a flow by its path', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await rmFlow('/PaymentFlow');

      const flow = await getFlow('PaymentFlow');

      expect(flow).toEqual(undefined);
    });
  });

  describe('rmFlowById', () => {
    it('removes a flow by its id', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await rmFlowById('PaymentFlow');

      const flow = await getFlow('PaymentFlow');

      expect(flow).toEqual(undefined);
    });

    it('removes a specific version of a flow by its id and version', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await versionFlow('PaymentFlow');

      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.2',
        summary: 'Payment flow v2',
        markdown: '# Payment Flow v2',
        steps: [],
      });

      await rmFlowById('PaymentFlow', '0.0.1');

      const oldFlow = await getFlow('PaymentFlow', '0.0.1');
      const newFlow = await getFlow('PaymentFlow', '0.0.2');

      expect(oldFlow).toEqual(undefined);
      expect(newFlow).toEqual({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.2',
        summary: 'Payment flow v2',
        markdown: '# Payment Flow v2',
        steps: [],
      });
    });
  });

  describe('flowHasVersion', () => {
    it('returns true when the given flow version exists', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      expect(await flowHasVersion('PaymentFlow', '0.0.1')).toBe(true);
    });

    it('returns false when the given flow version does not exist', async () => {
      expect(await flowHasVersion('PaymentFlow', '0.0.1')).toBe(false);
    });
  });

  describe('addFileToFlow', () => {
    it('adds a file to the given flow', async () => {
      await writeFlow({
        id: 'PaymentFlow',
        name: 'Payment Flow',
        version: '0.0.1',
        summary: 'Payment flow',
        markdown: '# Payment Flow',
        steps: [],
      });

      await addFileToFlow('PaymentFlow', { content: 'Payment notes', fileName: 'notes.md' });

      expect(fs.existsSync(path.join(CATALOG_PATH, 'flows/PaymentFlow', 'notes.md'))).toBe(true);
      expect(fs.readFileSync(path.join(CATALOG_PATH, 'flows/PaymentFlow', 'notes.md'), 'utf-8')).toBe('Payment notes');
    });
  });
});

describe('FlowBuilder', () => {
  it('builds a flow with generic, message, agent, service, actor, external system, sub-flow, and custom steps', () => {
    const flow = FlowBuilder.create({
      id: 'PaymentFlow',
      name: 'Payment Flow',
      version: '1.0.0',
      summary: 'Payment flow',
      markdown: '# Payment Flow',
    })
      .addActorStep({
        id: 'Customer',
        summary: 'Customer placing an order',
        nextSteps: [{ id: 'PlaceOrder', label: 'Places order' }],
      })
      .addMessageStep({
        id: 'PlaceOrder',
        version: '0.0.1',
        nextSteps: [{ id: 'PaymentService', label: 'Process payment' }],
      })
      .addServiceStep({
        id: 'PaymentService',
        version: '0.0.2',
        nextSteps: [
          { id: 'PaymentsDB', label: 'Store payment' },
          { id: 'Stripe', label: 'Authorize payment' },
        ],
      })
      .addAgentStep({
        id: 'FraudReviewAgent',
        version: '1.0.0',
      })
      .addDataStoreStep({
        id: 'PaymentsDB',
        version: '1.0.0',
        nextSteps: [{ id: 'RevenueAnalytics', label: 'Update analytics' }],
      })
      .addDataProductStep({
        id: 'RevenueAnalytics',
        version: '1.0.0',
        nextSteps: [{ id: 'PaymentProcessed', label: 'Payment processed' }],
      })
      .addMessageStep({
        id: 'PaymentProcessed',
        nextSteps: [{ id: 'RewardFlow', label: 'Reward customer' }],
      })
      .addExternalSystemStep({
        id: 'Stripe',
        summary: 'Payment provider',
        url: 'https://stripe.com',
        nextSteps: [{ id: 'ManualReview', label: 'Review failed payments' }],
      })
      .addFlowStep({
        id: 'RewardFlow',
        version: '1.0.0',
      })
      .addCustomStep({
        id: 'ManualReview',
        title: 'Manual Review',
        summary: 'Review the failed payment manually',
        icon: 'clipboard',
        type: 'manual',
        color: '#ff0000',
      })
      .build();

    expect(flow).toEqual({
      id: 'PaymentFlow',
      name: 'Payment Flow',
      version: '1.0.0',
      summary: 'Payment flow',
      markdown: '# Payment Flow',
      steps: [
        {
          id: 'Customer',
          title: 'Customer',
          summary: 'Customer placing an order',
          actor: { name: 'Customer', summary: 'Customer placing an order' },
          next_step: { id: 'PlaceOrder', label: 'Places order' },
        },
        {
          id: 'PlaceOrder',
          title: 'PlaceOrder',
          message: { id: 'PlaceOrder', version: '0.0.1' },
          next_step: { id: 'PaymentService', label: 'Process payment' },
        },
        {
          id: 'PaymentService',
          title: 'PaymentService',
          service: { id: 'PaymentService', version: '0.0.2' },
          next_steps: [
            { id: 'PaymentsDB', label: 'Store payment' },
            { id: 'Stripe', label: 'Authorize payment' },
          ],
        },
        {
          id: 'FraudReviewAgent',
          title: 'FraudReviewAgent',
          agent: { id: 'FraudReviewAgent', version: '1.0.0' },
        },
        {
          id: 'PaymentsDB',
          title: 'PaymentsDB',
          container: { id: 'PaymentsDB', version: '1.0.0' },
          next_step: { id: 'RevenueAnalytics', label: 'Update analytics' },
        },
        {
          id: 'RevenueAnalytics',
          title: 'RevenueAnalytics',
          dataProduct: { id: 'RevenueAnalytics', version: '1.0.0' },
          next_step: { id: 'PaymentProcessed', label: 'Payment processed' },
        },
        {
          id: 'PaymentProcessed',
          title: 'PaymentProcessed',
          message: { id: 'PaymentProcessed' },
          next_step: { id: 'RewardFlow', label: 'Reward customer' },
        },
        {
          id: 'Stripe',
          title: 'Stripe',
          summary: 'Payment provider',
          externalSystem: { name: 'Stripe', summary: 'Payment provider', url: 'https://stripe.com' },
          next_step: { id: 'ManualReview', label: 'Review failed payments' },
        },
        {
          id: 'RewardFlow',
          title: 'RewardFlow',
          flow: { id: 'RewardFlow', version: '1.0.0' },
        },
        {
          id: 'ManualReview',
          title: 'Manual Review',
          summary: 'Review the failed payment manually',
          custom: {
            title: 'Manual Review',
            summary: 'Review the failed payment manually',
            icon: 'clipboard',
            type: 'manual',
            color: '#ff0000',
          },
        },
      ],
    });
  });

  it('uses a generic step title when a title is not provided', () => {
    const flow = FlowBuilder.create({
      id: 'OrderFlow',
      name: 'Order Flow',
      version: '1.0.0',
      markdown: '# Order Flow',
    })
      .addStep({ id: 'Calculate' })
      .build();

    expect(flow.steps).toEqual([
      {
        id: 'Calculate',
        title: 'Calculate',
      },
    ]);
  });

  it('starts from existing steps when steps are provided to the builder', () => {
    const flow = FlowBuilder.create({
      id: 'OrderFlow',
      name: 'Order Flow',
      version: '1.0.0',
      markdown: '# Order Flow',
      steps: [
        {
          id: 'Start',
          title: 'Start',
        },
      ],
    })
      .addStep({ id: 'End' })
      .build();

    expect(flow.steps).toEqual([
      {
        id: 'Start',
        title: 'Start',
      },
      {
        id: 'End',
        title: 'End',
      },
    ]);
  });

  it('throws an error when the same step id is added twice', () => {
    expect(() =>
      FlowBuilder.create({
        id: 'OrderFlow',
        name: 'Order Flow',
        version: '1.0.0',
        markdown: '# Order Flow',
      })
        .addStep({ id: 'Start' })
        .addStep({ id: 'Start' })
    ).toThrowError('Flow step with id "Start" already exists');
  });

  it('normalizes string and number next steps into step pointers', () => {
    const flow = FlowBuilder.create({
      id: 'OrderFlow',
      name: 'Order Flow',
      version: '1.0.0',
      markdown: '# Order Flow',
    })
      .addStep({ id: 'Start', nextSteps: ['Middle', 3] })
      .addStep({ id: 'Middle' })
      .addStep({ id: 3, title: 'End' })
      .build();

    expect(flow.steps).toEqual([
      {
        id: 'Start',
        title: 'Start',
        next_steps: [{ id: 'Middle' }, { id: 3 }],
      },
      {
        id: 'Middle',
        title: 'Middle',
      },
      {
        id: 3,
        title: 'End',
      },
    ]);
  });

  it('builds message, service, data store, data product, external system, flow, actor, and custom details from explicit payloads', () => {
    const flow = FlowBuilder.create({
      id: 'OrderFlow',
      name: 'Order Flow',
      version: '1.0.0',
      markdown: '# Order Flow',
    })
      .addMessageStep({
        id: 'PlaceOrderStep',
        title: 'Place Order',
        message: { id: 'PlaceOrder', version: '1.0.0' },
      })
      .addServiceStep({
        id: 'OrderServiceStep',
        title: 'Order Service',
        service: { id: 'OrderService', version: '1.0.0' },
      })
      .addDataStoreStep({
        id: 'OrdersDBStep',
        title: 'Orders DB',
        container: { id: 'OrdersDB', version: '1.0.0' },
      })
      .addDataProductStep({
        id: 'OrderAnalyticsStep',
        title: 'Order Analytics',
        dataProduct: { id: 'OrderAnalytics', version: '1.0.0' },
      })
      .addExternalSystemStep({
        id: 'SAPStep',
        title: 'SAP',
        externalSystem: { name: 'SAP', summary: 'ERP', url: 'https://example.com/sap' },
      })
      .addFlowStep({
        id: 'RewardStep',
        title: 'Rewarding',
        flow: { id: 'RewardFlow', version: '1.0.0' },
      })
      .addActorStep({
        id: 'CustomerStep',
        title: 'Customer',
        actor: { name: 'Customer', summary: 'Buyer' },
      })
      .addCustomStep({
        id: 'CustomStep',
        title: 'Custom',
        custom: { title: 'Custom Node', type: 'manual' },
      })
      .build();

    expect(flow.steps).toEqual([
      {
        id: 'PlaceOrderStep',
        title: 'Place Order',
        message: { id: 'PlaceOrder', version: '1.0.0' },
      },
      {
        id: 'OrderServiceStep',
        title: 'Order Service',
        service: { id: 'OrderService', version: '1.0.0' },
      },
      {
        id: 'OrdersDBStep',
        title: 'Orders DB',
        container: { id: 'OrdersDB', version: '1.0.0' },
      },
      {
        id: 'OrderAnalyticsStep',
        title: 'Order Analytics',
        dataProduct: { id: 'OrderAnalytics', version: '1.0.0' },
      },
      {
        id: 'SAPStep',
        title: 'SAP',
        externalSystem: { name: 'SAP', summary: 'ERP', url: 'https://example.com/sap' },
      },
      {
        id: 'RewardStep',
        title: 'Rewarding',
        flow: { id: 'RewardFlow', version: '1.0.0' },
      },
      {
        id: 'CustomerStep',
        title: 'Customer',
        actor: { name: 'Customer', summary: 'Buyer' },
      },
      {
        id: 'CustomStep',
        title: 'Custom',
        custom: { title: 'Custom Node', type: 'manual' },
      },
    ]);
  });

  it('builds a data store step from the step id when no explicit data store payload is provided', () => {
    const flow = FlowBuilder.create({
      id: 'OrderFlow',
      name: 'Order Flow',
      version: '1.0.0',
      markdown: '# Order Flow',
    })
      .addDataStoreStep({ id: 'OrdersDB' })
      .build();

    expect(flow.steps).toEqual([
      {
        id: 'OrdersDB',
        title: 'OrdersDB',
        container: { id: 'OrdersDB' },
      },
    ]);
  });

  it('builds a data product step from the step id when no explicit data product payload is provided', () => {
    const flow = FlowBuilder.create({
      id: 'OrderFlow',
      name: 'Order Flow',
      version: '1.0.0',
      markdown: '# Order Flow',
    })
      .addDataProductStep({ id: 'OrderAnalytics' })
      .build();

    expect(flow.steps).toEqual([
      {
        id: 'OrderAnalytics',
        title: 'OrderAnalytics',
        dataProduct: { id: 'OrderAnalytics' },
      },
    ]);
  });

  it('throws an error when a step references a missing next step', () => {
    expect(() =>
      FlowBuilder.create({
        id: 'OrderFlow',
        name: 'Order Flow',
        version: '1.0.0',
        markdown: '# Order Flow',
      })
        .addStep({
          id: 'Start',
          nextSteps: [{ id: 'Missing' }],
        })
        .build()
    ).toThrowError('Flow step "Start" references missing next step "Missing"');
  });
});
