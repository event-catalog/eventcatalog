/**
 * Reads a Pact file (https://docs.pact.io, Pact Specification versions 2 to 4): the contract a consumer's tests
 * produce for one provider.
 *
 * A Pact isn't a schema. Each interaction has an example of what the consumer expects, and matching rules that
 * say how each field is checked (by type, against a regex...). A field without a rule must equal the example.
 * `parsePact` turns that into a JSON Schema for each interaction, so the schema viewer can show which fields
 * the consumer relies on and how.
 */

type JsonSchema = Record<string, any>;

/**
 * Pact's logo (the chain link), from https://github.com/pact-foundation/pact-logo, as published: black for light
 * backgrounds and white for dark ones. Its guidelines ask that it isn't recoloured, resized out of proportion or
 * edited, so use these files as they are.
 */
export const PACT_ICON = '/icons/pact.svg';
export const PACT_ICON_WHITE = '/icons/pact-white.png';

/** Whether a contract's `type` (free text in frontmatter) says it is a Pact */
export const isPactContractType = (type: string | undefined) => type?.trim().toLowerCase() === 'pact';

export type PactInteraction = {
  /** What the consumer's test calls the interaction, e.g. "an order ready for shipping event" */
  description: string;
  /** The states the provider is in for it, e.g. "an order has been packed" */
  providerStates: string[];
  /** A message the consumer receives, or the response to a request it makes */
  kind: 'message' | 'response';
  /** The request of a request/response interaction, e.g. "GET /orders/1" */
  request?: string;
  /** What the consumer expects, as a JSON Schema. Undefined when the interaction has no JSON body. */
  schema?: JsonSchema;
};

export type Pact = {
  consumer: string;
  provider: string;
  /** The Pact Specification version the file says it follows */
  specificationVersion?: string;
  interactions: PactInteraction[];
};

