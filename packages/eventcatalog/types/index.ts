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
  draft?: boolean;
  summary: string
  producers?: [Producer]
  consumers?: [Consumer]
  domains?: [Domain]
  owners: [Person]
}

export interface Domain {
  id: string
  name: string
}

export interface Service {
  name: string
}
