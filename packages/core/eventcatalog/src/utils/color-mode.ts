export type ColorModeDefault = 'light' | 'dark' | 'system';

export interface ColorMode {
  /** The mode a visitor sees until they choose one with the header toggle */
  default: ColorModeDefault;
  /** false: always use `default`, hide the toggle and ignore any saved choice */
  allowToggle: boolean;
}

const COLOR_MODE_DEFAULTS: readonly ColorModeDefault[] = ['light', 'dark', 'system'];

export const isColorModeDefault = (value: unknown): value is ColorModeDefault =>
  typeof value === 'string' && (COLOR_MODE_DEFAULTS as readonly string[]).includes(value);

/** The catalog's `colorMode` config, with today's behaviour (dark, with the toggle) for anything unset or invalid */
export const getColorMode = (config: { colorMode?: { default?: unknown; allowToggle?: unknown } } | undefined): ColorMode => {
  const colorMode = config?.colorMode;
  return {
    default: isColorModeDefault(colorMode?.default) ? colorMode.default : 'dark',
    allowToggle: colorMode?.allowToggle !== false,
  };
};
