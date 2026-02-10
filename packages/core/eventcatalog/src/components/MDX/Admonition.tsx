import { InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type AdmonitionType = 'danger' | 'alert' | 'warning' | 'info' | 'note';

interface AdmonitionConfig {
  icon: typeof InformationCircleIcon;
  title: string;
  containerClasses: string;
  iconClasses: string;
  titleClasses: string;
  contentClasses: string;
}

const getConfigurationByType = (type: string): AdmonitionConfig => {
  switch (type) {
    case 'danger':
    case 'alert':
      return {
        icon: ExclamationTriangleIcon,
        title: type === 'danger' ? 'Danger' : 'Alert',
        containerClasses: 'bg-red-50 dark:bg-red-950/50 border-red-500',
        iconClasses: 'text-red-500 dark:text-red-400',
        titleClasses: 'text-red-600 dark:text-red-300',
        contentClasses: 'text-red-700 dark:text-red-200',
      };
    case 'warning':
      return {
        icon: ExclamationTriangleIcon,
        title: 'Warning',
        containerClasses: 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-500',
        iconClasses: 'text-yellow-500 dark:text-yellow-400',
        titleClasses: 'text-yellow-600 dark:text-yellow-300',
        contentClasses: 'text-yellow-700 dark:text-yellow-200',
      };
    case 'note':
      return {
        icon: InformationCircleIcon,
        title: 'Note',
        containerClasses: 'bg-blue-50 dark:bg-blue-950/50 border-blue-500',
        iconClasses: 'text-blue-500 dark:text-blue-400',
        titleClasses: 'text-blue-600 dark:text-blue-300',
        contentClasses: 'text-blue-700 dark:text-blue-200',
      };
    default:
      return {
        icon: InformationCircleIcon,
        title: 'Info',
        containerClasses: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500',
        iconClasses: 'text-indigo-500 dark:text-indigo-400',
        titleClasses: 'text-indigo-600 dark:text-indigo-300',
        contentClasses: 'text-indigo-700 dark:text-indigo-200',
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
  const Icon = config.icon;

  return (
    <div className={`${config.containerClasses} border-l-4 p-4 my-4 ${className} rounded-md not-prose`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-start">
          <Icon className={`h-6 w-6 ${config.iconClasses} stroke-2`} aria-hidden="true" />
          <h3 className={`ml-2 ${config.titleClasses} font-bold text-md`}>{title || config.title}</h3>
        </div>
        <div className={`mt-2 ${config.contentClasses} text-md`}>{children}</div>
      </div>
    </div>
  );
}
