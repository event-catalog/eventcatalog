/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import path from 'node:path';
import fs from 'node:fs';
import { FieldsDatabase } from './fields-db';
import { extractSchemaFieldsDeep } from './field-extractor';

function detectFormat(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.proto') return 'proto';
  if (ext === '.avro' || ext === '.avsc') return 'avro';
  return 'json-schema';
}

interface Warning {
  messageId: string;
  version: string;
  error: string;
}

/**
 * Build the fields SQLite index using the EventCatalog SDK.
 * This runs BEFORE Astro starts (no Astro dependencies).
 *
 * @param catalogDir - Path to the EventCatalog content directory
 * @param outputDir - Path to write the .eventcatalog/fields.db (defaults to catalogDir)
 */
export async function buildFieldsIndex(catalogDir: string, outputDir?: string): Promise<{ dbPath: string; warnings: Warning[] }> {
  // Dynamic import to avoid bundling the SDK into the Astro build
  const sdkModule = await import('@eventcatalog/sdk');
  const sdk = sdkModule.default(catalogDir);

  const dbDir = path.join(outputDir || catalogDir, '.eventcatalog');
  const dbPath = path.join(dbDir, 'fields.db');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = await FieldsDatabase.create(dbPath, { recreate: true });
  const warnings: Warning[] = [];

  try {
    // Fetch all messages (latest version only) using the SDK
    const [events, commands, queries] = await Promise.all([
      sdk.getEvents({ latestOnly: true }),
      sdk.getCommands({ latestOnly: true }),
      sdk.getQueries({ latestOnly: true }),
    ]);

    const collections = [
      { entries: events || [], type: 'event' as const },
      { entries: commands || [], type: 'command' as const },
      { entries: queries || [], type: 'query' as const },
    ];

    for (const { entries, type } of collections) {
      for (const entry of entries) {
        const msgId = entry.id;
        const msgVersion = entry.version;

        // Get schema content via SDK
        let schemaData: { schema: string; fileName: string } | undefined;
        try {
          schemaData = await sdk.getSchemaForMessage(msgId, msgVersion);
        } catch {
          // No schema for this message
          continue;
        }

        if (!schemaData) continue;

        const { schema: content, fileName } = schemaData;
        const format = detectFormat(fileName);

        try {
          const fields = extractSchemaFieldsDeep(content, format);

          for (const field of fields) {
            db.insertField({
              path: field.path,
              type: field.type,
              description: field.description,
              required: field.required,
              schemaFormat: format,
              messageId: msgId,
              messageVersion: msgVersion,
              messageType: type,
              messageName: entry.name || msgId,
              messageSummary: entry.summary || '',
              messageOwners: entry.owners || [],
            });
          }

          // Get producers and consumers via SDK
          const { producers, consumers } = await sdk.getProducersAndConsumersForMessage(msgId, msgVersion);

          for (const producer of producers) {
            db.insertProducer(
              msgId,
              msgVersion,
              producer.id,
              producer.version,
              producer.name || producer.id,
              producer.summary || '',
              producer.owners || []
            );
          }
          for (const consumer of consumers) {
            db.insertConsumer(
              msgId,
              msgVersion,
              consumer.id,
              consumer.version,
              consumer.name || consumer.id,
              consumer.summary || '',
              consumer.owners || []
            );
          }
        } catch (err: any) {
          warnings.push({ messageId: msgId, version: msgVersion, error: err.message });
        }
      }
    }

    db.save();
    db.close();
    return { dbPath, warnings };
  } catch (err) {
    db.close();
    throw err;
  }
}