type Matcher = { match?: string; regex?: string; min?: number; max?: number; [key: string]: unknown };
/** The matchers of one path, and whether a value must pass all of them (AND, Pact's default) or any of them (OR) */
type Rule = { segments: string[]; matchers: Matcher[]; combine: 'AND' | 'OR' };
type Rules = Rule[];

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `$.a['b'][0].c` as its segments: a, b, [0], c. `[*]` is any item of a list and `*` any field of an object. */
const toSegments = (jsonPath: string): string[] =>
  (jsonPath.replace(/^\$/, '').match(/\.[^.[\]]+|\[[^\]]*\]/g) || []).map((segment) => {
    if (segment.startsWith('.')) return segment.slice(1);
    const inner = segment.slice(1, -1);
    return /^(\*|\d+)$/.test(inner) ? `[${inner}]` : inner.replace(/^['"]|['"]$/g, '');
  });

/**
 * The matching rules of a body, by the path of the field they apply to.
 * Version 3 and 4: `{ body: { "$.orderId": { matchers: [...] } } }`. Version 2: `{ "$.body.orderId": { match } }`.
 */
const readRules = (matchingRules: unknown): Rules => {
  const rules: Rules = [];
  if (!isObject(matchingRules)) return rules;

  const add = (jsonPath: string, rule: unknown) => {
    if (!isObject(rule)) return;
    const matchers = Array.isArray(rule.matchers) ? rule.matchers.filter(isObject) : [rule];
    const combine = typeof rule.combine === 'string' && rule.combine.toUpperCase() === 'OR' ? 'OR' : 'AND';
    rules.push({ segments: toSegments(jsonPath), matchers: matchers as Matcher[], combine });
  };

  // Versions 3 and 4 keep a message's rules under `body` (a message's `content` is sometimes used instead)
  const body = isObject(matchingRules.body) ? matchingRules.body : isObject(matchingRules.content) ? matchingRules.content : null;
  if (body) {
    for (const [jsonPath, rule] of Object.entries(body)) add(jsonPath, rule);
    return rules;
  }

  for (const [jsonPath, rule] of Object.entries(matchingRules)) {
    if (jsonPath === '$.body' || jsonPath.startsWith('$.body.') || jsonPath.startsWith('$.body[')) {
      add(`$${jsonPath.slice('$.body'.length)}`, rule);
    }
  }
  return rules;
};

const isIndex = (segment: string) => /^\[\d+\]$/.test(segment);

/**
 * The rule for a field (`segments` is its path, with the position of each list item, such as `[1]`).
 * A rule's `[*]` stands for any item and its `*` for any field name. When several rules apply, the one that
 * names the most of the path wins, as in Pact: `$.items[1].code` over `$.items[*].code`.
 */
const findRule = (rules: Rules, segments: string[]): Rule | undefined => {
  let best: { rule: Rule; named: number } | undefined;
  for (const rule of rules) {
    if (rule.segments.length !== segments.length) continue;
    let named = 0;
    const applies = rule.segments.every((segment, index) => {
      if (segment === segments[index]) return ++named > 0;
      return isIndex(segments[index]) ? segment === '[*]' : segment === '*';
    });
    if (applies && (!best || named > best.named)) best = { rule, named };
  }
  return best?.rule;
};

const typeOf = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
};

/** Where a schema keeps the text an `include` matcher says a value must contain (not a JSON Schema keyword) */
const PACT_INCLUDES = 'x-pact-includes';

/** What a field's matchers add to its schema: how the provider's value is checked */
const applyMatchers = (schema: JsonSchema, { matchers, combine }: Rule, example?: unknown): JsonSchema => {
  const notes: string[] = [];
  const patterns = matchers.flatMap((matcher) =>
    matcher.match === 'regex' && typeof matcher.regex === 'string' ? [matcher.regex] : []
  );

  // A value that may pass any one of several matchers: only patterns can be shown as alternatives
  if (combine === 'OR' && matchers.length > 1) {
    if (patterns.length === matchers.length) schema.anyOf = patterns.map((pattern) => ({ pattern }));
    else schema.description = `Must pass any one of these Pact matchers: ${matchers.map((matcher) => matcher.match).join(', ')}`;
    return schema;
  }

  // Every pattern must match: one is the schema's own, several are kept side by side
  if (patterns.length === 1) schema.pattern = patterns[0];
  if (patterns.length > 1) schema.allOf = patterns.map((pattern) => ({ pattern }));

  for (const matcher of matchers) {
    switch (matcher.match) {
      case 'integer':
        schema.type = 'integer';
        break;
      case 'decimal':
      case 'number':
        schema.type = 'number';
        break;
      case 'boolean':
        schema.type = 'boolean';
        break;
      case 'null':
        schema.type = 'null';
        break;
      case 'date':
        schema.format = 'date';
        break;
      case 'time':
        schema.format = 'time';
        break;
      case 'timestamp':
      case 'datetime':
        schema.format = 'date-time';
        break;
      case 'include':
        if (typeof matcher.value === 'string') {
          notes.push(`Must include "${matcher.value}"`);
          schema[PACT_INCLUDES] = matcher.value;
        }
        break;
      case 'equality':
        // Exactly the example's value, even under a rule that matches everything around it by type
        if (example !== undefined && !isObject(example) && !Array.isArray(example)) schema.const = example;
        else notes.push('Must equal the example');
        break;
      default:
        // `type` and anything newer: the value has the example's type, which the schema already says
        break;
    }
    // Pact's `min` and `max` are about how many items a list has
    if (schema.type === 'array' && typeof matcher.min === 'number') schema.minItems = matcher.min;
    if (schema.type === 'array' && typeof matcher.max === 'number') schema.maxItems = matcher.max;
  }

  if (notes.length > 0) schema.description = notes.join('. ');
  return schema;
};

/**
 * Whether a rule further up (or on an "any item") makes this field matched by type rather than by value.
 * The closest rule decides, as in Pact: `equality` on a parent keeps its fields exact, even under a `type` rule higher up.
 */
const isMatchedByAncestor = (segments: string[], rules: Rules) => {
  for (let length = segments.length - 1; length >= 0; length--) {
    const matchers = findRule(rules, segments.slice(0, length))?.matchers;
    if (!matchers || matchers.length === 0) continue;
    return matchers.some((matcher) => matcher.match === 'type' || matcher.min !== undefined || matcher.max !== undefined);
  }
  return false;
};

/**
 * One schema for the items of a list from two of its example items, so a field only a later item has is still
 * listed. A field is required when both have it, and its value is only fixed when both agree on it.
 */
const mergeItemSchemas = (first: JsonSchema, second: JsonSchema): JsonSchema => {
  if (first.type !== second.type) return first;

  if (first.type === 'object') {
    const properties: Record<string, JsonSchema> = { ...first.properties };
    for (const [name, schema] of Object.entries<JsonSchema>(second.properties ?? {})) {
      properties[name] = name in properties ? mergeItemSchemas(properties[name], schema) : schema;
    }
    const required = (first.required ?? []).filter((name: string) => (second.required ?? []).includes(name));
    return { ...first, properties, required };
  }

  if (first.type === 'array') {
    if (first.items && second.items) return { ...first, items: mergeItemSchemas(first.items, second.items) };
    return first.items ? first : { ...first, ...(second.items ? { items: second.items } : {}) };
  }

  // Items checked in different ways (a rule for one position of the list) can't be told as one check
  const check = ({ pattern, allOf, anyOf, format, [PACT_INCLUDES]: includes }: JsonSchema) =>
    JSON.stringify({ pattern, allOf, anyOf, format, includes });
  if (check(first) !== check(second)) {
    const merged: JsonSchema = { ...first, description: 'Checked differently for each item of the list' };
    for (const keyword of ['const', 'pattern', 'allOf', 'anyOf', 'format', PACT_INCLUDES]) delete merged[keyword];
    return merged;
  }

  if ('const' in first && (!('const' in second) || first.const !== second.const)) {
    const { const: _fixed, ...rest } = first;
    return rest;
  }
  return first;
};

const toSchema = (example: unknown, rules: Rules, segments: string[] = []): JsonSchema => {
  const type = typeOf(example);
  const matchers = findRule(rules, segments);

  if (isObject(example)) {
    const schema: JsonSchema = {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(example).map(([name, value]) => [name, toSchema(value, rules, [...segments, name])])
      ),
      // The consumer expects every field of its example to be there
      required: Object.keys(example),
    };
    return matchers ? applyMatchers(schema, matchers) : schema;
  }

  if (Array.isArray(example)) {
    const schema: JsonSchema = { type: 'array' };
    if (example.length > 0) {
      schema.items = example.map((item, index) => toSchema(item, rules, [...segments, `[${index}]`])).reduce(mergeItemSchemas);
    }
    return matchers ? applyMatchers(schema, matchers) : schema;
  }

  const schema: JsonSchema = { type, examples: [example] };
  if (matchers) return applyMatchers(schema, matchers, example);
  // Without a rule of its own (or one above it that matches by type), the value must be the example's
  if (!isMatchedByAncestor(segments, rules)) schema.const = example;
  return schema;
};

