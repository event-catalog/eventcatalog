type AdmonitionType = 'danger' | 'alert' | 'warning' | 'info' | 'note' | 'tip';

interface AdmonitionConfig {
  iconPath: string;
  title: string;
  containerClasses: string;
  accentClasses: string;
}

const getConfigurationByType = (type: string): AdmonitionConfig => {
  switch (type) {
    case 'danger':
    case 'alert':
      return {
        iconPath: 'M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z M12 8v4 M12 16h.01',
        title: type === 'danger' ? 'Danger' : 'Alert',
        containerClasses: 'bg-red-50/60 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/60',
        accentClasses: 'text-red-700 dark:text-red-300',
      };
    case 'warning':
      return {
        iconPath: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4 M12 17h.01',
        title: 'Warning',
        containerClasses: 'bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60',
        accentClasses: 'text-amber-700 dark:text-amber-300',
      };
    case 'note':
      return {
        iconPath: 'M12 20h9 M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
        title: 'Note',
        containerClasses: 'bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60',
        accentClasses: 'text-slate-600 dark:text-slate-300',
      };
    case 'tip':
      return {
        iconPath: 'M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z',
        title: 'Tip',
        containerClasses: 'bg-emerald-50/60 dark:bg-emerald-900/40 border border-emerald-200/70 dark:border-emerald-700/80',
        accentClasses: 'text-emerald-700 dark:text-emerald-300',
      };
    default:
      return {
        iconPath: 'M12 2a10 10 0 100 20 10 10 0 000-20zM12 8h.01M11 12h1v4h1',
        title: 'Info',
        containerClasses: 'bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/60',
        accentClasses: 'text-blue-700 dark:text-blue-300',
      };
  }
};

interface AdmonitionProps {
  children: React.ReactNode;
  type?: string;
  className?: string;
  title?: string;
}

export default function Admonition({ children, type = 'info', className = '', title }: AdmonitionProps) {
  const config = getConfigurationByType(type);

  return (
    <div
      className={`ec-admonition ${config.containerClasses} rounded-md px-3 py-2.5 my-4 text-[0.85rem] leading-relaxed not-prose ${className}`}
    >
      <div className={`flex items-center gap-1.5 mb-1 ${config.accentClasses}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide shrink-0"
          aria-hidden="true"
        >
          <path d={config.iconPath} />
        </svg>
        <span className="text-[0.7rem] font-semibold uppercase tracking-wider">{title || config.title}</span>
      </div>
      <div className="prose prose-sm dark:prose-invert w-full max-w-none! prose-p:my-0.5 prose-p:text-inherit prose-p:text-[0.85rem] prose-p:leading-relaxed prose-code:text-[0.8rem]">
        {children}
      </div>
    </div>
  );
}
