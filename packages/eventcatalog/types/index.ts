export interface Producer {
  id: string
}

export interface Consumer {
  id: string
}

export interface Person {
  id: string
}

export interface Event {
  name: string
  version: string
  draft?: boolean
  summary: string
  producers?: [Producer]
  consumers?: [Consumer]
  domains?: [Domain]
  owners: [Person]
  schema: any
}

export interface MarkdownFile {
  content: string
  source: string
  lastModifiedDate: string
}

export interface Domain {
  id: string
  name: string
}

export interface Service {
  id: string
  name: string
  slug: string
  summary: string
  draft: boolean
  listOfEventsServicePublishes?: [String] | []
  listOfEventsServiceSubscribesTo?: [String] | []
  owners?: [String] | []
}
