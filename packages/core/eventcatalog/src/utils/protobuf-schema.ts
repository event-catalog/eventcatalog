/**
 * Lightweight Protocol Buffers (.proto) parser.
 *
 * Parses proto2/proto3 files into a plain JSON tree used by the
 * ProtobufSchemaViewer component. Runs in both Node (Astro build) and the
 * browser (Schema Explorer), so it must stay dependency free.
 *
 * Captures doc comments (leading `//`, `/* ... *\/` and trailing same-line
 * comments) so they can be displayed alongside fields, like Avro `doc`.
 */

export interface ProtobufField {
  name: string;
  type: string;
  number?: number;
  label?: 'repeated' | 'optional' | 'required';
  map?: { keyType: string; valueType: string };
  oneof?: string;
  doc?: string;
  options?: ProtobufOption[];
}

export type ProtobufOptionValue = string | number | boolean | ProtobufOptionValue[] | { [key: string]: ProtobufOptionValue };

export interface ProtobufOption {
  name: string;
  value: ProtobufOptionValue;
}

export interface ProtobufEnumValue {
  name: string;
  value?: number;
  doc?: string;
}

export interface ProtobufEnum {
  name: string;
  doc?: string;
  values: ProtobufEnumValue[];
}

export interface ProtobufMessage {
  name: string;
  doc?: string;
  fields: ProtobufField[];
  messages: ProtobufMessage[];
  enums: ProtobufEnum[];
}

export interface ProtobufSchema {
  syntax?: string;
  package?: string;
  messages: ProtobufMessage[];
  enums: ProtobufEnum[];
}

interface Token {
  value: string;
  line: number;
  doc?: string;
  isString?: boolean;
}

const SYMBOLS = new Set(['{', '}', ';', '=', '<', '>', ',', '[', ']', '(', ')', ':']);

const isIdentifierStart = (char: string) => /[A-Za-z_]/.test(char);
const isIdentifierChar = (char: string) => /[A-Za-z0-9_.]/.test(char);
const isNumberStart = (char: string) => /[0-9-]/.test(char);
const isNumberChar = (char: string) => /[0-9a-fA-FxX.+-]/.test(char);

