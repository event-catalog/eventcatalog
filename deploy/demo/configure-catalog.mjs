// Turns the default example's config into the demo's: server output with Studio on, the AI chat off, and the demo's
// addresses trusted behind Fly's proxy (or links Studio makes, like a new canvas's, point at localhost). Its settings
// are kept, and these go last so they win.
import fs from "node:fs";

const [configFile] = process.argv.slice(2);
const source = fs.readFileSync(configFile, "utf8");

if (!source.includes("export default {")) {
  throw new Error(
    `${configFile} doesn't start its config with "export default {", so the demo can't change it`,
  );
}

fs.writeFileSync(
  configFile,
  `${source.replace("export default {", "const config = {")}
export default {
  ...config,
  output: 'server',
  studio: { enabled: true },
  chat: { enabled: false },
  security: {
    allowedDomains: [
      { hostname: 'eventcatalog-demo.fly.dev', protocol: 'https' },
      { hostname: 'demo.eventcatalog.dev', protocol: 'https' },
    ],
  },
};
`,
);
