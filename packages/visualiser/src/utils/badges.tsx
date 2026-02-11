import * as HeroIcons from "@heroicons/react/24/outline";
import { getIconForProtocol } from "./protocols";

export function getIcon(iconName: string): React.ComponentType<any> | null {
  // Try protocol icons first
  const protocolIcon = getIconForProtocol(iconName);
  if (protocolIcon) return protocolIcon;

  // Fall back to HeroIcons
  const heroIcon = HeroIcons[iconName as keyof typeof HeroIcons];
  return heroIcon || null;
}
