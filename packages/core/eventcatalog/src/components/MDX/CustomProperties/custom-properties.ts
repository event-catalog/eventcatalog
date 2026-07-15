export type CustomProperty = {
  name: string;
  label: string;
  value: unknown;
};

export const isCustomPropertyName = (name: string) => name.startsWith('x-') && name.length > 2;

export const formatCustomPropertyLabel = (name: string) => {
  const propertyName = isCustomPropertyName(name) ? name.slice(2) : name;

  return propertyName
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

export const getCustomProperties = (data?: Record<string, unknown>): CustomProperty[] => {
  if (!data) return [];

  return Object.entries(data)
    .filter(([name]) => isCustomPropertyName(name))
    .map(([name, value]) => ({
      name,
      label: formatCustomPropertyLabel(name),
      value,
    }));
};

export const getCustomProperty = (data: Record<string, unknown> | undefined, name: string): CustomProperty | undefined => {
  if (!data || !isCustomPropertyName(name) || !Object.prototype.hasOwnProperty.call(data, name)) return undefined;

  return {
    name,
    label: formatCustomPropertyLabel(name),
    value: data[name],
  };
};
