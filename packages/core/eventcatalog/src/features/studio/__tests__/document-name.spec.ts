import { describe, it, expect } from 'vitest';
import { canvasDocumentName, canvasIdFromDocumentName } from '../document-name';

describe('document names', () => {
  it('round trips a canvas id through its document name', () => {
    expect(canvasDocumentName('abc')).toBe('design:abc');
    expect(canvasIdFromDocumentName('design:abc')).toBe('abc');
    expect(canvasIdFromDocumentName('other:abc')).toBeUndefined();
  });
});
