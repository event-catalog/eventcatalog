const plugin = require('../lib/index');
const path = require('path');

const run = async () => {
  const asyncAPIPlugin = plugin.default;

  await asyncAPIPlugin(
    {},
    {
      spec: path.join(__dirname, '../src/examples/kafka.yml'),
    }
  );
};

run();
