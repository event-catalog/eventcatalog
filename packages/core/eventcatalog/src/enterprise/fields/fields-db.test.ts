/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FieldsDatabase } from './fields-db';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

describe('FieldsDatabase', () => {
  let db: FieldsDatabase;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fields-db-'));
    db = await FieldsDatabase.create(path.join(tmpDir, 'fields.db'), { recreate: true });
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the schema tables on initialization', () => {
    const rows = db.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = rows.length > 0 ? rows[0].values.map((r: any) => r[0]) : [];
    expect(tableNames).toContain('fields');
    expect(tableNames).toContain('message_producers');
    expect(tableNames).toContain('message_consumers');
  });

  it('inserts fields and retrieves them with pagination', () => {
    db.insertField({
      path: 'orderId',
      type: 'string',
      description: 'The order ID',
      required: true,
      schemaFormat: 'json-schema',
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    db.insertField({
      path: 'amount',
      type: 'number',
      description: '',
      required: false,
      schemaFormat: 'json-schema',
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    const result = db.queryFields({});
    expect(result.fields).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('filters fields by text search matching field path', () => {
    db.insertField({
      path: 'orderId',
      type: 'string',
      description: '',
      required: true,
      schemaFormat: 'json-schema',
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    db.insertField({
      path: 'amount',
      type: 'number',
      description: '',
      required: false,
      schemaFormat: 'json-schema',
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    const result = db.queryFields({ q: 'orderId' });
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0].path).toBe('orderId');
  });

  it('filters fields that appear in multiple messages when shared flag is set', () => {
    db.insertField({
      path: 'customerId',
      type: 'string',
      description: '',
      required: true,
      schemaFormat: 'json-schema',
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    db.insertField({
      path: 'customerId',
      type: 'string',
      description: '',
      required: true,
      schemaFormat: 'json-schema',
      messageId: 'PaymentProcessed',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    db.insertField({
      path: 'amount',
      type: 'number',
      description: '',
      required: false,
      schemaFormat: 'json-schema',
      messageId: 'PaymentProcessed',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    const result = db.queryFields({ shared: true });
    expect(result.fields.every((f) => f.path === 'customerId')).toBe(true);
  });

  it('returns facet counts reflecting current filters', () => {
    db.insertField({
      path: 'orderId',
      type: 'string',
      description: '',
      required: true,
      schemaFormat: 'json-schema',
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    db.insertField({
      path: 'status',
      type: 'string',
      description: '',
      required: true,
      schemaFormat: 'avro',
      messageId: 'OrderUpdated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    const result = db.queryFields({});
    expect(result.facets.formats).toContainEqual({ value: 'json-schema', count: 1 });
    expect(result.facets.formats).toContainEqual({ value: 'avro', count: 1 });
  });

  it('paginates results using keyset cursor', () => {
    for (let i = 0; i < 5; i++) {
      db.insertField({
        path: `field${i}`,
        type: 'string',
        description: '',
        required: false,
        schemaFormat: 'json-schema',
        messageId: 'TestMsg',
        messageVersion: '1.0.0',
        messageType: 'event',
      });
    }
    const page1 = db.queryFields({ pageSize: 2 });
    expect(page1.fields).toHaveLength(2);
    expect(page1.cursor).toBeDefined();
    const page2 = db.queryFields({ pageSize: 2, cursor: page1.cursor });
    expect(page2.fields).toHaveLength(2);
    expect(page2.fields[0].path).not.toBe(page1.fields[0].path);
  });

  it('joins producer and consumer data for each field', () => {
    db.insertField({
      path: 'orderId',
      type: 'string',
      description: '',
      required: true,
      schemaFormat: 'json-schema',
      messageId: 'OrderCreated',
      messageVersion: '1.0.0',
      messageType: 'event',
    });
    db.insertProducer('OrderCreated', '1.0.0', 'OrderService', '1.0.0');
    db.insertConsumer('OrderCreated', '1.0.0', 'InventoryService', '2.0.0');
    const result = db.queryFields({});
    expect(result.fields[0].producers).toEqual([{ id: 'OrderService', version: '1.0.0' }]);
    expect(result.fields[0].consumers).toEqual([{ id: 'InventoryService', version: '2.0.0' }]);
  });
});
