import type { Example } from './types';

export const example: Example = {
  name: 'Minimal Service',
  group: 'Getting Started',
  description: 'Simplest possible service definition',
  source: {
    'main.ec': `visualizer main {
  service UserService {
    version 1.0.0
    summary "Manages user accounts"

    sends event UserCreated
    sends event UserUpdated

    receives command CreateUser
    receives command UpdateUser
    receives query GetUser
  }
}
`,
  },
};
