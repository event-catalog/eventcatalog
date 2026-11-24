import { describe, expect, it } from 'vitest';
import { getIconSvg } from '@utils/badges';

describe('getIconSvg', () => {
  it('renders a Heroicon badge icon as SVG markup, for the discover table to draw', () => {
    const svg = getIconSvg('BoltIcon');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('stroke="currentColor"');
  });

  it('renders a protocol badge icon too', () => {
    expect(getIconSvg('amqp')).toContain('<svg');
  });

  it('gives nothing for an icon it does not know', () => {
    expect(getIconSvg('NotAnIcon')).toBeUndefined();
  });
});
