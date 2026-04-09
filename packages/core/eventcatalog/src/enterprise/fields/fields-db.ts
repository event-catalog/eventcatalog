/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'node:fs';

export interface FieldRow {
  path: string;
  type: string;
  description: string;
  required: boolean;
  schemaFormat: string;
  messageId: string;
  messageVersion: string;
  messageType: string;
}

export interface ServiceRef {
  id: string;
  version: string;
  name?: string;
  summary?: string;
  owners?: string[];
}

export interface TypeConflict {
  type: string;
  count: number;
}

export interface FieldResult {
  id: number;
  path: string;
  type: string;
  description: string;
  required: boolean;
  schemaFormat: string;
  messageId: string;
  messageVersion: string;
  messageType: string;
  messageOwners?: string[];
  usedInCount?: number;
  conflicts?: TypeConflict[];
  producers: ServiceRef[];
  consumers: ServiceRef[];
}

export interface FacetEntry {
  value: string;
  count: number;
}

export interface QueryFieldsResult {
  fields: FieldResult[];
  total: number;
  cursor?: string;
  facets: {
    formats: FacetEntry[];
    types: FacetEntry[];
    messageTypes: FacetEntry[];
  };
}

export interface QueryFieldsParams {
  q?: string;
  shared?: boolean;
  conflicting?: boolean;
  format?: string;
  type?: string;
  messageType?: string;
  message?: string;
  producer?: string;
  consumer?: string;
  required?: boolean;
  path?: string;
  pageSize?: number;
  cursor?: string;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    required INTEGER NOT NULL DEFAULT 0,
    schema_format TEXT NOT NULL,
    message_id TEXT NOT NULL,
    message_version TEXT NOT NULL,
    message_type TEXT NOT NULL,
    message_name TEXT NOT NULL DEFAULT '',
    message_summary TEXT NOT NULL DEFAULT '',
    message_owners TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS message_producers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL,
    message_version TEXT NOT NULL,
    service_id TEXT NOT NULL,
    service_version TEXT NOT NULL,
    service_name TEXT NOT NULL DEFAULT '',
    service_summary TEXT NOT NULL DEFAULT '',
    service_owners TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS message_consumers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL,
    message_version TEXT NOT NULL,
    service_id TEXT NOT NULL,
    service_version TEXT NOT NULL,
    service_name TEXT NOT NULL DEFAULT '',
    service_summary TEXT NOT NULL DEFAULT '',
    service_owners TEXT NOT NULL DEFAULT '[]'
  );

  CREATE INDEX IF NOT EXISTS idx_fields_path ON fields(path);
  CREATE INDEX IF NOT EXISTS idx_fields_message ON fields(message_id, message_version);
  CREATE INDEX IF NOT EXISTS idx_producers_message ON message_producers(message_id, message_version);
  CREATE INDEX IF NOT EXISTS idx_consumers_message ON message_consumers(message_id, message_version);
