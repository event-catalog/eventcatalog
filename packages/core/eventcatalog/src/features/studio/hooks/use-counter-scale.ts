import { useLayoutEffect, type RefObject } from 'react';
import { useStoreApi } from '@xyflow/react';

/** 1 / zoom, for things drawn in the canvas's coordinates that stay the same size on screen (`scale(var(...))`) */
export const COUNTER_SCALE = '--studio-counter-scale';

/**
 * Keeps COUNTER_SCALE on an element as the canvas zooms, outside React: what's counter-scaled with it (e.g. comment
 * pins) stays the same size on screen without re-rendering on every frame of a zoom
 */
export function useCounterScale(ref: RefObject<HTMLElement | null>) {
  const store = useStoreApi();
  useLayoutEffect(() => {
    const apply = (zoom: number) => ref.current?.style.setProperty(COUNTER_SCALE, String(1 / zoom));
    apply(store.getState().transform[2]);
    return store.subscribe((state, previous) => {
      if (state.transform[2] !== previous.transform[2]) apply(state.transform[2]);
    });
  }, [store, ref]);
}
