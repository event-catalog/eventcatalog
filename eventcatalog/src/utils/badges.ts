import * as HeroIcons from '@heroicons/react/24/outline';

export function getIcon(iconName: string) {
  return HeroIcons[iconName as keyof typeof HeroIcons] || null;
}
