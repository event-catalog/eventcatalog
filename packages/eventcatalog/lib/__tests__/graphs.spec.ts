import { buildMermaidFlowChartForEvent, buildMermaidFlowChartForService } from '../graphs';

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
My_Event_2:::producer-->My_Service:::event

classDef event stroke:#2563eb,stroke-width: 4px;
classDef producer stroke:#75d7b6,stroke-width: 2px;
classDef consumer stroke:#818cf8,stroke-width: 2px;
My_Service:::event-->My_Event:::consumer`);
    });
  });

  describe('buildMermaidFlowChartForEvent', () => {
    it('takes and Event and returns the mermaid code showing relationships between the event and its consumers and producers', () => {
      const event = {
        name: 'My Event',
        version: '0.0.1',
        producers: ['Service 1'],
        consumers: ['Service 2'],
      };

      const result = buildMermaidFlowChartForEvent(event);

      expect(result.trim()).toEqual(`flowchart LR
Service_1:::producer-->My_Event:::event

classDef event stroke:#2563eb,stroke-width: 4px;
classDef producer stroke:#75d7b6,stroke-width: 2px;
classDef consumer stroke:#818cf8,stroke-width: 2px;
My_Event:::event-->Service_2:::consumer`);
    });

    it('transforms any service name with spaces into _', () => {
      const event = {
        name: 'My Event',
        version: '0.0.1',
        producers: ['Service 1 With Spaces'],
        consumers: [],
      };
      const result = buildMermaidFlowChartForEvent(event);
      expect(result).toContain(`Service_1_With_Spaces:::producer-->My_Event:::event`);
      expect(result).not.toContain(`Service 1 With Spaces`);
    });
  });
});
