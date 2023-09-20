export default class Mermaid {
  script: string;

  rootNodeColor: string;

  constructor(rootNodeColor) {
    this.script = '';
    this.rootNodeColor = rootNodeColor;
  }

  build(): string {
    return `flowchart LR\n
      ${this.script}\n
      classDef event stroke:${this.rootNodeColor},stroke-width: 4px;\n
      classDef producer stroke:#75d7b6,stroke-width: 2px;\n
      classDef consumer stroke:#818cf8,stroke-width: 2px;\n
    `;
  }

  /**
   * add Producer
   * @param left
   * @param right
   */
  addProducerFlow(left, right): Mermaid {
    this.script += `l-${left.id}[${left.name}]:::producer-->${right.id}[${right.name}]:::event\n`;
    this.script += `click l-${left.id} href "${left.link}" "Go to ${left.name}" _self\n`;
    this.script += `click ${right.id} href "${right.link}" "Go to ${right.name}" _self\n`;
    return this;
  }

  /**
   * add Consumer
   * @param left
   * @param right
   */
  addConsumerFlow(left, right): Mermaid {
    this.script += `${left.id}[${left.name}]:::event-->r-${right.id}[${right.name}]:::consumer\n`;
    this.script += `click r-${right.id} href "${right.link}" "Go to ${right.name}" _self\n`;

    return this;
  }
}
