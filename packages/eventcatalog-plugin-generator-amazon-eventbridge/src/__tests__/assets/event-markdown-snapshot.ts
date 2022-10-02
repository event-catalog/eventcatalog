const generatedUserDeletedWithNoRulesOrTargetsMarkdownFile = `---
name: users@UserDeleted
version: '1'
summary: 'Found on the "test-event-bus" Amazon EventBridge bus.'
externalLinks:
    - {label: 'View Schema AWS Console', url: 'https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/registries/discovered-schemas/schemas/users@UserDeleted'}
badges: []
---
No matched rules or targets found for event.
<Schema />
<EventExamples />`;

const generatedUserCreatedEventMarkdownFile = `---
name: users@UserCreated
version: '1'
summary: 'Found on the "test-event-bus" Amazon EventBridge bus.'
externalLinks:
    - {label: 'View Schema AWS Console', url: 'https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/registries/discovered-schemas/schemas/users@UserCreated'}
badges: []
owners: []
---
## Matched rules for event

The event \`users@UserCreated\` has **2** matched rules on the event bus **'test-event-bus'**.  

| Rules | Number Of Targets | Targets | Metrics |
| --- | ------ | ----------- | ----------- |
| [event-to-step-function](https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/eventbus/test-event-bus/rules/event-to-step-function) | 1 | [HelloWorld (stateMachine)](https://eu-west-1.console.aws.amazon.com/states/home?region=eu-west-1) | [View](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#metricsV2:graph=~();query=~'*7bAWS*2fEvents*2cEventBusName*2CRuleName*7d*20RuleName*3d*22event-to-step-function*22*20EventBusName*3d*22test-event-bus*22) |
| [usercreated-to-hello-world](https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/eventbus/test-event-bus/rules/usercreated-to-hello-world) | 1 | [HelloWorld (stateMachine)](https://eu-west-1.console.aws.amazon.com/states/home?region=eu-west-1) | [View](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#metricsV2:graph=~();query=~'*7bAWS*2fEvents*2cEventBusName*2CRuleName*7d*20RuleName*3d*22usercreated-to-hello-world*22*20EventBusName*3d*22test-event-bus*22) |

<Mermaid title="Targets and Rules" charts={[\`flowchart LR
event>"users@UserCreated"]:::event-- fa:fa-filter rule -->event-to-step-function:::rule
classDef event stroke:#ed8ece,stroke-width: 2px, fill:#ffa7e2, color: #160505;
classDef rule stroke:#7b7fcb,stroke-width: 2px, fill: #c0c3ff;
classDef target stroke:#bec9c7,stroke-width: 2px, fill: #dbf3ef;
event-to-step-function{{event-to-step-function}}:::rule-- fa:fa-cloud service:states, resource:stateMachine --> HelloWorld:::target
event>"users@UserCreated"]:::event-- fa:fa-filter rule -->usercreated-to-hello-world:::rule
classDef event stroke:#ed8ece,stroke-width: 2px, fill:#ffa7e2, color: #160505;
classDef rule stroke:#7b7fcb,stroke-width: 2px, fill: #c0c3ff;
classDef target stroke:#bec9c7,stroke-width: 2px, fill: #dbf3ef;
usercreated-to-hello-world{{usercreated-to-hello-world}}:::rule-- fa:fa-cloud service:states, resource:stateMachine --> HelloWorld:::target
\`]}/>

<Schema />

<EventExamples />
    
    `;

export default {
  userCreated: generatedUserCreatedEventMarkdownFile,
  userDeletedWithNoTargetsOrRules: generatedUserDeletedWithNoRulesOrTargetsMarkdownFile,
};
