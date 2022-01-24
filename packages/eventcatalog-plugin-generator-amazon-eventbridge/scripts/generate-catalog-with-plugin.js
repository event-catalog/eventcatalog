const plugin = require('../lib/index');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../', '.env') });

const main = async () => {
  const amazonEventBridgePlugin = plugin.default;

  await amazonEventBridgePlugin(
    { eventCatalogConfig: { title: 'EventCatalog', organizationName: 'Test' } },
    {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      eventBusName: process.env.EVENT_BUS_NAME,
      region: process.env.REGION,
      registryName: process.env.SCHEMA_REGISTRY_NAME,
    }
  );
};

main();
