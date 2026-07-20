import { buildUrl } from '@utils/url-builder';

export default function McpIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 ${className}`} aria-hidden="true">
      <img src={buildUrl('/icons/protocols/mcp-light.svg', true)} alt="" className="h-full w-full object-contain dark:hidden" />
      <img
        src={buildUrl('/icons/protocols/mcp-dark.svg', true)}
        alt=""
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}
