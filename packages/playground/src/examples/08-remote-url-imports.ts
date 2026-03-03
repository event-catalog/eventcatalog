import type { Example } from './types';

export const example: Example = {
  name: 'Remote URL Imports',
  group: 'DSL Features',
  description: 'Import definitions from remote URLs (GitHub, Gist, etc.)',
  source: {
    'main.ec': `import { PaymentService, PaymentProcessed, PaymentFailed } from "https://gist.githubusercontent.com/boyney123/f5aa33c20a656f6c1d9dbba7f30f5569/raw/a8a6830f19649ded18221c69525a73016364b63a/gistfile1.txt"

visualizer main {
  name "Remote Import Example"

  channel EventStream {
    version 1.0.0
    address "events.stream"
    protocol "rabbitmq"
  }

  service PaymentService

  service NotificationService {
    version 1.0.0
    summary "Sends payment notifications"

    receives event PaymentProcessed from EventStream

    receives event PaymentFailed from EventStream

    sends event EmailSent {
      version 1.0.0
      summary "Notification email sent to customer"
    }
  }
}
`,
  },
};
