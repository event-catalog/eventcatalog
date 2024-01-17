// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from "prism-react-renderer";
import * as path from 'path'

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'EventCatalog',
  tagline: 'Discover, Explore and Document your Event Driven Architectures.',
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: 'https://eventcatalog.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "eventcatalog", // Usually your GitHub org/user name.
  projectName: "eventcatalog", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        gtag: {
          trackingID: "G-NGSDGQK7V1",
          anonymizeIP: true,
        },
        docs: {
          sidebarPath: "./sidebars.js",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/boyney123/eventcatalog/edit/master/website/blog/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/boyney123/eventcatalog/edit/master/website/blog/',
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/opengraph.png",
      
      colorMode: {
        defaultMode: "light",
      },
      announcementBar: {
        content:
        '⭐️ If you like EventCatalog, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/boyney123/eventcatalog">GitHub</a>! ⭐️',
      },
      docs: {
        sidebar: {
          autoCollapseCategories: false,
        },
      },
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
            docId: 'api/cli',
            label: 'API',
          },
          {
            href: 'https://serverlessland.com/event-driven-architecture/visuals?ref=eventcatalog.dev',
            label: 'Learn EDA',
            position: 'left',
          },
          {
            type: 'doc',
            position: 'left',
            docId: 'support',
            label: 'Community',
          },
          {
            href: 'https://discord.gg/3rjaZMmrAm',
            label: 'Discord',
            position: 'left',
          },

          {
            href: 'https://app.eventcatalog.dev',
            label: 'Demo',
            position: 'right',
          },
          {
            href: 'https://github.com/boyney123/eventcatalog',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Introduction',
                to: '/docs/introduction',
              },
              {
                label: 'Installation',
                to: '/docs/installation',
              },
              {
                label: 'Guides',
                to: '/docs/events/introduction',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/3rjaZMmrAm',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/boyney123',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/boyney123/eventcatalog',
              },
            ],
          },
        ],
        copyright: `Open Source project built by David Boyne. Built for the community.`,
      },
      prism: {
        theme: prismThemes.nightOwl,
        darkTheme: prismThemes.dracula,
      },
    }),
  plugins: [
    async function myPlugin(context, options) {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          // Appends TailwindCSS and AutoPrefixer.
          postcssOptions.plugins.push(require("tailwindcss"));
          postcssOptions.plugins.push(require("autoprefixer"));
          return postcssOptions;
        },
      };
    },
    () => ({
      name: 'resolve-react',
      configureWebpack() {
        return {
          resolve: {
            alias: {
              // assuming root node_modules is up from "./packages/<your-docusaurus>
              react: path.resolve('./node_modules/react'), 
            },
          },
        };
      },
    }),
  ],
};

export default config;
