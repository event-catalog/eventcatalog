import fs from 'fs'
import path from 'path'

export default function(req, res) {

  const { name: eventName } = req.query;
  res.status(404).end();

  try {
    const projectDir = process.env.PROJECT_DIR || path.join(process.cwd(), 'examples/basic')
    const schema = fs.readFileSync(path.join(projectDir, 'events', eventName, 'schema.json'))
    res.setHeader('Content-Type', 'application/json')
    res.send(schema)  
    res.end();
  } catch (error) {
    console.log(error)
    res.status(404).end();
  }
}