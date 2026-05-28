import { FileText, Github } from 'lucide-react';
import { buildUrl } from '@utils/url-builder';
import type { ReactNode } from 'react';

type DirectorySource = {
  provider: string;
  id?: string;
  url?: string;
};

const sourceLabels: Record<string, string> = {
  github: 'GitHub',
  'microsoft-entra': 'Microsoft Entra ID',
};

const getSourceLabel = (source: DirectorySource) => sourceLabels[source.provider] ?? source.provider;

const SourceBadge = ({ source, icon }: { source: DirectorySource; icon: ReactNode }) => {
  const label = getSourceLabel(source);
  const title = `Synced from ${label}`;

  if (source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="group/source inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.35)] transition-colors hover:bg-[rgb(var(--ec-content-hover))]"
        title={title}
        aria-label={title}
      >
        {icon}
      </a>
    );
  }

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.35)]"
      title={title}
      aria-label={title}
    >
      {icon}
    </span>
  );
};

export const DirectorySourceCell = ({ source }: { source?: DirectorySource }) => {
  if (source?.provider === 'github') {
    return (
      <SourceBadge
        source={source}
        icon={
          <Github className="h-4 w-4 text-[rgb(var(--ec-icon-color))] transition-colors group-hover/source:text-[rgb(var(--ec-page-text))]" />
        }
      />
    );
  }

  if (source?.provider === 'microsoft-entra') {
    return <SourceBadge source={source} icon={<img src={buildUrl('/icons/azure.svg', true)} alt="" className="h-4 w-4" />} />;
  }

  if (source) {
    return (
      <SourceBadge
        source={source}
        icon={
          <FileText className="h-4 w-4 text-[rgb(var(--ec-icon-color))] transition-colors group-hover/source:text-[rgb(var(--ec-page-text))]" />
        }
      />
    );
  }

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.35)] text-[rgb(var(--ec-icon-color))]"
      title="Synced to local file"
      aria-label="Synced to local file"
    >
      <FileText className="h-4 w-4" />
    </span>
  );
};
