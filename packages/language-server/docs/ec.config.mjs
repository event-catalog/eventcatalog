import { defineEcConfig } from "@astrojs/starlight/expressive-code";
import {
  addClassName,
  h,
  select,
} from "@astrojs/starlight/expressive-code/hast";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";

const ecLanguageGrammar = JSON.parse(
  readFileSync(
    new URL("../syntaxes/ec.tmLanguage.json", import.meta.url),
    "utf-8",
  ),
);
const playgroundBaseUrl = "https://playground.eventcatalog.dev/?code=";

const isEcLanguage = (language) =>
  language === "ec" || language === "eventcatalog";

const ecPlaygroundPlugin = {
  name: "EventCatalog Modelling Link",
  baseStyles: `
	.frame.is-ec :nth-child(1 of .ec-line) .code {
		padding-inline-end: calc(14rem + var(--ec-codePaddingInline));
	}

	.frame.is-ec .copy .open-in-playground {
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 11.5rem;
		height: 2.5rem;
		padding: 0 0.8rem;
		border-radius: 0.2rem;
		border: var(--ec-borderWidth) solid color-mix(in srgb, var(--ec-frames-inlineButtonBorder) 40%, transparent);
		background: color-mix(in srgb, var(--ec-frames-inlineButtonBackground) 25%, transparent);
		color: var(--ec-frames-inlineButtonForeground);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		text-decoration: none;
		opacity: 0.75;
		transition-property: opacity, background, border-color;
		transition-duration: 0.2s;
		transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.frame.is-ec .copy .open-in-playground:hover,
	.frame.is-ec .copy .open-in-playground:focus-visible {
		opacity: 1;
		background: color-mix(in srgb, var(--ec-frames-inlineButtonBackground) 40%, transparent);
	}

	@media (hover: hover) {
		.frame.is-ec .copy .open-in-playground {
			opacity: 0;
			height: 2rem;
			min-width: 11rem;
		}

		.frame.is-ec:hover .copy .open-in-playground:not(:hover),
		.frame.is-ec:focus-within :focus-visible ~ .copy .open-in-playground:not(:hover),
		.frame.is-ec .copy .feedback.show ~ .open-in-playground:not(:hover) {
			opacity: 0.75;
		}
	}
`,
  hooks: {
    preprocessCode: ({ codeBlock }) => {
      if (!isEcLanguage(codeBlock.language)) return;
      if (!codeBlock.props.title) {
        codeBlock.props.title = "main.ec";
      }
    },
    postprocessRenderedBlock: ({ codeBlock, renderData }) => {
      if (!isEcLanguage(codeBlock.language)) return;

      addClassName(renderData.blockAst, "is-ec");
      const copyToolbar = select("div.copy", renderData.blockAst);
      if (!copyToolbar) return;

      const encoded = encodeURIComponent(
        Buffer.from(codeBlock.code, "utf-8").toString("base64"),
      );
      copyToolbar.children.push(
        h(
          "a",
          {
            className: "open-in-playground",
            href: `${playgroundBaseUrl}${encoded}`,
            target: "_blank",
            rel: "noopener noreferrer",
            title: "Open in EventCatalog Modelling",
            "aria-label": "Open in EventCatalog Modelling",
          },
          "EventCatalog Modelling",
        ),
      );
    },
  },
};

export default defineEcConfig({
  shiki: {
    langs: [ecLanguageGrammar],
    langAlias: {
      eventcatalog: "ec",
      ebnf: "txt",
    },
  },
  plugins: [ecPlaygroundPlugin],
});
