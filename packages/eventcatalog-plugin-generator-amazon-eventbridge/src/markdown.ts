import {
  getAWSConsoleUrlForEventBridgeRule,
  getAWSConsoleUrlForEventBridgeRuleMetrics,
  getAWSConsoleUrlForService,
} from './lib/aws';

const buildRulesAndTargetMermaidGraph = ({ eventName, rules }: any) => `flowchart LR
${rules
  .map(
    (rule: any) => `event>"${eventName}"]:::event-- fa:fa-filter rule -->${rule.name}:::rule
classDef event stroke:#ed8ece,stroke-width: 2px, fill:#ffa7e2, color: #160505;
classDef rule stroke:#7b7fcb,stroke-width: 2px, fill: #c0c3ff;
classDef target stroke:#bec9c7,stroke-width: 2px, fill: #dbf3ef;
${rule.targets
  .map(
    (target: any) =>
      `${rule.name}{{${rule.name}}}:::rule-- fa:fa-cloud service:${target.service}, resource:${target.resource} --> ${target.resourceName}:::target\n`
  )
  .join('')}`
  )
  .join('')}`;

export const buildMarkdownForEventWithoutRules = () => `No matched rules or targets found for event.
<Schema />
<EventExamples />
`;

export const buildMarkdownForEvent = ({ rules, eventBusName, eventName, region }: any) => `## Matched rules for event
${
  rules.length > 0
    ? `
The event \`${eventName}\` has **${rules.length}** matched rules on the event bus **'${eventBusName}'**.  

| Rules | Number Of Targets | Targets | Metrics |
| --- | ------ | ----------- | ----------- |`
    : ''
}
${rules
  .map(
    (rule: any) =>
      `| [${rule?.name}](${getAWSConsoleUrlForEventBridgeRule({ region, eventBusName, ruleName: rule?.name })}) | ${
        rule.targets.length
      } | ${rule.targets
        .map(
          (target: any) =>
            `[${target.resourceName} (${target.resource})](${getAWSConsoleUrlForService({ region, service: target.service })})`
        )
        .join(', ')
        .toString()} | [View](${getAWSConsoleUrlForEventBridgeRuleMetrics({ region, eventBusName, ruleName: rule?.name })}) |`
  )
  .join('\n')}

<Mermaid title="Targets and Rules" charts={[\`${buildRulesAndTargetMermaidGraph({ eventName, rules })}\`]}/>

<Schema />

<EventExamples />
    
    `;
