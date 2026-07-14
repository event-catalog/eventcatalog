import { describe, expect, it } from 'vitest';
import { getMessagesWithTriggerPaths, getTriggeredByOfMessage, getTriggersOfMessage } from '@utils/collections/message-triggers';

const message = (collection: 'events' | 'commands' | 'queries', id: string, version: string, latestVersion: string = version) =>
  ({ id, collection, data: { id, version, latestVersion } }) as any;
const service = (id: string, receives: any[]) =>
  ({ id, collection: 'services', data: { id, version: '1.0.0', receives } }) as any;
const domain = (id: string, receives: any[]) => ({ id, collection: 'domains', data: { id, version: '1.0.0', receives } }) as any;
const agent = (id: string, receives: any[]) => ({ id, collection: 'agents', data: { id, version: '1.0.0', receives } }) as any;

const userCreated = message('events', 'UserCreated', '1.0.0');
const previousUserCreated = message('events', 'UserCreated', '0.5.0', '1.0.0');
const userCreationFailed = message('events', 'UserCreationFailed', '1.0.0');
const createUser = message('commands', 'CreateUser', '2.0.0');
const getUser = message('queries', 'GetUser', '1.0.0');
const refreshUser = message('commands', 'RefreshUser', '1.0.0');
const allMessages = [userCreated, previousUserCreated, userCreationFailed, createUser, getUser, refreshUser];

describe('getTriggersOfMessage', () => {
  it('returns every message triggered when a service receives the source message', () => {
    const userService = service('UserService', [
      {
        id: 'CreateUser',
        version: '2.0.0',
        triggers: [
          { id: 'UserCreated', version: 'latest', condition: 'on success' },
          { id: 'UserCreationFailed', version: '1.0.0' },
        ],
      },
    ]);

    expect(getTriggersOfMessage([userService], createUser, allMessages)).toEqual([
      { receiver: userService, message: userCreated, condition: 'on success' },
      { receiver: userService, message: userCreationFailed, condition: undefined },
    ]);
  });

  it('allows queries to trigger commands', () => {
    const userService = service('UserService', [
      { id: 'GetUser', version: '1.0.0', triggers: [{ id: 'RefreshUser', version: '1.0.0' }] },
    ]);

    expect(getTriggersOfMessage([userService], getUser, allMessages)).toEqual([
      { receiver: userService, message: refreshUser, condition: undefined },
    ]);
  });

  it('finds relationships declared by domains', () => {
    const usersDomain = domain('Users', [
      { id: 'CreateUser', version: '2.0.0', triggers: [{ id: 'UserCreated', version: '1.0.0' }] },
    ]);

    expect(getTriggersOfMessage([usersDomain], createUser, allMessages)).toEqual([
      { receiver: usersDomain, message: userCreated, condition: undefined },
    ]);
  });

  it('finds relationships declared by agents', () => {
    const userAgent = agent('UserAgent', [
      { id: 'GetUser', version: '1.0.0', triggers: [{ id: 'RefreshUser', version: '1.0.0' }] },
    ]);

    expect(getTriggersOfMessage([userAgent], getUser, allMessages)).toEqual([
      { receiver: userAgent, message: refreshUser, condition: undefined },
    ]);
  });

  it('supports semver ranges on the received message', () => {
    const userService = service('UserService', [
      { id: 'CreateUser', version: '^2.0.0', triggers: [{ id: 'UserCreated', version: 'latest' }] },
    ]);

    expect(getTriggersOfMessage([userService], createUser, allMessages)).toHaveLength(1);
  });

  it('only matches a latest receive pointer against the latest source version', () => {
    const userService = service('UserService', [
      { id: 'UserCreated', version: 'latest', triggers: [{ id: 'RefreshUser', version: 'latest' }] },
    ]);

    expect(getTriggersOfMessage([userService], previousUserCreated, allMessages)).toEqual([]);
  });

  it('ignores trigger pointers that do not resolve to a message', () => {
    const userService = service('UserService', [
      { id: 'CreateUser', version: '2.0.0', triggers: [{ id: 'DoesNotExist', version: 'latest' }] },
    ]);

    expect(getTriggersOfMessage([userService], createUser, allMessages)).toEqual([]);
  });
});

describe('getTriggeredByOfMessage', () => {
  it('returns every message that can trigger the target message', () => {
    const userService = service('UserService', [
      {
        id: 'CreateUser',
        version: '2.0.0',
        triggers: [{ id: 'UserCreated', version: '1.0.0', condition: 'on success' }],
      },
    ]);

    expect(getTriggeredByOfMessage([userService], userCreated, allMessages)).toEqual([
      { receiver: userService, message: createUser, condition: 'on success' },
    ]);
  });

  it('resolves reverse relationships across arbitrary message types', () => {
    const userService = service('UserService', [
      { id: 'GetUser', version: 'latest', triggers: [{ id: 'RefreshUser', version: 'latest' }] },
    ]);

    expect(getTriggeredByOfMessage([userService], refreshUser, allMessages)).toEqual([
      { receiver: userService, message: getUser, condition: undefined },
    ]);
  });

  it('only matches a latest trigger pointer against the latest target version', () => {
    const userService = service('UserService', [
      { id: 'CreateUser', version: 'latest', triggers: [{ id: 'UserCreated', version: 'latest' }] },
    ]);

    expect(getTriggeredByOfMessage([userService], previousUserCreated, allMessages)).toEqual([]);
  });
});

describe('getMessagesWithTriggerPaths', () => {
  it('returns source and target messages but excludes messages without resolved paths', () => {
    const userService = service('UserService', [
      { id: 'CreateUser', version: '2.0.0', triggers: [{ id: 'UserCreated', version: '1.0.0' }] },
    ]);

    expect(getMessagesWithTriggerPaths([userService], allMessages)).toEqual([userCreated, createUser]);
  });

  it('returns no messages when trigger pointers do not resolve', () => {
    const userService = service('UserService', [
      { id: 'CreateUser', version: '2.0.0', triggers: [{ id: 'MissingMessage', version: '1.0.0' }] },
    ]);

    expect(getMessagesWithTriggerPaths([userService], allMessages)).toEqual([]);
  });
});
