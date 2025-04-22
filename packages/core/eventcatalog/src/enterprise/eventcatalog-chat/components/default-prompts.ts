import type { ChatPrompt } from '@enterprise/eventcatalog-chat/utils/chat-prompts';

export const defaultPrompts: ChatPrompt[] = [
  {
    id: 'default-events',
    collection: 'chatPrompts', // Required field
    body: 'List all events.', // The actual prompt text
    data: {
      title: 'What events do we have in our architecture?', // Text displayed on the button
      type: 'text', // Default type
      category: { id: 'general', label: 'General', icon: 'HelpCircle' },
    },
  },
  {
    id: 'default-events-by-domain-feature',
    collection: 'chatPrompts',
    body: 'What events are relevant to this feature {{feature-description}}?',
    data: {
      title: 'Im building a new feature, what events are relevant to this feature?',
      type: 'text',
      inputs: [
        {
          id: 'feature-description',
          label: 'Feature Description',
          type: 'text-area',
        },
      ],
      category: { id: 'general', label: 'General', icon: 'HelpCircle' },
    },
  },
  {
    id: 'default-events-by-domain-service',
    collection: 'chatPrompts',
    body: 'Review the given service {{service-name}}, and let me know how it works? You are an expert in the domain and architecture of the service.',
    data: {
      title: 'Review the given service, and let me know how it works?',
      type: 'text',
      inputs: [
        {
          id: 'service-name',
          label: 'Service Name',
          type: 'resource-list-services',
        },
      ],
      category: { id: 'general', label: 'General', icon: 'HelpCircle' },
    },
  },
  {
    id: 'default-services',
    collection: 'chatPrompts',
    body: 'List all services.',
    data: {
      title: 'What services do we have in our architecture?',
      type: 'text',
      category: { id: 'general', label: 'General', icon: 'HelpCircle' },
    },
  },
  // Example of another category
  {
    id: 'default-schema-json',
    collection: 'chatPrompts',
    body: 'Generate a JSON schema for {{event-name}}.',
    data: {
      title: 'Generate a JSON schema for the given event',
      type: 'text',
      inputs: [
        {
          id: 'event-name',
          label: 'Event Name',
          type: 'resource-list-events',
        },
      ],
      category: { id: 'code', label: 'Code Generation', icon: 'Code' },
    },
  },
  {
    id: 'default-schema-avro',
    collection: 'chatPrompts',
    body: 'Generate a Avro schema for {{event-name}}.',
    data: {
      title: 'Generate a Avro schema for the given event',
      type: 'text',
      inputs: [
        {
          id: 'event-name',
          label: 'Event Name',
          type: 'resource-list-events',
        },
      ],
      category: { id: 'code', label: 'Code Generation', icon: 'Code' },
    },
  },
];
