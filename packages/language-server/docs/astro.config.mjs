import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "EventCatalog Compass",
      description:
        "Use .ec files to model architecture quickly and sync to and from EventCatalog with the CLI.",
      social: {
        github: "https://github.com/event-catalog/eventcatalog",
      },
      head: [
        {
          tag: "script",
          content: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('phc_HQZncKORYsXgO87WuSjSdKbQSTzylljE6HTtUw0fBIH',{api_host:'https://e.eventcatalog.dev/relay-fBIH',capture_performance:false})`,
        },
      ],
      components: {
        PageTitle: "./src/components/PageTitle.astro",
        MarkdownContent: "./src/components/MarkdownContent.astro",
        SiteTitle: "./src/components/SiteTitle.astro",
        Header: "./src/components/Header.astro",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [{ slug: "get-started/tutorial" }],
        },
        {
          label: "EventCatalog Compass",
          items: [{ label: "Overview", link: "/" }],
        },
        {
          label: "Models",
          items: [
            { slug: "resources/domains" },
            { slug: "resources/services" },
            { slug: "resources/messages" },
            { slug: "resources/channels" },
            { label: "Containers", slug: "resources/databases" },
            { slug: "resources/flows" },
            { label: "Data Products", slug: "resources/data-products" },
            { slug: "resources/teams-and-users" },
          ],
        },
        {
          label: "Annotations",
          items: [{ slug: "annotations/notes" }],
        },
        {
          label: "Importing Resources",
          items: [
            { slug: "guides/import-from-asyncapi" },
            { slug: "guides/import-from-openapi" },
            { slug: "guides/import-from-eventcatalog" },
            { slug: "guides/import-from-ec-files" },
          ],
        },
        {
          label: "Exporting Resources",
          items: [
            { slug: "guides/export-to-eventcatalog" },
            { slug: "guides/export-to-static-site" },
          ],
        },
        {
          label: "Tooling",
          items: [{ slug: "tooling/editors" }, { slug: "tooling/cli" }],
        },
        {
          label: "Specification",
          items: [
            { slug: "reference/dsl-spec" },
            { slug: "reference/command-cheatsheet" },
          ],
        },
        {
          label: "Changelog",
          items: [
            {
              label: "Releases",
              link: "https://github.com/event-catalog/eventcatalog/releases",
              attrs: { target: "_blank", rel: "noopener noreferrer" },
            },
          ],
        },
      ],
    }),
  ],
});
