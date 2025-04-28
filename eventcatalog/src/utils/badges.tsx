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
