import { MDXRemoteSerializeResult } from 'next-mdx-remote'

export interface Producer {
  id: string
}

export interface Consumer {
  id: string
}

export interface Person {
  id: string
}

export interface Schema {
  snippet: string,
  language: string
}

export interface User {
  id: string | number
  name: string
  role: string
  summary?: string
  avatarUrl?: string
}

export interface Event {
  name: string
  version: string
  draft?: boolean
  summary?: string
  producers?: [Producer]
  consumers?: [Consumer]
  domains?: [Domain]
  owners?: [Person]
  examples?: any
  schema?: any
}

export interface MarkdownFile {
  content: string
  source: MDXRemoteSerializeResult
  lastModifiedDate: string
}

export interface Domain {
  id: string
  name: string
}

export interface Service {
  id: string
  name: string
  summary: string
  draft?: boolean
  publishes?: [Event] | [],
  subscribes?: [Event] | [],
  owners?: [String] | []
}
