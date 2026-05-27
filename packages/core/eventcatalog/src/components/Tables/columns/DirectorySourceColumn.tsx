import { FileText, Github } from 'lucide-react';

type DirectorySource = {
  provider: string;
  url?: string;
};

export const DirectorySourceCell = ({ source }: { source?: DirectorySource }) => {
  if (source?.provider === 'github') {
    const icon = (
      <Github className="h-4 w-4 text-[rgb(var(--ec-icon-color))] transition-colors group-hover/source:text-[rgb(var(--ec-page-text))]" />
    );

    if (source.url) {
      return (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="group/source inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.35)] transition-colors hover:bg-[rgb(var(--ec-content-hover))]"
          title="Synced from GitHub"
          aria-label="Synced from GitHub"
        >
          {icon}
        </a>
      );
    }

    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-page-bg)/0.35)]"
        title="Synced from GitHub"
        aria-label="Synced from GitHub"
      >
        {icon}
      </span>
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
