/**
 * Pauses (or resumes) the SMIL animations of a canvas's edges: the message envelopes moving along them. Hiding
 * them doesn't stop them (SMIL keeps running, with a style recalc and layout every frame), so while the canvas
 * is panned, zoomed or dragged they're paused. Each edge is its own <svg>, with its own timeline.
 */
export const pauseEdgeAnimations = (canvas: Element | null, paused: boolean) =>
  canvas
    ?.querySelectorAll<SVGSVGElement>(".react-flow__edges > svg")
    .forEach((svg) =>
      paused ? svg.pauseAnimations() : svg.unpauseAnimations(),
    );
