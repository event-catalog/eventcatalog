import { memo, type ComponentType } from "react";

// React Flow gives every custom node its position, which changes on every frame
// while a layout animates (e.g. switching levels). It moves nodes with its
// wrapper's transform, so no node renders differently for its position.
const POSITION_PROPS = new Set(["positionAbsoluteX", "positionAbsoluteY"]);

const equalExceptPosition = <P extends object>(
  previous: Readonly<P>,
  next: Readonly<P>,
) => {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    if (POSITION_PROPS.has(key)) continue;
    if (
      !Object.is(
        (previous as Record<string, unknown>)[key],
        (next as Record<string, unknown>)[key],
      )
    )
      return false;
  }
  return true;
};

/** Memoizes a custom node so it renders again only when something besides its position changes. */
export const memoNode = <P extends object>(Component: ComponentType<P>) =>
  memo(Component, equalExceptPosition);
