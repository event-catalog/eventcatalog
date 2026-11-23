import * as LucideIcons from 'lucide-react';

// Server-side only: it pulls in every lucide icon, so keep it out of client scripts

const toPascalCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/** Finds a lucide-react icon by name (BookOpen, book-open, BookOpenIcon), falling back to a circle */
export const resolveLucideIcon = (icon?: string) => {
  if (!icon) return LucideIcons.Circle;

  const icons = LucideIcons as unknown as Record<string, any>;
  return (
    icons[icon] || icons[`${icon}Icon`] || icons[toPascalCase(icon)] || icons[`${toPascalCase(icon)}Icon`] || LucideIcons.Circle
  );
};
