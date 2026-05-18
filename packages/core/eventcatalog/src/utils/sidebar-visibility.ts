export type SidebarVisibilityConfig = {
  id: string;
  visible: boolean;
};

export type SidebarConfigurableItem = {
  id: string;
  aliases?: string[];
  visible?: boolean;
};

const getVisibilityOption = <T extends SidebarConfigurableItem>(
  item: T,
  configuration: SidebarVisibilityConfig[]
): SidebarVisibilityConfig | undefined => {
  const exactMatch = configuration.find((option) => option.id === item.id);

  if (exactMatch) {
    return exactMatch;
  }

  return configuration.find((option) => item.aliases?.includes(option.id));
};

export const isSidebarItemVisible = <T extends SidebarConfigurableItem>(
  item: T,
  configuration: SidebarVisibilityConfig[] = []
): boolean => {
  const visibilityOption = getVisibilityOption(item, configuration);

  if (visibilityOption) {
    return visibilityOption.visible;
  }

  return item.visible ?? true;
};

export const filterSidebarItems = <T extends SidebarConfigurableItem>(
  items: T[],
  configuration: SidebarVisibilityConfig[] = []
): T[] => items.filter((item) => isSidebarItemVisible(item, configuration));
