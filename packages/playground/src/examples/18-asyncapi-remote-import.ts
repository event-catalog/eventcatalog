import type { Example } from './types';

export const example: Example = {
  name: 'AsyncAPI Remote Import',
  description: 'Import events and channels from a remote AsyncAPI spec via URL',
  source: {
    'main.ec': `import events { lightMeasured, turnOnOff, dimLight } from "https://raw.githubusercontent.com/asyncapi/spec/master/examples/streetlights-kafka-asyncapi.yml"
import channels { lightingMeasured, lightTurnOn, lightsDim } from "https://raw.githubusercontent.com/asyncapi/spec/master/examples/streetlights-kafka-asyncapi.yml"

visualizer main {
  name "Streetlights (Remote AsyncAPI Import)"

  service StreetlightsAPI {
    version 1.0.0
    summary "Controls city streetlight infrastructure"

    sends event lightMeasured to lightingMeasured
    receives event turnOnOff from lightTurnOn
    receives event dimLight from lightsDim
  }

  service LightingDashboard {
    version 1.0.0
    summary "Monitoring dashboard for streetlights"

    receives event lightMeasured from lightingMeasured
  }

  service LightController {
    version 1.0.0
    summary "Automated light control system"

    sends event turnOnOff to lightTurnOn
    sends event dimLight to lightsDim
  }
}
`,
  },
};
