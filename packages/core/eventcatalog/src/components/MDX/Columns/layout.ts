export function getColumnsLayout(cols: number = 2, ratio?: string) {
  const count = Number.isInteger(cols) && cols >= 1 && cols <= 4 ? cols : 2;
  const weights = ratio?.split(':').map(Number);
  const validRatio = weights?.length === count && weights.every((weight) => Number.isFinite(weight) && weight > 0);
  return {
    count,
    template: validRatio ? weights.map((weight) => `minmax(0, ${weight}fr)`).join(' ') : `repeat(${count}, minmax(0, 1fr))`,
  };
}

export const columnsClass = 'ec-columns @container/ec-columns my-6';
export const gridClass =
  'ec-columns-grid grid grid-cols-1 items-start gap-8 [&>*]:min-w-0 @min-[640px]/ec-columns:grid-cols-[var(--ec-columns-template)]';
export const columnClass = 'ec-column min-w-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0';
export const stickyClass =
  '@min-[640px]/ec-columns:sticky @min-[640px]/ec-columns:top-[var(--ec-column-sticky-top,5rem)] print:static';
