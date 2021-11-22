import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export const getAllEvents = () => {
  const projectDir = process.env.PROJECT_DIR || process.cwd()

  const folders = fs.readdirSync(path.join(projectDir, 'events'))
  const files = folders.map((folder) =>
    fs.readFileSync(path.join(projectDir, 'events', folder, 'index.md'), {
      encoding: 'utf-8',
    })
  )

  return files.map((file) => matter(file).data)
}

export const getAllDomainsFromEvents = (events) => {
  return events.reduce((domains, event) => {
    return domains.concat(event.domains)
  }, [])
}

export const getAllServicesFromEvents = (events) => {

  const allConsumersAndProducers = events.reduce((domains, event) => {
    return domains.concat(event.consumers).concat(event.producers)
  }, [])

  return allConsumersAndProducers.map((service) => service.id)

}