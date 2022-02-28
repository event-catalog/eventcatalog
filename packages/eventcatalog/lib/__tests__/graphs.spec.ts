import { buildMermaidFlowChartForEvent, buildMermaidFlowChartForService } from '../graphs';

jest.mock('next/config', () => () => ({
  publicRuntimeConfig: {
    basePath: '/docs',
  },
}));

describe('graphs', () => {
  describe('buildMermaidFlowChartForService', () => {
    it('takes a given Service and returns the mermaid code showing relationships between the events it publishes and consumes', () => {
      const event = { name: 'My Event', version: '0.0.1' };
      const event2 = { name: 'My Event 2', version: '0.0.1' };

      const service = {
        id: 'My Service',
        name: 'My Service',
        version: '0.0.1',
        summary: 'Summary',
        publishes: [event],
        subscribes: [event2],
      };

      const result = buildMermaidFlowChartForService(service);

      expect(result.trim()).toEqual(`flowchart LR

l-My_Event_2[My Event 2]:::producer-->My_Service[My Service]:::event

classDef event stroke:#2563eb,stroke-width: 4px;

classDef producer stroke:#75d7b6,stroke-width: 2px;

classDef consumer stroke:#818cf8,stroke-width: 2px;

My_Service[My Service]:::event-->r-My_Event[My Event]:::consumer

click l-My_Event_2 href "/docs/events/My Event 2" "Go to My Event 2" _self

click r-My_Event href "/docs/events/My Event" "Go to My Event" _self

click My_Service href "/docs/services/My Service" "Go to My Service" _self`);
    });
  });

  describe('buildMermaidFlowChartForEvent', () => {
    it('takes and Event and returns the mermaid code showing relationships between the event and its consumers and producers', () => {
      const event = {
        name: 'My Event',
        version: '0.0.1',
        producerNames: ['Service 1'],
        consumerNames: ['Service 2'],
      };

      const result = buildMermaidFlowChartForEvent(event);

      expect(result.trim()).toEqual(`flowchart LR

l-Service_1[Service 1]:::producer-->My_Event[My Event]:::event

classDef event stroke:#2563eb,stroke-width: 4px;

classDef producer stroke:#75d7b6,stroke-width: 2px;

classDef consumer stroke:#818cf8,stroke-width: 2px;

My_Event[My Event]:::event-->r-Service_2[Service 2]:::consumer

click l-Service_1 href "/docs/services/Service 1" "Go to Service 1" _self

click r-Service_2 href "/docs/services/Service 2" "Go to Service 2" _self

click My_Event href "/docs/events/My Event" "Go to My Event" _self`);
    });

    it('persists the spaces in the service name and renders them with mermaid', () => {
      const event = {
        name: 'My Event',
        version: '0.0.1',
        producerNames: ['Service 1 With Spaces'],
        consumerNames: [],
      };
      const result = buildMermaidFlowChartForEvent(event);
      expect(result).toContain(`Service_1_With_Spaces[Service 1 With Spaces]:::producer-->My_Event[My Event]:::event`);
      expect(result).not.toContain(`Service 1 With Spaces[`);
    });
  });
});
