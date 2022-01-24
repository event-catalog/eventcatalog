const listRules = {
  Rules: [
    {
      Arn: 'arn:aws:events:us-west-1:312708401777:rule/test-event-bus/Schemas-events-event-bus-test-event-bus',
      Description: 'This rule is used to route Events to Schema Discoverer',
      EventBusName: 'test-event-bus',
      EventPattern: '{ "source": [ { "prefix": "aws.partner/" }, { "anything-but": { "prefix": "aws." } } ] }',
      ManagedBy: 'schemas.amazonaws.com',
      Name: 'Schemas-events-event-bus-test-event-bus',
      State: 'ENABLED',
    },
    {
      Arn: 'arn:aws:events:us-west-1:312708401777:rule/test-event-bus/event-to-step-function',
      EventBusName: 'test-event-bus',
      EventPattern: '{\n  "source": ["users"],\n  "detail-type": ["userCreated"]\n}',
      Name: 'event-to-step-function',
      State: 'ENABLED',
    },
    {
      Arn: 'arn:aws:events:us-west-1:312708401777:rule/test-event-bus/usercreated-to-hello-world',
      EventBusName: 'test-event-bus',
      EventPattern: '{\n  "source": ["users"],\n  "detail-type": ["userCreated"]\n}',
      Name: 'usercreated-to-hello-world',
      State: 'ENABLED',
    },
  ],
};

const listTargetsForRules = {
  Targets: [
    {
      Arn: 'arn:aws:states:us-west-1:312708401777:stateMachine:HelloWorld',
      Id: 'Id7cdbd8b6-7863-4a5d-8e6e-9eb58dac31a9',
      RoleArn: 'arn:aws:iam::312708401777:role/service-role/Amazon_EventBridge_Invoke_Step_Functions_913175099',
    },
  ],
};

export default {
  listRules,
  listTargetsForRules,
};
