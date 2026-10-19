/** `order-created` is kebab-case; `OrderCreated`, `order_created` and `orderCreated` are not. */
export const isKebabCase = (value: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

export const toKebabCase = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s.]+/g, '-')
    .toLowerCase();
