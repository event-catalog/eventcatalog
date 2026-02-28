/**
 * Shared icon map for dynamic lucide-react icon lookups.
 *
 * Components that need to resolve icon names from data (sidebar, pill lists, etc.)
 * should import from this map instead of using `import * as LucideIcons from 'lucide-react'`.
 * Wildcard imports force Vite to parse 500+ icon modules on first load, adding seconds
 * to dev server startup time.
 *
 * If a user-specified icon name isn't in this map, it won't render.
 * Add new entries here when new icon names are introduced in sidebar builders,
 * content schemas, or other dynamic icon contexts.
 */
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  BookOpen,
  BookText,
  Box,
  Boxes,
  Code,
  Database,
  File,
  FileCheck,
  FileCode,
  FileImage,
  FileJson,
  Globe,
  Mail,
  Package,
  Search,
  Server,
  ShoppingCart,
  SquareMousePointer,
  Telescope,
  Terminal,
  Truck,
  User,
  Users,
  Waypoints,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  BookOpen,
  BookText,
  Box,
  Boxes,
  Code,
  Database,
  File,
  FileCheck,
  FileCode,
  FileImage,
  FileJson,
  Globe,
  Mail,
  Package,
  Search,
  Server,
  ShoppingCart,
  SquareMousePointer,
  Telescope,
  Terminal,
  Truck,
  User,
  Users,
  Waypoints,
  Workflow,
  Zap,
};
