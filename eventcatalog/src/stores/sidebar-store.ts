import { atom } from 'nanostores';
import type { NavigationData } from '../components/SideNav/NestedSideBar/sidebar-builder';

export const sidebarStore = atom<NavigationData | null>(null);

export const setSidebarData = (data: NavigationData) => {
  sidebarStore.set(data);
};