function tokenize(content: string): { tokens: Token[]; trailingComments: Map<number, string> } {
  const tokens: Token[] = [];
  const trailingComments = new Map<number, string>();
  let pendingDoc: string[] = [];
  let line = 1;
  let lineHasTokens = false;
  let i = 0;

  const pushToken = (token: Omit<Token, 'doc'>) => {
    tokens.push(pendingDoc.length > 0 ? { ...token, doc: pendingDoc.join('\n') } : token);
    pendingDoc = [];
    lineHasTokens = true;
  };

  while (i < content.length) {
    const char = content[i];

    if (char === '\n') {
      line++;
      lineHasTokens = false;
      i++;
      continue;
    }

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Line comment
    if (char === '/' && content[i + 1] === '/') {
      let comment = '';
      i += 2;
      while (i < content.length && content[i] !== '\n') {
        comment += content[i];
        i++;
      }
      comment = comment.replace(/^\/*\s?/, '').trim();
      if (lineHasTokens) {
        trailingComments.set(line, trailingComments.has(line) ? `${trailingComments.get(line)}\n${comment}` : comment);
      } else if (comment) {
        pendingDoc.push(comment);
      }
      continue;
    }

    // Block comment
    if (char === '/' && content[i + 1] === '*') {
      let comment = '';
      i += 2;
      while (i < content.length && !(content[i] === '*' && content[i + 1] === '/')) {
        if (content[i] === '\n') line++;
        comment += content[i];
        i++;
      }
      i += 2;
      const cleaned = comment
        .split('\n')
        .map((commentLine) => commentLine.replace(/^\s*\*?\s?/, '').trim())
        .filter(Boolean)
        .join('\n');
      if (cleaned) pendingDoc.push(cleaned);
      continue;
    }

    // String literal
    if (char === '"' || char === "'") {
      const quote = char;
      let value = '';
      i++;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === '\\') {
          value += content[i + 1];
          i += 2;
          continue;
        }
        if (content[i] === '\n') line++;
        value += content[i];
        i++;
      }
      i++;
      pushToken({ value, line, isString: true });
      continue;
    }

    if (SYMBOLS.has(char)) {
      pushToken({ value: char, line });
      i++;
      continue;
    }

    // Identifiers, including fully-qualified type names with a leading dot
    // (e.g. ".google.protobuf.Timestamp")
    if (isIdentifierStart(char) || (char === '.' && isIdentifierStart(content[i + 1] || ''))) {
      let value = char === '.' ? '.' : '';
      if (char === '.') i++;
      while (i < content.length && isIdentifierChar(content[i])) {
        value += content[i];
        i++;
      }
      pushToken({ value, line });
      continue;
    }

    // Signed symbolic floating-point values used by protobuf options (for example +inf).
    if ((char === '+' || char === '-') && isIdentifierStart(content[i + 1] || '')) {
      let value = char;
      i++;
      while (i < content.length && isIdentifierChar(content[i])) {
        value += content[i];
        i++;
      }
      pushToken({ value, line });
      continue;
    }

    if (isNumberStart(char)) {
      let value = content[i];
      i++;
      while (i < content.length && isNumberChar(content[i])) {
        value += content[i];
        i++;
      }
      pushToken({ value, line });
      continue;
    }

    throw new Error(`Unexpected character "${char}" at line ${line}`);
  }

  return { tokens, trailingComments };
}

class ProtobufParser {
  private tokens: Token[];
  private trailingComments: Map<number, string>;
  private pos = 0;

  constructor(content: string) {
    const { tokens, trailingComments } = tokenize(content);
    this.tokens = tokens;
    this.trailingComments = trailingComments;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token {
    const token = this.tokens[this.pos];
    if (!token) throw new Error('Unexpected end of protobuf schema');
    this.pos++;
    return token;
  }

  private expect(value: string): Token {
    const token = this.next();
    if (token.value !== value) {
      throw new Error(`Expected "${value}" but found "${token.value}" at line ${token.line}`);
    }
    return token;
  }

  // Consume tokens until a top-level ";" (skips over nested braces, e.g. aggregate options)
  private skipStatement() {
    let depth = 0;
    while (this.pos < this.tokens.length) {
      const token = this.next();
      if (token.value === '{') depth++;
      if (token.value === '}') depth--;
      if (token.value === ';' && depth <= 0) return;
    }
  }

  private skipBlock() {
    this.expect('{');
    let depth = 1;
    while (this.pos < this.tokens.length && depth > 0) {
      const token = this.next();
      if (token.value === '{') depth++;
      if (token.value === '}') depth--;
    }
  }

  private parseAggregateOptionKey(): string {
    if (this.peek()?.value !== '[') return this.next().value;

    this.next();
    const nameParts: string[] = [];
    while (this.peek() && this.peek()!.value !== ']') nameParts.push(this.next().value);
    this.expect(']');
    return `[${nameParts.join('')}]`;
  }

  private parseOptionValue(): ProtobufOptionValue {
    const token = this.peek();
    if (!token) throw new Error('Unexpected end of protobuf option');

    if (token.value === '{' || token.value === '<') {
      const openingToken = this.next().value;
      const closingToken = openingToken === '{' ? '}' : '>';
      const value: { [key: string]: ProtobufOptionValue } = {};

      while (this.peek() && this.peek()!.value !== closingToken) {
        if (this.peek()!.value === ',' || this.peek()!.value === ';') {
          this.next();
          continue;
        }

        const key = this.parseAggregateOptionKey();
        if (this.peek()?.value === ':') this.next();
        const entryValue = this.parseOptionValue();
        const existingValue = value[key];
        value[key] =
          existingValue === undefined
            ? entryValue
            : Array.isArray(existingValue)
              ? [...existingValue, entryValue]
              : [existingValue, entryValue];
      }

      this.expect(closingToken);
      return value;
    }

    if (token.value === '[') {
      this.next();
      const values: ProtobufOptionValue[] = [];

      while (this.peek() && this.peek()!.value !== ']') {
        if (this.peek()!.value === ',' || this.peek()!.value === ';') {
          this.next();
          continue;
        }
        values.push(this.parseOptionValue());
      }

      this.expect(']');
      return values;
    }

    const valueToken = this.next();
    if (valueToken.isString) {
      let value = valueToken.value;
      while (this.peek()?.isString) value += this.next().value;
      return value;
    }
    if (valueToken.value === 'true') return true;
    if (valueToken.value === 'false') return false;

    const numericValue = Number(valueToken.value);
    if (Number.isNaN(numericValue)) return valueToken.value;
    if (Number.isInteger(numericValue) && !Number.isSafeInteger(numericValue)) return valueToken.value;
    return numericValue;
  }

  private parseFieldOptions(): ProtobufOption[] {
    if (this.peek()?.value !== '[') return [];

    this.next();
    const options: ProtobufOption[] = [];

    while (this.peek() && this.peek()!.value !== ']') {
      if (this.peek()!.value === ',') {
        this.next();
        continue;
      }

      const nameParts: string[] = [];
      while (this.peek() && this.peek()!.value !== '=') nameParts.push(this.next().value);
      this.expect('=');
      options.push({ name: nameParts.join(''), value: this.parseOptionValue() });
    }

    this.expect(']');
    return options;
  }

  private getTrailingDoc(line: number): string | undefined {
    return this.trailingComments.get(line);
  }

  parse(): ProtobufSchema {
    const schema: ProtobufSchema = { messages: [], enums: [] };

    while (this.pos < this.tokens.length) {
      const token = this.peek()!;

      switch (token.value) {
        case 'syntax':
        case 'edition': {
          this.next();
          this.expect('=');
          schema.syntax = this.next().value;
          this.expect(';');
          break;
        }
        case 'package': {
          this.next();
          schema.package = this.next().value;
          this.expect(';');
          break;
        }
        case 'import':
        case 'option': {
          this.next();
          this.skipStatement();
          break;
        }
        case 'message': {
          schema.messages.push(this.parseMessage());
          break;
        }
        case 'enum': {
          schema.enums.push(this.parseEnum());
          break;
        }
        case 'service':
        case 'extend': {
          this.next();
          this.next(); // name
          this.skipBlock();
          break;
        }
        case ';': {
          this.next();
          break;
        }
        default:
          throw new Error(`Unexpected token "${token.value}" at line ${token.line}`);
      }
    }

    return schema;
  }

  private parseMessage(): ProtobufMessage {
    const keyword = this.expect('message');
    const name = this.next().value;
    const message: ProtobufMessage = { name, doc: keyword.doc, fields: [], messages: [], enums: [] };

    this.expect('{');

    while (this.pos < this.tokens.length) {
      const token = this.peek()!;

      if (token.value === '}') {
        this.next();
        return message;
      }

      switch (token.value) {
        case 'message':
          message.messages.push(this.parseMessage());
          break;
        case 'enum':
          message.enums.push(this.parseEnum());
          break;
        case 'oneof': {
          this.next();
          const oneofName = this.next().value;
          this.expect('{');
          while (this.peek() && this.peek()!.value !== '}') {
            if (this.peek()!.value === 'option') {
              this.next();
              this.skipStatement();
              continue;
            }
            message.fields.push(this.parseField(oneofName));
          }
          this.expect('}');
          break;
        }
        case 'map':
          message.fields.push(this.parseMapField());
          break;
        case 'option':
        case 'reserved':
        case 'extensions': {
          this.next();
          this.skipStatement();
          break;
        }
        case 'extend': {
          this.next();
          this.next(); // type name
          this.skipBlock();
          break;
        }
        case ';':
          this.next();
          break;
        default:
          message.fields.push(this.parseField());
      }
    }

    throw new Error(`Unexpected end of message "${name}"`);
  }

  private parseField(oneof?: string): ProtobufField {
    let firstToken = this.peek()!;
    let label: ProtobufField['label'];

    if (firstToken.value === 'repeated' || firstToken.value === 'optional' || firstToken.value === 'required') {
      label = firstToken.value;
      this.next();
    }

    if (this.peek()?.value === 'map') {
      const mapField = this.parseMapField();
      return { ...mapField, doc: mapField.doc || firstToken.doc, oneof };
    }

    const typeToken = this.next();
    const name = this.next().value;
    this.expect('=');
    const numberToken = this.next();
    const options = this.parseFieldOptions();
    const terminator = this.expect(';');

    const parsedNumber = Number.parseInt(numberToken.value, 10);

    return {
      name,
      type: typeToken.value,
      number: Number.isNaN(parsedNumber) ? undefined : parsedNumber,
      label,
      oneof,
      doc: firstToken.doc || typeToken.doc || this.getTrailingDoc(terminator.line),
      ...(options.length > 0 ? { options } : {}),
    };
  }

  private parseMapField(): ProtobufField {
    const keyword = this.expect('map');
    this.expect('<');
    const keyType = this.next().value;
    this.expect(',');
    const valueType = this.next().value;
    this.expect('>');
    const name = this.next().value;
    this.expect('=');
    const numberToken = this.next();
    const options = this.parseFieldOptions();
    const terminator = this.expect(';');

    const parsedNumber = Number.parseInt(numberToken.value, 10);

    return {
      name,
      type: `map<${keyType}, ${valueType}>`,
      map: { keyType, valueType },
      number: Number.isNaN(parsedNumber) ? undefined : parsedNumber,
      doc: keyword.doc || this.getTrailingDoc(terminator.line),
      ...(options.length > 0 ? { options } : {}),
    };
  }

  private parseEnum(): ProtobufEnum {
    const keyword = this.expect('enum');
    const name = this.next().value;
    const protoEnum: ProtobufEnum = { name, doc: keyword.doc, values: [] };

    this.expect('{');

    while (this.pos < this.tokens.length) {
      const token = this.peek()!;

      if (token.value === '}') {
        this.next();
        return protoEnum;
      }

      if (token.value === 'option' || token.value === 'reserved') {
        this.next();
        this.skipStatement();
        continue;
      }

      if (token.value === ';') {
        this.next();
        continue;
      }

      const valueToken = this.next();
      this.expect('=');
      const numberToken = this.next();
      this.parseFieldOptions();
      const terminator = this.expect(';');

      const parsedNumber = Number.parseInt(numberToken.value, 10);

      protoEnum.values.push({
        name: valueToken.value,
        value: Number.isNaN(parsedNumber) ? undefined : parsedNumber,
        doc: valueToken.doc || this.getTrailingDoc(terminator.line),
      });
    }

    throw new Error(`Unexpected end of enum "${name}"`);
  }
}

export function parseProtobufSchema(content: string): ProtobufSchema {
  if (!content || content.trim() === '') {
    throw new Error('Protobuf schema is empty');
  }
  return new ProtobufParser(content).parse();
}
