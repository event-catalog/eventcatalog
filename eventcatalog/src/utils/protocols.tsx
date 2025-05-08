import * as ProtocolIcons from '@icons/protocols';

const protocolIcons = Object.keys(ProtocolIcons).reduce(
  (icons, key) => {
    const iconKey = key as keyof typeof ProtocolIcons;
    icons[key.toLowerCase()] = ProtocolIcons[iconKey];
    return icons;
  },
  {} as { [key: string]: string }
);

export const getIconForProtocol = (icon: string) => {
  const Icon = protocolIcons[icon?.replace('-', '').toLowerCase()];
  return Icon ? (props: any) => <span {...props} dangerouslySetInnerHTML={{ __html: Icon }} /> : null;
};
