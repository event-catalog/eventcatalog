import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as HeroIcons from '@heroicons/react/24/outline';
import * as ProtocolIcons from '@icons/protocols';

// const allIcons = [...HeroIcons, ...ProtocolIcons];

const protocolIcons = Object.keys(ProtocolIcons).reduce(
  (icons, key) => {
    const iconKey = key as keyof typeof ProtocolIcons;
    icons[key.toLowerCase()] = ProtocolIcons[iconKey];
    return icons;
  },
  {} as { [key: string]: string }
);

const getIconForProtocol = (icon: keyof typeof protocolIcons) => {
  const Icon = protocolIcons[icon];
  return Icon ? (props: any) => <span {...props} dangerouslySetInnerHTML={{ __html: Icon }} /> : null;
};

export function getIcon(iconName: string) {
  return getIconForProtocol(iconName as keyof typeof protocolIcons) || HeroIcons[iconName as keyof typeof HeroIcons] || null;
}

/**
 * A badge's icon (a Heroicon's name, or a protocol's) as SVG markup, for tables drawn in the browser: rendered here,
 * on the server, so the browser gets only the icons in use rather than every icon `getIcon` can look up
 */
export function getIconSvg(iconName: string): string | undefined {
  const Icon = getIcon(iconName);
  return Icon ? renderToStaticMarkup(createElement(Icon as any, { 'aria-hidden': true })) : undefined;
}