/**
 * A body as JSON: versions 2 and 3 hold it as is, version 4 wraps it (`{ content, contentType, encoded }`).
 * Only a version 4 body is unwrapped: an older payload can have fields called `content` and `contentType` itself.
 */
const readBody = (body: unknown, isVersion4: boolean): unknown => {
  if (isVersion4 && isObject(body) && 'content' in body && ('contentType' in body || 'encoded' in body)) {
    if (typeof body.content !== 'string') return body.content;
    try {
      return JSON.parse(body.content);
    } catch {
      return undefined;
    }
  }
  return body;
};

const readProviderStates = (interaction: Record<string, any>): string[] => {
  const states = Array.isArray(interaction.providerStates) ? interaction.providerStates : [];
  const names = states.map((state) => (isObject(state) ? state.name : state)).filter((name) => typeof name === 'string');
  // Versions 1 and 2 have one state, as text
  const single = interaction.providerState ?? interaction.provider_state;
  return typeof single === 'string' ? [...names, single] : names;
};

const toInteraction = (interaction: unknown, isMessage: boolean, isVersion4File: boolean): PactInteraction | null => {
  if (!isObject(interaction)) return null;

  // Version 4 interactions say what they are with a `type`
  const isVersion4 = isVersion4File || typeof interaction.type === 'string';

  const base = {
    description: typeof interaction.description === 'string' ? interaction.description : 'Interaction',
    providerStates: readProviderStates(interaction),
  };
  const withSchema = (body: unknown, rules: unknown) =>
    isObject(body) || Array.isArray(body) ? toSchema(body, readRules(rules)) : undefined;

  // A message: version 3 `messages[]`, or a version 4 "Asynchronous/Messages" interaction
  if (isMessage || interaction.type === 'Asynchronous/Messages') {
    return {
      ...base,
      kind: 'message',
      schema: withSchema(readBody(interaction.contents, isVersion4), interaction.matchingRules),
    };
  }

  // A version 4 "Synchronous/Messages" interaction: a message sent, and the messages that come back. What the
  // consumer expects is the first one back.
  if (interaction.type === 'Synchronous/Messages') {
    const reply = (Array.isArray(interaction.response) ? interaction.response : []).find(isObject) ?? {};
    return { ...base, kind: 'message', schema: withSchema(readBody(reply.contents, isVersion4), reply.matchingRules) };
  }

  // A request and its response: what the consumer expects back
  const response = isObject(interaction.response) ? interaction.response : {};
  const request = isObject(interaction.request) ? interaction.request : {};
  return {
    ...base,
    kind: 'response',
    request: [request.method, request.path].filter((part) => typeof part === 'string').join(' ') || undefined,
    schema: withSchema(readBody(response.body, isVersion4), response.matchingRules),
  };
};

