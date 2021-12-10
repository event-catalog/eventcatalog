import fs from 'fs';
import path from 'path';

export default function (req, res) {
  const { name: eventName } = req.query;
  res.status(404).end();

  const eventsDir = './';

  try {
    const schema = fs.readFileSync(path.join(eventsDir, eventName, 'schema.json'));
    res.setHeader('Content-Type', 'application/json');
    res.send(schema);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(404).end();
  }
}
