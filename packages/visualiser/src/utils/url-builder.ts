/**
 * Simple URL builder utility
 * In the visualizer, this is a fallback - consumers should use callbacks instead
 */

export function buildUrl(path: string): string {
  // For visualizer, just return the path as-is
  // The consuming application should handle URL building via callbacks
  return path;
}
