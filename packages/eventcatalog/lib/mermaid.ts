export default class Mermaid {
  script: string

  rootNodeColor: string

  constructor(rootNodeColor) {
    this.script = ''
    this.rootNodeColor = rootNodeColor
  }

  build(): string {
    return `flowchart LR\n
      ${this.script}
      classDef event stroke:${this.rootNodeColor},stroke-width: 4px;\n
      classDef producer stroke:#75d7b6,stroke-width: 2px;\n
      classDef consumer stroke:#818cf8,stroke-width: 2px;\n
    `
  }

  /**
   * add Producer
   * @param left 
   * @param right 
  */
  addProducerFlow(left, right): Mermaid {
    this.script += `l-${left.id}[${left.name}]:::producer-->${right.id}[${right.name}]:::event\n`
    return this
  }

  /**
   * add Consumer
   * @param left 
   * @param right 
  */
  addConsumerFlow(left, right): Mermaid {
    this.script += `${left.id}[${left.name}]:::event-->r-${right.id}[${right.name}]:::consumer\n`
    return this
  }
}