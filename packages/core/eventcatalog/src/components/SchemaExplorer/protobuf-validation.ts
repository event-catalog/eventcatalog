import type { ProtobufField, ProtobufOptionValue } from '@utils/protobuf-schema';

const PROTOVALIDATE_FIELD_OPTION = '(buf.validate.field)';

export interface ProtovalidateRule {
  path: string;
  value: ProtobufOptionValue;
}

export interface ProtovalidateRuleDisplay {
  label: string;
  value?: string;
}

export interface ProtobufCustomAnnotation {
  name: string;
  value: ProtobufOptionValue;
}

const isOptionObject = (value: ProtobufOptionValue): value is { [key: string]: ProtobufOptionValue } =>
  typeof value === 'object' && !Array.isArray(value);

const flattenOptionValue = (path: string, value: ProtobufOptionValue): ProtovalidateRule[] => {
  if (!isOptionObject(value)) return [{ path, value }];

  return Object.entries(value).flatMap(([name, nestedValue]) => flattenOptionValue(path ? `${path}.${name}` : name, nestedValue));
};

export const getProtovalidateRules = (field: ProtobufField): ProtovalidateRule[] =>
  (field.options ?? []).flatMap((option) => {
    if (option.name !== PROTOVALIDATE_FIELD_OPTION && !option.name.startsWith(`${PROTOVALIDATE_FIELD_OPTION}.`)) return [];

    const path = option.name.slice(PROTOVALIDATE_FIELD_OPTION.length).replace(/^\./, '');
    return flattenOptionValue(path, option.value);
  });

export const isProtovalidateRequired = (field: ProtobufField) =>
  getProtovalidateRules(field).some((rule) => rule.path === 'required' && rule.value === true);

export const getCustomFieldAnnotations = (field: ProtobufField): ProtobufCustomAnnotation[] =>
  (field.options ?? [])
    .filter(
      (option) =>
        option.name.startsWith('(') &&
        option.name !== PROTOVALIDATE_FIELD_OPTION &&
        !option.name.startsWith(`${PROTOVALIDATE_FIELD_OPTION}.`)
    )
    .map(({ name, value }) => ({ name, value }));

export const formatProtobufOptionValue = (value: ProtobufOptionValue): string => {
  if (Array.isArray(value)) return value.map(formatProtobufOptionValue).join(', ');
  if (isOptionObject(value)) return JSON.stringify(value);
  return String(value);
};

const humanize = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());

const FORMAT_NAMES: Record<string, string> = {
  address: 'Address',
  email: 'Email',
  hostname: 'Hostname',
  ip: 'IP',
  ipv4: 'IPv4',
  ipv6: 'IPv6',
  protobuf_fqn: 'Protobuf FQN',
  tuuid: 'TUUID',
  uri: 'URI',
  uri_ref: 'URI reference',
  uuid: 'UUID',
};

const getRuleScope = (path: string) => {
  if (path.includes('repeated.items')) return 'Item';
  if (path.includes('map.keys')) return 'Key';
  if (path.includes('map.values')) return 'Value';
  return '';
};

const withScope = (scope: string, label: string) =>
  scope ? `${scope} ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;

export const formatProtovalidateRule = ({ path, value }: ProtovalidateRule): ProtovalidateRuleDisplay => {
  const name = path.split('.').pop() ?? path;
  const scope = getRuleScope(path);
  const formattedValue = formatProtobufOptionValue(value);

  switch (name) {
    case 'required':
      return value === true ? { label: 'Required' } : { label: 'Required', value: formattedValue };
    case 'const':
      return { label: withScope(scope, 'Constant'), value: formattedValue };
    case 'len':
      return { label: withScope(scope, 'Length'), value: formattedValue };
    case 'min_len':
      return { label: withScope(scope, 'Minimum length'), value: formattedValue };
    case 'max_len':
      return { label: withScope(scope, 'Maximum length'), value: formattedValue };
    case 'len_bytes':
      return { label: withScope(scope, 'Byte length'), value: formattedValue };
    case 'min_bytes':
      return { label: withScope(scope, 'Minimum byte length'), value: formattedValue };
    case 'max_bytes':
      return { label: withScope(scope, 'Maximum byte length'), value: formattedValue };
    case 'pattern':
      return { label: withScope(scope, 'Match pattern'), value: formattedValue };
    case 'gt':
      return { label: withScope(scope, 'Greater than'), value: formattedValue };
    case 'gte':
      return { label: withScope(scope, 'Minimum'), value: formattedValue };
    case 'lt':
      return { label: withScope(scope, 'Less than'), value: formattedValue };
    case 'lte':
      return { label: withScope(scope, 'Maximum'), value: formattedValue };
    case 'in':
      return { label: withScope(scope, 'Allowed values'), value: formattedValue };
    case 'not_in':
      return { label: withScope(scope, 'Excluded values'), value: formattedValue };
    case 'defined_only':
      return value === true
        ? { label: 'Defined enum values only' }
        : { label: 'Defined enum values only', value: formattedValue };
    case 'min_items':
      return { label: 'Minimum items', value: formattedValue };
    case 'max_items':
      return { label: 'Maximum items', value: formattedValue };
    case 'unique':
      return value === true ? { label: 'Unique items' } : { label: 'Unique items', value: formattedValue };
    case 'min_pairs':
      return { label: 'Minimum map entries', value: formattedValue };
    case 'max_pairs':
      return { label: 'Maximum map entries', value: formattedValue };
    case 'email':
    case 'hostname':
    case 'ip':
    case 'ipv4':
    case 'ipv6':
    case 'uri':
    case 'uri_ref':
    case 'address':
    case 'uuid':
    case 'tuuid':
    case 'protobuf_fqn':
      return value === true
        ? { label: withScope(scope, 'Format'), value: FORMAT_NAMES[name] }
        : { label: withScope(scope, humanize(name)), value: formattedValue };
    default:
      return { label: withScope(scope, humanize(name)), value: formattedValue };
  }
};
