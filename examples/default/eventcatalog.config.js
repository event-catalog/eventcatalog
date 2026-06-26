import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('../../bin/eventcatalog.config').Config} */
export default {
  cId: '8027010c-f3d6-417a-8234-e2f46087fc56',
  title: 'Acme Inc',
  tagline: 'Discover, Explore and Document your Event Driven Architectures.',
  organizationName: 'Acme Inc',
  homepageLink: 'https://eventcatalog.dev',
  editUrl: 'https://github.com/event-catalog/eventcatalog/edit/main',
  port: 3000,
  outDir: 'dist',
  logo: {
    src: '/logo.png',
    text: 'Acme Inc',
  },

  base: '/',
  trailingSlash: false,

  // Theme: 'default', 'ocean', 'sapphire', 'sunset', 'forest', or custom (defined in eventcatalog.styles.css)
  theme: 'sunset',

  mermaid: {
    enableSupportForElkLayout: true,
    iconPacks: ['logos'],
  },

  rss: {
    enabled: true,
    limit: 15,
  },

  navigation: {
    pages: [
      {
        type: 'group',
        title: 'Domains',
        icon: 'Boxes',
        pages: [
          'domain:catalog',
        ]
      },
      // {
      //   type: 'group',
      //   title: 'Systems',
      //   icon: 'Boxes',
      //   pages: [
      //     'system:core-monolith',
      //   ]
      // },
      // 'list:all',
    ]
  },

  search: {
    type: 'resource',
  },

  visualiser: {
    channels: {
      renderMode: 'flat',
    },
  },

  llmsTxt: {
    enabled: true,
  },
};
