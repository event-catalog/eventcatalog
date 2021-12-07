import fs from 'fs'
import path from 'path'
import config from '../../../../eventcatalog.config'

export default function (req, res) {
  const { name: eventName } = req.query
  res.status(404).end()

  const eventsDir = config.eventsDir || './'

  try {
    const schema = fs.readFileSync(path.join(eventsDir, eventName, 'schema.json'))
    res.setHeader('Content-Type', 'application/json')
    res.send(schema)
    res.end()
  } catch (error) {
    console.log(error)
    res.status(404).end()
  }
}