/** The Pact a file holds, or null when the file isn't one (so any other contract is just shown as written) */
export const parsePact = (content: string): Pact | null => {
  let file: unknown;
  try {
    file = JSON.parse(content);
  } catch {
    return null;
  }

  if (!isObject(file) || !isObject(file.consumer) || !isObject(file.provider)) return null;
  if (typeof file.consumer.name !== 'string' || typeof file.provider.name !== 'string') return null;
  if (!Array.isArray(file.messages) && !Array.isArray(file.interactions)) return null;

  const metadata = isObject(file.metadata) ? file.metadata : {};
  const specification = metadata.pactSpecification ?? metadata['pact-specification'] ?? metadata.pactSpecificationVersion;
  const specificationVersion = isObject(specification) ? specification.version : specification;

  const version = typeof specificationVersion === 'string' ? specificationVersion : undefined;
  const isVersion4 = !!version?.startsWith('4');

  return {
    consumer: file.consumer.name,
    provider: file.provider.name,
    specificationVersion: version,
    interactions: [
      ...(Array.isArray(file.messages) ? file.messages : []).map((message) => toInteraction(message, true, isVersion4)),
      ...(Array.isArray(file.interactions) ? file.interactions : []).map((interaction) =>
        toInteraction(interaction, false, isVersion4)
      ),
    ].filter((interaction): interaction is PactInteraction => interaction !== null),
  };
};

const toWords = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * The interactions of a Pact that are about one message. A Pact names its interactions in words ("an order
 * ready for shipping event"), not by catalog id, so this goes by the message's name or id appearing in the
 * description. When nothing matches (or the Pact has only one interaction) they are all returned.
 */
export const getPactInteractionsForMessage = (pact: Pact, message: { id: string; name?: string }): PactInteraction[] =>
  matchPactInteractionsToMessage(pact, message).interactions;

/**
 * The same, saying whether the interactions were matched to the message. `matched: false` means none of the
 * descriptions names it, so every interaction is returned and some may be about other messages. A person sees
 * the descriptions; anything that reads the fields as "this message's" (the MCP tools) has to check this.
 */
export const matchPactInteractionsToMessage = (
  pact: Pact,
  message: { id: string; name?: string }
): { interactions: PactInteraction[]; matched: boolean } => {
  if (pact.interactions.length <= 1) return { interactions: pact.interactions, matched: true };

  const names = [message.name, message.id].filter((name): name is string => !!name).map(toWords);
  const matches = pact.interactions.filter((interaction) => {
    const description = ` ${toWords(interaction.description)} `;
    return names.some((name) => name && description.includes(` ${name} `));
  });

  return matches.length > 0 ? { interactions: matches, matched: true } : { interactions: pact.interactions, matched: false };
};

/** One field a consumer expects, and how the provider's value is checked against it */
export type PactField = {
  /** Where the field is: `orderId`, `shippingAddress.city`, `items[].sku` */
  path: string;
  type: string;
  /** Checked by its type only, against a pattern, for text it must include, or it must be exactly the example's value */
  check: 'type' | 'pattern' | 'includes' | 'exact value';
  pattern?: string;
  /** Several patterns for one field: it must match all of them (`AND`) or any of them (`OR`) */
  patterns?: string[];
  combine?: 'AND' | 'OR';
  includes?: string;
  value?: unknown;
  format?: string;
};

/** The fields of an interaction's schema as a flat list, for reading at a glance (and by agents) */
export const getPactFields = (schema: JsonSchema | undefined, prefix = ''): PactField[] => {
  if (!schema) return [];

  // An object with no fields in the example (`meta: {}`) is still expected: it's listed as itself, below
  if (schema.type === 'object' && isObject(schema.properties) && Object.keys(schema.properties).length > 0) {
    return Object.entries(schema.properties).flatMap(([name, property]) =>
      getPactFields(property as JsonSchema, prefix ? `${prefix}.${name}` : name)
    );
  }

  if (schema.type === 'array' && isObject(schema.items)) return getPactFields(schema.items, `${prefix}[]`);

  // The whole body is one value, or an empty object or list: nothing to name
  if (!prefix) return [];

  // Several patterns for one field: all of them (allOf) or any of them (anyOf)
  const combined = Array.isArray(schema.allOf) ? schema.allOf : Array.isArray(schema.anyOf) ? schema.anyOf : [];
  const patterns: string[] = combined.flatMap((part: JsonSchema) => (typeof part?.pattern === 'string' ? [part.pattern] : []));
  const hasPattern = Boolean(schema.pattern) || patterns.length > 0;

  return [
    {
      path: prefix,
      type: schema.type,
      check: 'const' in schema ? 'exact value' : hasPattern ? 'pattern' : schema[PACT_INCLUDES] ? 'includes' : 'type',
      ...(schema.pattern ? { pattern: schema.pattern } : {}),
      ...(patterns.length > 0 ? { patterns, combine: Array.isArray(schema.allOf) ? ('AND' as const) : ('OR' as const) } : {}),
      ...(schema[PACT_INCLUDES] ? { includes: schema[PACT_INCLUDES] } : {}),
      ...('const' in schema ? { value: schema.const } : {}),
      ...(schema.format ? { format: schema.format } : {}),
    },
  ];
};
