const path = require('path');

module.exports = {
  title: 'My Event Site',
  tagline: 'Events are cool',
  url: 'https://your-eventcatalog-test-site.com',
  baseUrl: '/',
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
  organizationName: 'Your Company',
  projectName: 'Event Catalog',
  logo: {
    alt: 'EventCatalog Logo',
    src: 'logo.svg',
  },
  features: {
    mermaid: {
      showOnEventsGrid: true,
      showOnServicesGrid: true
    }
  },
  generators: [
    [
      '@eventcatalogtest/plugin-doc-generator-asyncapi',
      {
        file: './asyncapi.yml',
      },
    ]
  ],
  users: [
    {
      id: 'dboyne',
      name: 'David Boyne',
      avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      role: 'Developer',
      summary: 'Currently building tools for Event Architectures.'
    },
    {
      id: 'mSmith',
      name: 'Matthew Smith',
      avatarUrl: 'https://randomuser.me/api/portraits/lego/3.jpg',
      role: 'Developer',
      summary: 'About Fugiat ipsum ipsum deserunt culpa aute sint do nostrud anim incididunt cillum culpa consequat.'
    },
  ],
}
