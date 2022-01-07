import fs from 'fs';
import path from 'path';

// eslint-disable-next-line func-names
export default function (req, res) {
  const { name: eventName } = req.query;

  const eventDir = path.join(process.env.PROJECT_DIR, 'events', eventName);

  try {
    // Find the schema file
    const filesInEventDir = fs.readdirSync(eventDir);
    const schemaFileName = filesInEventDir.find((fileName) => fileName.indexOf('schema.') > -1);

    if (schemaFileName) {
      const schemaFile = fs.readFileSync(path.join(eventDir, schemaFileName));
      res.send(schemaFile).end();
    } else {
      res.status(404).end();
    }
  } catch (error) {
    console.log(error);
    res.status(404).end();
  }
}
