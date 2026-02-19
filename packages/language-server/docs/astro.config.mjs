import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "EventCatalog Modeling",
      description:
        "Use .ec files to model architecture quickly and sync to and from EventCatalog with the CLI.",
      social: {
        github: "https://github.com/event-catalog/eventcatalog",
      },
      components: {
        PageTitle: "./src/components/PageTitle.astro",
        MarkdownContent: "./src/components/MarkdownContent.astro",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [{ slug: "get-started/tutorial" }],
        },
        {
          label: "Introduction",
          items: [
            { label: "Overview", link: "/" },
            { slug: "why-ec" },
            { label: "CLI", slug: "get-started/cli-setup" },
          ],
        },
        {
          label: "Import & Export",
          items: [
            { slug: "guides/importing-ec" },
            { slug: "guides/exporting-ec" },
          ],
        },
        {
          label: "Guides",
          items: [
            { slug: "guides/from-design-to-documentation" },
            { slug: "guides/designing-target-architectures" },
            { slug: "guides/getting-feedback-from-designs" },
            { slug: "guides/remote-fetching-models" },
            { slug: "guides/using-ai-to-generate-diagrams" },
          ],
        },
        {
          label: "Models",
          items: [
            { slug: "resources/domains" },
            { slug: "resources/services" },
            { slug: "resources/messages" },
            { slug: "resources/channels" },
            { slug: "resources/databases" },
            { label: "Data Producers", slug: "resources/data-products" },
            { slug: "resources/teams-and-users" },
          ],
        },
        {
          label: "Annotations",
          items: [
            { slug: "annotations/notes" },
            { slug: "annotations/badges" },
            { slug: "annotations/repository-links" },
          ],
        },
        {
          label: "Examples",
          items: [
            { slug: "examples/playground/payment-domain" },
            { slug: "examples/playground/order-service-showcase" },
            { slug: "examples/playground/minimal-service" },
            { slug: "examples/playground/e-commerce-platform" },
            { slug: "examples/playground/event-driven-saga" },
            { slug: "examples/playground/post-it-style" },
            { slug: "examples/playground/data-products" },
            { slug: "examples/playground/multi-file-with-imports" },
            { slug: "examples/playground/remote-url-imports" },
            { slug: "examples/playground/banking-with-subdomains" },
            { slug: "examples/playground/planning-future-services" },
            { slug: "examples/playground/enterprise-e-commerce" },
            { slug: "examples/playground/notes-and-annotations" },
            { slug: "examples/playground/channel-routing" },
            { slug: "examples/playground/aws-event-pipeline" },
            { slug: "examples/playground/flow-order-fulfillment" },
            { slug: "examples/playground/flow-e-commerce-checkout" },
          ],
        },
        {
          label: "Specification",
          items: [
            { slug: "reference/dsl-spec" },
            { slug: "reference/command-cheatsheet" },
          ],
        },
      ],
    }),
  ],
});
