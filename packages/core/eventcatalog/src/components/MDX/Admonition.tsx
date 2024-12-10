import { ExclamationTriangleIcon } from '@heroicons/react/20/solid';
import { InformationCircleIcon } from '@heroicons/react/24/solid';

const getConfigurationByType = (type: string) => {
  switch (type) {
    case 'alert':
      return { color: 'red', icon: ExclamationTriangleIcon };
    case 'warning':
      return { color: 'yellow', icon: ExclamationTriangleIcon };
    default:
      return { color: 'indigo', icon: InformationCircleIcon };
  }
};

interface AdmonitionProps {
  children: JSX.Element;
  type?: string;
  className?: string;
}

export default function Admonition({ children, type = 'info', className = '' }: AdmonitionProps) {
  const { color, icon: Icon } = getConfigurationByType(type);

  return (
    <div className={`bg-${color}-50 border-l-4 border-${color}-400 my-4 ${className}`}>
      <div className="flex">
        <div className="ml-3 py-2 text-sm flex items-center">
          <Icon className={`block mr-2 h-7 w-7 text-${color}-400`} aria-hidden="true" />
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
