import { memo } from "react";
import { buildUrl } from "./url-builder";

export function isIconPath(value: string | undefined): value is string {
  if (!value) return false;
  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

export function resolveIconUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return buildUrl(value).replace(/\/$/, "");
}

export const CustomIcon = memo(function CustomIcon({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={resolveIconUrl(src)}
      alt={alt}
      loading="lazy"
      className={className}
      style={{ objectFit: "contain", borderRadius: 4 }}
    />
  );
});
