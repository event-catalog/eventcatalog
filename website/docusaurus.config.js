// @ts-check

const theme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'EventCatalog',
  tagline: 'Dinosaurs are cool',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.
  plugins: ['my-loaders'],
  scripts: ['https://unpkg.com/browse/leader-line@1.0.7/leader-line.min.js'],
  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/facebook/docusaurus/edit/main/website/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl: 'https://github.com/facebook/docusaurus/edit/main/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'EventCatalog',
        logo: {
          alt: 'EventCatalog Logo',
          src: 'img/logo.svg',
        },

        items: [
          {
            type: 'doc',
            docId: 'introduction',
            position: 'left',
            label: 'Docs',
          },
          {
            type: 'doc',
            position: 'left',
            docId: 'cli',
            label: 'API',
          },

          { to: '/blog', label: 'Blog', position: 'left' },
          {
            type: 'doc',
            position: 'left',
            docId: 'support',
            label: 'Community',
          },
          {
            href: 'https://github.com/boyney123/eventcatalog',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      announcementBar: {
        content:
          '⭐️ If you like EventCatalog, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/boyney123/eventcatalog">GitHub</a>! ⭐️',
      },
      colorMode: {
        disableSwitch: true,
        defaultMode: 'light',
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Docs',
                to: '/docs/introduction',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/docusaurus',
              },
              {
                label: 'Discord',
                href: 'https://discordapp.com/invite/docusaurus',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/docusaurus',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/facebook/docusaurus',
              },
            ],
          },
        ],
        copyright: `Open Source project, EventCatalog. Built for the community.`,
      },
      prism: {
        theme: theme,
        darkTheme: theme,
      },
    }),
};

module.exports = config;
