import { describe, expect, it, vi } from 'vitest';
import { resolveSchemaRefs } from '@utils/json-schema-refs';

const createJsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });

describe('resolveSchemaRefs', () => {
  it('resolves external JSON schema refs and nested local refs in the external document', async () => {
    const schema = {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          description: 'Template draft payload.',
          $ref: 'http://example.com/common-schema.json#/components/schemas/TemplateDraftedData',
        },
      },
    };
    const commonSchema = {
      components: {
        schemas: {
          TemplateDraftedData: {
            type: 'object',
            required: ['templateId', 'content'],
            properties: {
              templateId: { type: 'string' },
              content: {
                $ref: '#/components/schemas/TemplateContent',
              },
            },
          },
          TemplateContent: {
            type: 'object',
            required: ['subject'],
            properties: {
              subject: { type: 'string' },
            },
          },
        },
      },
    };
    const fetcher = vi.fn(async () => createJsonResponse(commonSchema));

    await expect(
      resolveSchemaRefs(schema, {
        baseUrl: 'http://example.com/event-schema.json',
        fetcher,
      })
    ).resolves.toEqual({
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'object',
          description: 'Template draft payload.',
          required: ['templateId', 'content'],
          properties: {
            templateId: { type: 'string' },
            content: {
              type: 'object',
              required: ['subject'],
              properties: {
                subject: { type: 'string' },
              },
            },
          },
        },
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('http://example.com/common-schema.json', { headers: undefined });
  });

  it('resolves relative external refs from the current schema URL', async () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          $ref: './shared/user.json#/User',
        },
      },
    };
    const fetcher = vi.fn(async () =>
      createJsonResponse({
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      })
    );

    await expect(
      resolveSchemaRefs(schema, {
        baseUrl: 'http://example.com/schemas/event.json',
        fetcher,
      })
    ).resolves.toEqual({
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
        },
      },
    });
    expect(fetcher).toHaveBeenCalledWith('http://example.com/schemas/shared/user.json', { headers: undefined });
  });
});
