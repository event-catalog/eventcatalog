declare module 'picomatch' {
  export interface Options {
    [key: string]: unknown;
  }

  interface Picomatch {
    (globs: string | string[], options?: Options): (input: string) => boolean;
    isMatch(input: string | string[], glob: string | string[], options?: Options): boolean;
  }

  const picomatch: Picomatch;
  export default picomatch;
}
