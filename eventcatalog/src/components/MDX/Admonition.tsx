import { InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const getConfigurationByType = (type: string) => {
  switch (type) {
    case 'danger':
      return { color: 'red', icon: ExclamationTriangleIcon, title: 'Danger' };
    case 'alert':
      return { color: 'red', icon: ExclamationTriangleIcon, title: 'Alert' };
    case 'warning':
      return { color: 'yellow', icon: ExclamationTriangleIcon, title: 'Warning' };
    default:
      return { color: 'indigo', icon: InformationCircleIcon, title: 'Info' };
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
    <div className={`bg-${config.color}-50 border-l-4 border-${config.color}-500 p-4 my-4 ${className} rounded-md not-prose`}>
      <div className="flex flex-col">
        <div className="flex items-center justify-start">
          <Icon className={`h-6 w-6 text-${config.color}-500 stroke-2`} aria-hidden="true" />
          <h3 className={`ml-2 text-${config.color}-600 font-bold text-md`}>{title || config.title}</h3>
        </div>
        <div className={`mt-2 text-${config.color}-700 text-md`}>{children}</div>
      </div>
    </div>
  );
}