`;

/** Helper: run a SELECT and return rows as plain objects */
function queryAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/** Helper: run a SELECT and return the first row as a plain object */
function queryOne(db: SqlJsDatabase, sql: string, params: any[] = []): any {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

export class FieldsDatabase {
  public db: SqlJsDatabase;
  private dbPath: string;

  private constructor(db: SqlJsDatabase, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
  }

  static async create(dbPath: string, options?: { recreate?: boolean }): Promise<FieldsDatabase> {
    if (options?.recreate && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    const SQL = await initSqlJs();
    let db: SqlJsDatabase;

    if (!options?.recreate && fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }

    db.run(SCHEMA_SQL);

    return new FieldsDatabase(db, dbPath);
  }

  insertField(field: FieldRow & { messageName?: string; messageSummary?: string; messageOwners?: string[] }): void {
    this.db.run(
      `INSERT INTO fields (path, type, description, required, schema_format, message_id, message_version, message_type, message_name, message_summary, message_owners)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        field.path,
        field.type,
        field.description,
        field.required ? 1 : 0,
        field.schemaFormat,
        field.messageId,
        field.messageVersion,
        field.messageType,
        field.messageName || '',
        field.messageSummary || '',
        JSON.stringify(field.messageOwners || []),
      ]
    );
  }

  insertProducer(
    messageId: string,
    messageVersion: string,
    serviceId: string,
    serviceVersion: string,
    serviceName?: string,
    serviceSummary?: string,
    serviceOwners?: string[]
  ): void {
    this.db.run(
      `INSERT INTO message_producers (message_id, message_version, service_id, service_version, service_name, service_summary, service_owners)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        messageVersion,
        serviceId,
        serviceVersion,
        serviceName || '',
        serviceSummary || '',
        JSON.stringify(serviceOwners || []),
      ]
    );
  }

  insertConsumer(
    messageId: string,
    messageVersion: string,
    serviceId: string,
    serviceVersion: string,
    serviceName?: string,
    serviceSummary?: string,
    serviceOwners?: string[]
  ): void {
    this.db.run(
      `INSERT INTO message_consumers (message_id, message_version, service_id, service_version, service_name, service_summary, service_owners)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        messageVersion,
        serviceId,
        serviceVersion,
        serviceName || '',
        serviceSummary || '',
        JSON.stringify(serviceOwners || []),
      ]
    );
  }

  /** Save the in-memory database to disk */
  save(): void {
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  queryFields(params: QueryFieldsParams): QueryFieldsResult {
    const {
      q,
      shared,
      conflicting,
      format,
      type,
      messageType,
      message,
      producer,
      consumer,
      required,
      path: fieldPath,
      pageSize = 50,
      cursor,
    } = params;

    const conditions: string[] = [];
    const bindings: any[] = [];

    // Exact field path filter
    if (fieldPath) {
      conditions.push(`f.path = ?`);
      bindings.push(fieldPath);
    }

    // Text search using LIKE (replaces FTS5)
    if (q) {
      conditions.push(`(f.path LIKE ? ESCAPE '\\' OR f.description LIKE ? ESCAPE '\\' OR f.type LIKE ? ESCAPE '\\')`);
      const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const term = `%${escaped}%`;
      bindings.push(term, term, term);
    }

    // Facet filters (support comma-separated multi-select)
    if (format) {
      const formats = format
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      conditions.push(`f.schema_format IN (${formats.map(() => '?').join(', ')})`);
      bindings.push(...formats);
    }
    if (type) {
      conditions.push(`f.type = ?`);
      bindings.push(type);
    }
    if (messageType) {
      const types = messageType
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      conditions.push(`f.message_type IN (${types.map(() => '?').join(', ')})`);
      bindings.push(...types);
    }
    if (message) {
      conditions.push(`f.message_id = ?`);
      bindings.push(message);
    }
    if (required) {
      conditions.push(`f.required = 1`);
    }
    if (producer) {
      conditions.push(
        `EXISTS (SELECT 1 FROM message_producers p WHERE p.message_id = f.message_id AND p.message_version = f.message_version AND p.service_id = ?)`
      );
      bindings.push(producer);
    }
    if (consumer) {
      conditions.push(
        `EXISTS (SELECT 1 FROM message_consumers c WHERE c.message_id = f.message_id AND c.message_version = f.message_version AND c.service_id = ?)`
      );
      bindings.push(consumer);
    }

    // Shared fields filter: only fields whose path appears in more than one distinct message
    if (shared) {
      const sharedSubquery = `SELECT path FROM fields GROUP BY path HAVING COUNT(DISTINCT message_id || '/' || message_version) > 1`;
      conditions.push(`f.path IN (${sharedSubquery})`);
    }

    // Conflicting fields filter: only fields whose path has multiple distinct types
    if (conflicting) {
      const conflictSubquery = `SELECT path FROM fields GROUP BY path HAVING COUNT(DISTINCT type) > 1`;
      conditions.push(`f.path IN (${conflictSubquery})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Cursor-based pagination
    const cursorConditions: string[] = [];
    const cursorBindings: any[] = [];
    if (cursor) {
      const lastId = decodeCursor(cursor);
      cursorConditions.push(`f.id > ?`);
      cursorBindings.push(lastId);
    }

    const paginationWhere =
      cursorConditions.length > 0
        ? whereClause
          ? `${whereClause} AND ${cursorConditions.join(' AND ')}`
          : `WHERE ${cursorConditions.join(' AND ')}`
        : whereClause;

    // Total count (without pagination)
    const countSql = `SELECT COUNT(*) as cnt FROM fields f ${whereClause}`;
    const total = (queryOne(this.db, countSql, bindings) as any).cnt;

    // Main query with pagination
    const mainSql = `SELECT f.* FROM fields f ${paginationWhere} ORDER BY f.id ASC LIMIT ?`;
    const allBindings = [...bindings, ...cursorBindings, pageSize];
    const rows = queryAll(this.db, mainSql, allBindings);

    const parseOwners = (raw: string) => {
      try {
        return JSON.parse(raw || '[]');
      } catch {
        return [];
      }
    };

    // Gather producers and consumers for the returned fields
    const fields: FieldResult[] = rows.map((row) => {
      const producers = queryAll(
        this.db,
        `SELECT service_id, service_version, service_name, service_summary, service_owners FROM message_producers WHERE message_id = ? AND message_version = ?`,
        [row.message_id, row.message_version]
      );

      const consumers = queryAll(
        this.db,
        `SELECT service_id, service_version, service_name, service_summary, service_owners FROM message_consumers WHERE message_id = ? AND message_version = ?`,
        [row.message_id, row.message_version]
      );

      const usedInCount = (
        queryOne(this.db, `SELECT COUNT(DISTINCT message_id || '/' || message_version) as cnt FROM fields WHERE path = ?`, [
          row.path,
        ]) as any
      ).cnt;

      const typeRows = queryAll(
        this.db,
        `SELECT type, COUNT(DISTINCT message_id || '/' || message_version) as count FROM fields WHERE path = ? GROUP BY type`,
        [row.path]
      );
      const conflicts =
        typeRows.length > 1 ? typeRows.map((r) => ({ type: r.type as string, count: r.count as number })) : undefined;

      return {
        id: row.id,
        path: row.path,
        type: row.type,
        description: row.description,
        required: row.required === 1,
        schemaFormat: row.schema_format,
        messageId: row.message_id,
        messageVersion: row.message_version,
        messageType: row.message_type,
        messageName: row.message_name || row.message_id,
        messageSummary: row.message_summary || '',
        messageOwners: parseOwners(row.message_owners),
        usedInCount,
        conflicts,
        producers: producers.map((p) => ({
          id: p.service_id,
          version: p.service_version,
          name: p.service_name || p.service_id,
          summary: p.service_summary || '',
          owners: parseOwners(p.service_owners),
        })),
        consumers: consumers.map((c) => ({
          id: c.service_id,
          version: c.service_version,
          name: c.service_name || c.service_id,
          summary: c.service_summary || '',
          owners: parseOwners(c.service_owners),
        })),
      };
    });

    // Facets (computed from filtered set, not paginated)
    const formatsFacetSql = `SELECT f.schema_format as value, COUNT(*) as count FROM fields f ${whereClause} GROUP BY f.schema_format`;
    const formats = queryAll(this.db, formatsFacetSql, bindings) as FacetEntry[];

    const typesFacetSql = `SELECT f.type as value, COUNT(*) as count FROM fields f ${whereClause} GROUP BY f.type`;
    const types = queryAll(this.db, typesFacetSql, bindings) as FacetEntry[];

    const messageTypesFacetSql = `SELECT f.message_type as value, COUNT(*) as count FROM fields f ${whereClause} GROUP BY f.message_type`;
    const messageTypes = queryAll(this.db, messageTypesFacetSql, bindings) as FacetEntry[];

    // Build cursor for next page
    const lastRow = rows[rows.length - 1];
    const nextCursor = lastRow && rows.length === pageSize ? encodeCursor(lastRow.id) : undefined;

    return {
      fields,
      total,
      cursor: nextCursor,
      facets: { formats, types, messageTypes },
    };
  }

  close(): void {
    this.db.close();
  }
}

function encodeCursor(id: number): string {
  return Buffer.from(String(id)).toString('base64url');
}

function decodeCursor(cursor: string): number {
  return parseInt(Buffer.from(cursor, 'base64url').toString(), 10);
}

// Singleton management
let instance: FieldsDatabase | null = null;

export async function getFieldsDatabase(dbPath: string): Promise<FieldsDatabase> {
  if (!instance) {
    instance = await FieldsDatabase.create(dbPath);
  }
  return instance;
}

export function closeFieldsDatabase(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
