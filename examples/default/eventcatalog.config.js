/** @type {import('../../bin/eventcatalog.config').Config} */
export default {
  title: 'EventCatalog',
  tagline: 'Discover, Explore and Document your Event Driven Architectures',
  organizationName: 'Your Company',
    homepageLink: 'https://eventcatalog.dev/',
  editUrl: 'https://github.com/event-catalog/eventcatalog/edit/main',
  port: 3000,
  logo: {
    alt: 'EventCatalog',
    src: '/logo.png',
    text: "EventCatalog",
  },
  base: '/',
  trailingSlash: false,
  docs: {
    sidebar: {
      // Should the sub heading be rendered in the docs sidebar?
      showPageHeadings: true,
      services: {
        visible: true
      },
      messages: {
        visible: true
      },
      domains: {
        visible: true
      },
      teams: {
        visible: true
      },
      users: {
        visible: true
      }
    }
  }
}
