import { Event, Service } from '@eventcatalog/types';
import { Elements } from 'react-flow-renderer';
import createGraphLayout, { calcCanvasHeight } from '../GraphLayout';

describe('GraphLayout', () => {
  describe('createGraphLayout', () => {
    it('calculate a graph layout', () => {
      const isHorizontal = true;
      const elements = [
        {
          data: {
            label: 'My Event 2',
            link: '/docs/events/My Event 2',
            maxWidth: 150,
            width: 150,
          },
          id: 's-My_Event_2',
          position: {
            x: 0,
            y: 0,
          },
          style: {
            border: '2px solid #75d7b6',
            width: 150,
          },
          type: 'input',
        },
        {
          data: {
            label: 'My Service',
            link: '/docs/services/My Service',
            maxWidth: 150,
            width: 150,
          },
          id: 'c-My_Service',
          position: {
            x: 0,
            y: 0,
          },
          style: {
            border: '2px solid #2563eb',
            width: 150,
          },
        },
        {
          data: {
            label: 'My Event',
            link: '/docs/events/My Event',
            maxWidth: 150,
            width: 150,
          },
          id: 'p-My_Event',
          position: {
            x: 0,
            y: 0,
          },
          style: {
            border: '2px solid #818cf8',
            width: 150,
          },
          type: 'output',
        },
        {
          animated: true,
          arrowHeadType: 'arrowclosed',
          id: 'ecp-My_Event',
          source: 'c-My_Service',
          target: 'p-My_Event',
          type: 'smoothstep',
        },
        {
          animated: true,
          arrowHeadType: 'arrowclosed',
          id: 'esc-My_Event_2',
          source: 's-My_Event_2',
          target: 'c-My_Service',
          type: 'smoothstep',
        },
      ];

      const result = createGraphLayout(elements as Elements, isHorizontal);
      expect(result).toMatchSnapshot();
    });
  });

  describe('calcCanvasHeight', () => {
    it('takes all events and calculate the canvas height', () => {
      const data: Event = {
        producerNames: ['1', '2', '3', '4', '5', '6', '7', '8'],
        consumerNames: ['1', '2', '3', '4', '5'],
        name: 'mock',
        version: '1.0.0',
      };
      const result = calcCanvasHeight({ data, source: 'event' });
      expect(result).toEqual(544);
    });

    it('takes all services and calculate the canvas height', () => {
      const event: Event = {
        producerNames: [],
        consumerNames: [],
        name: 'mock',
        version: '1.0.0',
      };
      const data: Service = {
        publishes: [event, event, event, event, event, event, event, event, event],
        subscribes: [event, event, event, event, event],
        name: 'mock',
        summary: 'mock',
      };
      const result = calcCanvasHeight({ data, source: 'service' });
      expect(result).toEqual(612);
    });
  });
});
