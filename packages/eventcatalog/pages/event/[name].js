import matter from 'gray-matter'
import { join } from 'path'
import { readFileSync, readdirSync, statSync } from 'fs'

import { serialize } from 'next-mdx-remote/serialize'
import { MDXRemote } from 'next-mdx-remote'

import Editor from '@/components/Mdx/Editor'
import Admonition from '@/components/Mdx/Alert'
import EventFlow from '@/components/EventFlow'

import EventView from '@/components/EventView'

async function getEventById(eventName) {
  const projectDir = process.env.PROJECT_DIR || process.cwd()

  const eventDirectory = join(projectDir, 'events', eventName)

  const eventMarkdownFile = readFileSync(join(eventDirectory, `index.md`), 'utf8')
  const { data, content } = matter(eventMarkdownFile)

  const stats = statSync(join(eventDirectory, `index.md`))
  const lastModifiedDate = new Date(stats.mtime)

  console.log('stats', lastModifiedDate.toISOString())

  const schemaRaw = readFileSync(join(eventDirectory, `schema.json`), 'utf8')
  const schema = JSON.parse(schemaRaw)

  const mdxSource = await serialize(content)

  return {
    event: eventName,
    schema,
    ...data,
    content,
    source: mdxSource,
    lastModifiedDate: `${lastModifiedDate.getFullYear()}/${
      lastModifiedDate.getMonth() + 1
    }/${lastModifiedDate.getDate()}`,
  }
}

export default function Doc(props) {
  const components = {
    Schema: (schemaProps) => {
      return (
        <section className="mt-8 xl:mt-10">
          <div className="pb-4">
            <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
              Schemas & Examples
            </h2>
          </div>
          <Editor value={props.schema} {...schemaProps} />
        </section>
      )
    },
    Admonition,
    EventFlowDiagram: () => {
      return (
        <section className="mt-8 xl:mt-10">
          <div className="pb-4">
            <h2 id="activity-title" className="text-lg font-medium text-gray-900 underline">
              Producers & Consumers
            </h2>
          </div>
          <EventFlow />
        </section>
      )
    },
  }

  return (
    <div>
      <EventView {...props}>
        <MDXRemote {...props.source} components={components} />
      </EventView>
    </div>
  )
}

export async function getStaticProps({ params }) {
  const event = await getEventById(params.name)

  return {
    props: {
      ...event,
    },
  }
}

export async function getStaticPaths() {
  const projectDir = process.env.PROJECT_DIR || process.cwd()

  const folders = readdirSync(join(projectDir, 'events'))
  const files = folders.map((folder) =>
    readFileSync(join(projectDir, 'events', folder, 'index.md'), {
      encoding: 'utf-8',
    })
  )

  const events = files.map((file) => matter(file).data)

  const paths = events.map((event) => ({ params: { name: event.name } }))

  return {
    paths,
    fallback: false,
  }
}
