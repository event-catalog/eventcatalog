export const TEMPLATE_DIRECTORIES = [
  'default',
  'empty',
  'asyncapi',
  'openapi',
  'confluent',
  'eventbridge',
  'amazon-api-gateway',
  'graphql',
] as const;

export type CatalogTemplateDirectory = (typeof TEMPLATE_DIRECTORIES)[number];

/**
 * Documented `--template` names that copy a different folder on disk.
 * `amazon-apigateway` is the name used in EventCatalog docs.
 */
export const TEMPLATE_ALIASES: Record<string, CatalogTemplateDirectory> = {
  'amazon-apigateway': 'amazon-api-gateway',
};

export const formatValidTemplates = (): string => {
  const aliases = Object.keys(TEMPLATE_ALIASES);
  return [
    ...TEMPLATE_DIRECTORIES,
    ...aliases.filter((alias) => !(TEMPLATE_DIRECTORIES as readonly string[]).includes(alias)),
  ].join(', ');
};

export const resolveTemplateDirectory = (name: string): CatalogTemplateDirectory | null => {
  const trimmed = name.trim();
  if ((TEMPLATE_DIRECTORIES as readonly string[]).includes(trimmed)) {
    return trimmed as CatalogTemplateDirectory;
  }
  return TEMPLATE_ALIASES[trimmed] ?? null;
};

export const isValidTemplate = (name: string): boolean => resolveTemplateDirectory(name) !== null;

/**
 * Resolve whether EventCatalog Skills should be installed.
 * Commander 2 maps `--no-skills` onto the same `skills` property as `--skills`,
 * so we read argv instead of Commander option values.
 * Returns `'prompt'` when the user did not pass --skills or --no-skills.
 */
export const resolveInstallSkills = (argv: string[] = process.argv): boolean | 'prompt' => {
  const hasNoSkills = argv.includes('--no-skills');
  const hasSkills = argv.includes('--skills');
  if (hasNoSkills) {
    return false;
  }
  if (hasSkills) {
    return true;
  }
  return 'prompt';
};
