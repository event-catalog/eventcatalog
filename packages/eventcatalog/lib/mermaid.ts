export default class Mermaid {
  script: String
  rootNodeColor: String

  constructor(rootNodeColor) {
    this.script = ''
    this.rootNodeColor = rootNodeColor
  }

  build(): String {
    return `flowchart LR\n
      ${this.script}
      classDef event stroke:${this.rootNodeColor},stroke-width: 4px;\n
      classDef producer stroke:#75d7b6,stroke-width: 2px;\n
      classDef consumer stroke:#818cf8,stroke-width: 2px;\n
    `
  }

  addProducerFlow(left, right): Mermaid {
    this.script += `l-${left.id}[${left.name}]:::producer-->${right.id}[${right.name}]:::event\n`
    return this
  }

  addConsumerFlow(left, right): Mermaid{
    this.script += `${left.id}[${left.name}]:::event-->r-${right.id}[${right.name}]:::consumer\n`
    return this
  }
}