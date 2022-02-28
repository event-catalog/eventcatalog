import { Event, Service } from '@eventcatalog/types';
import { getEventElements, getServiceElements } from '../GraphElements';

jest.mock('next/config', () => () => ({
  publicRuntimeConfig: {
    basePath: '/docs',
  },
}));

describe('GraphElements', () => {
  describe('getServiceElements', () => {
    it('takes a given Service and returns the ReactFlow elements with relations the events it publishes and consumes', () => {
      const event = { name: 'My Event', version: '0.0.1' };
      const event2 = { name: 'My Event 2', version: '0.0.1' };
      const rootNodeColor = '#2563eb';
      const isAnimated = true;

      const service = {
        id: 'My Service',
        name: 'My Service',
        version: '0.0.1',
        summary: 'Summary',
        publishes: [event],
        subscribes: [event2],
      };

      const result = getServiceElements(service as Service, rootNodeColor, isAnimated);

      expect(result).toMatchSnapshot();
    });

    it('takes a given Service and returns the ReactFlow elements with multiple events & long names', () => {
      const event = { name: 'My Event', version: '0.0.1' };
      const event2 = { name: 'My Event 2', version: '0.0.1' };
      const event3 = { name: 'My Event 3', version: '0.0.1' };
      const event4 = { name: 'very.very.very.very.very.very.very.very.very.very.very.very.long.name.event.4', version: '0.0.1' };
      const event5 = { name: 'very very very very very very very very very very very very long name event 5', version: '0.0.1' };
      const event6 = { name: 'My Event 6', version: '0.0.1' };
      const event7 = { name: 'My Event 7', version: '0.0.1' };
      const event8 = { name: 'My Event 8', version: '0.0.1' };
      const event9 = { name: 'My Event 9', version: '0.0.1' };
      const rootNodeColor = '#2563eb';
      const isAnimated = true;

      const service = {
        id: 'My Service',
        name: 'My Service',
        version: '0.0.1',
        summary: 'Summary',
        publishes: [event, event2, event3, event4],
        subscribes: [event5, event6, event7, event8, event9],
      };

      const result = getServiceElements(service as Service, rootNodeColor, isAnimated);

      expect(result).toMatchSnapshot();
    });
  });

  describe('getEventElements', () => {
    it('takes a given event and returns the ReactFlow elements with relations between the event and its consumers and producers', () => {
      const event = {
        name: 'My Event',
        version: '0.0.1',
        producerNames: ['Service 1'],
        consumerNames: ['Service 2'],
      };
      const rootNodeColor = '#2563eb';
      const isAnimated = true;

      const result = getEventElements(event as Event, rootNodeColor, isAnimated);

      expect(result).toMatchSnapshot();
    });

    it('takes a given event and returns the ReactFlow elements with multiple services & long names', () => {
      const event = {
        name: 'My Event',
        version: '0.0.1',
        producerNames: [
          'Service 1',
          'Service 2',
          'very very very very very very very very very very very very long name Service 3',
        ],
        consumerNames: [
          'Service 4',
          'Service 5',
          'Service 6',
          'Service 7',
          'Service 8',
          'very.very.very.very.very.very.very.very.very.very.very.very.long.name.event.8',
        ],
      };
      const rootNodeColor = '#2563eb';
      const isAnimated = true;

      const result = getEventElements(event as Event, rootNodeColor, isAnimated);

      expect(result).toMatchSnapshot();
    });
  });
});
